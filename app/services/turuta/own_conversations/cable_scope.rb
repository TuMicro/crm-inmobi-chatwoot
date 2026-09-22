# [turuta] Ver Turuta::OwnConversations. Los avisos en vivo.
#
# Chatwoot manda cada evento de un chat (mensajes incluidos) a TODOS los
# miembros de la bandeja. Esconderlo en la interfaz no bastaria: el contenido
# llegaria igual al navegador de cada agente. Aqui se recorta a quien se le
# manda: los administradores siempre; de los agentes, el que lo tiene asignado, o
# todos si esta sin asignar.
#
# Cuando el chat cambia de manos, el aviso va TAMBIEN al agente que lo tenia:
# es lo que le quita el chat de la pantalla.
#
# Todos los eventos calculan sus destinatarios con user_tokens(account, agents),
# que no sabe de que chat se trata. Por eso cada evento deja el suyo anotado en
# el hilo antes de seguir. En el hilo y no en la instancia: el listener es un
# singleton compartido entre hilos.
module Turuta::OwnConversations::CableScope
  THREAD_KEY = :turuta_cable_scope

  EVENTS = %i[
    message_created message_updated first_reply_created conversation_created conversation_read
    conversation_status_changed conversation_updated conversation_unread_count_changed
    conversation_typing_on conversation_typing_off assignee_changed team_changed
    conversation_contact_changed
  ].freeze

  EVENTS.each do |name|
    define_method(name) do |event|
      previous = Thread.current[THREAD_KEY]
      Thread.current[THREAD_KEY] = turuta_cable_scope(event)
      begin
        super(event)
      ensure
        Thread.current[THREAD_KEY] = previous
      end
    end
  end

  private

  def user_tokens(account, agents)
    scope = Thread.current[THREAD_KEY]
    return super if scope.nil? || Turuta::OwnConversations.disabled?
    return super unless agents.respond_to?(:where)

    # Lo recibe quien podia verlo ANTES o puede verlo DESPUES del cambio. Sin
    # asignar lo ven todos los miembros: si lo esta ahora, o lo estaba hasta este
    # evento (asi desaparece de la pestana "Sin asignar" de los demas), van todos.
    # Lo atiende la IA (el bot es el asignado): solo los administradores. Los
    # agentes no lo ven en su lista, asi que tampoco deben recibir su contenido.
    return super(account, agents.none) if scope[:assignee_id].nil? && scope[:bot] && !scope[:was_unassigned]

    return super if scope[:assignee_id].nil? || scope[:was_unassigned]

    ids = [scope[:assignee_id], scope[:previous_assignee_id]].compact.uniq
    super(account, agents.where(id: ids))
  end

  def turuta_cable_scope(event)
    data = event.data
    conversation = data[:conversation] || data[:message]&.conversation
    return nil if conversation.nil?

    changes = data[:changed_attributes]
    change = changes.is_a?(Hash) ? (changes['assignee_id'] || changes[:assignee_id]) : nil
    previous = change.is_a?(Array) ? change.first : nil
    {
      assignee_id: conversation.assignee_id,
      bot: conversation.assignee_agent_bot_id.present?,
      previous_assignee_id: previous,
      was_unassigned: change.is_a?(Array) && previous.nil?
    }
  end
end
