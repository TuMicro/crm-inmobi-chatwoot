# [turuta] Importa un chat exportado de WhatsApp ("Exportar chat" en el
# celular) a una bandeja de WhatsApp: el historial de antes de conectar el
# numero al CRM (docs/25 en crm-inmobi). Lo llama la pagina Ajustes ->
# "Importar un chat" (ImportarChatPage.vue), que ya trae el fichero leido.
#
# Los mensajes se insertan con su fecha original y SIN callbacks: un
# Message.create! saliente en una bandeja de WhatsApp lo ENVIARIA al cliente
# (SendReplyJob), y dispararia webhooks, automatizaciones y avisos. insert_all
# no hace nada de eso. La conversacion nace resuelta: es historia, no trabajo
# pendiente. Si el cliente vuelve a escribir, Chatwoot abre otra y esta queda
# en sus chats anteriores.
#
# Idempotente por huella (el SHA-256 del fichero): importar dos veces el mismo
# chat devuelve la conversacion de la primera vez, con duplicado: true, para
# que la pagina pueda repetir el paso del lead sin duplicar mensajes.
module Turuta
  class ImportarChat
    class Error < StandardError; end

    LOTE = 1000
    MAXIMO = 50_000

    def initialize(account:, params:)
      @account = account
      @p = params
    end

    def perform
      inbox = bandeja
      telefono = telefono_valido
      filas = mensajes
      asesor = asesor_elegido

      ActiveRecord::Base.transaction do
        contact_inbox, contacto = contacto_en(inbox, telefono)
        previa = ya_importada(contact_inbox)
        if previa
          resultado(previa, contacto, 0, duplicado: true)
        else
          conversacion = crear_conversacion(inbox, contacto, contact_inbox)
          insertar(filas, inbox, conversacion, contacto, asesor)
          cerrar(conversacion, contacto, filas, asesor)
          resultado(conversacion, contacto, filas.size, duplicado: false)
        end
      end
    end

    private

    def bandeja
      inbox = @account.inboxes.find_by(id: @p['inbox_id'])
      raise Error, 'Esa bandeja no existe en esta cuenta' unless inbox
      raise Error, 'Solo se importa a bandejas de WhatsApp' unless inbox.channel_type == 'Channel::Whatsapp'

      inbox
    end

    def telefono_valido
      telefono = @p['telefono'].to_s
      raise Error, 'El telefono tiene que ir con el codigo de pais: +51...' unless telefono.match?(/\A\+[1-9]\d{7,14}\z/)

      telefono
    end

    def asesor_elegido
      return nil if @p['assignee_id'].blank?

      asesor = @account.users.find_by(id: @p['assignee_id'])
      raise Error, 'Ese asesor no es de esta cuenta' unless asesor

      asesor
    end

    # Ordenados por fecha y, en el mismo minuto, en el orden del fichero: la
    # exportacion de Android no trae segundos, y el orden de la conversacion
    # sale de los ids, que insert_all asigna en el orden en que van.
    def mensajes
      zona = ActiveSupport::TimeZone[@p['zona'].presence || 'America/Lima']
      raise Error, 'Zona horaria desconocida' unless zona

      lista = Array(@p['mensajes'])
      raise Error, 'El chat no tiene mensajes' if lista.empty?
      raise Error, "Demasiados mensajes (#{lista.size}): el maximo es #{MAXIMO}" if lista.size > MAXIMO

      filas = lista.each_with_index.map do |m, i|
        fecha = zona.parse(m['fecha'].to_s)
        raise Error, "El mensaje #{i + 1} no tiene una fecha valida" unless fecha

        [fecha, ActiveModel::Type::Boolean.new.cast(m['entrante']) == true, m['texto'].to_s, i]
      end
      filas.sort_by { |f| [f[0], f[3]] }.map { |f| f[0..2] }
    rescue ArgumentError
      raise Error, 'Hay mensajes con una fecha que no se entiende'
    end

    # El contacto de ese numero en esa bandeja, o el de la cuenta con ese
    # telefono, o uno nuevo. El source_id de WhatsApp es el numero sin "+": es
    # el mismo con el que Chatwoot lo encontrara cuando el cliente escriba.
    def contacto_en(inbox, telefono)
      source_id = telefono.delete('+')
      contact_inbox = inbox.contact_inboxes.find_by(source_id: source_id)
      contacto = contact_inbox&.contact ||
                 @account.contacts.find_by(phone_number: telefono) ||
                 @account.contacts.create!(name: @p['nombre'].presence || telefono, phone_number: telefono)
      contact_inbox ||= ContactInbox.create!(contact: contacto, inbox: inbox, source_id: source_id)
      [contact_inbox, contacto]
    end

    def huella
      @p['huella'].to_s.presence
    end

    def ya_importada(contact_inbox)
      return nil unless huella

      contact_inbox.conversations.where("additional_attributes->>'turuta_importacion' = ?", huella).first
    end

    def crear_conversacion(inbox, contacto, contact_inbox)
      Conversation.create!(
        account: @account, inbox: inbox, contact: contacto, contact_inbox: contact_inbox,
        status: :resolved,
        additional_attributes: { 'turuta_importacion' => huella, 'turuta_importado' => true }
      )
    end

    def insertar(filas, inbox, conversacion, contacto, asesor)
      filas.each_slice(LOTE) do |lote|
        Message.insert_all!(lote.map { |fila| fila_de(fila, inbox, conversacion, contacto, asesor) })
      end
    end

    # Enteros y no los nombres de los enum: incoming 0 / outgoing 1, text 0,
    # sent 0 (message.rb). Lo de la inmobiliaria sale firmado por el asesor
    # elegido, que es quien lo atendia en su celular.
    #
    # source_id propio: en una bandeja de WhatsApp, Chatwoot solo enseña el
    # visto de "enviado" si el mensaje tiene el id que da Meta, y sin el los
    # importados salian con el reloj de "enviandose" (MessageMeta.vue). El
    # prefijo no choca con los de Meta (wamid...).
    def fila_de((fecha, entrante, texto), inbox, conversacion, contacto, asesor)
      {
        account_id: @account.id, inbox_id: inbox.id, conversation_id: conversacion.id,
        message_type: entrante ? 0 : 1, content_type: 0, status: 0, private: false,
        content: texto, source_id: "turuta-importado:#{SecureRandom.uuid}",
        sender_type: entrante ? 'Contact' : asesor && 'User',
        sender_id: entrante ? contacto.id : asesor&.id,
        created_at: fecha, updated_at: fecha
      }
    end

    # update_columns y no update!: asignar con update! avisaria al asesor de
    # cada chat importado, y moveria la conversacion al principio de la lista.
    def cerrar(conversacion, contacto, filas, asesor)
      ultima = filas.last[0]
      conversacion.update_columns(
        assignee_id: asesor&.id, created_at: filas.first[0], last_activity_at: ultima,
        waiting_since: nil, updated_at: Time.current
      )
      return unless contacto.last_activity_at.nil? || contacto.last_activity_at < ultima

      contacto.update_columns(last_activity_at: ultima)
    end

    # ultima_entrada: el ultimo mensaje del cliente, para el lastInboundAt del
    # lead en el CRM (la ventana de 24 h de WhatsApp se cuenta desde ahi).
    def resultado(conversacion, contacto, cuantos, duplicado:)
      ultima = conversacion.messages.where(message_type: 0).maximum(:created_at)
      {
        conversation_id: conversacion.id, display_id: conversacion.reload.display_id,
        contact_id: contacto.id, mensajes: cuantos, duplicado: duplicado,
        ultima_entrada: ultima&.iso8601
      }
    end
  end
end
