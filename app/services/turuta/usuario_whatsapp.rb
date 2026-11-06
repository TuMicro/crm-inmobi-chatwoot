# [turuta] Clientes que escriben con usuario de WhatsApp y sin enseñar su
# numero (los nombres de usuario de Meta, docs/01 § 4.7 en crm-inmobi).
#
# Importar su chat (Turuta::ImportarChat) necesita colgarlo de un
# contact_inbox de la bandeja, y en WhatsApp el source_id es el telefono o el
# identificador de Meta (BSUID), que la exportacion no trae: solo "@usuario".
# Si el cliente ya escribio a la cuenta, su contacto ya lo tiene. Si no, el
# chat se cuelga de un marcador con forma de BSUID y pais "ZZ", que no existe:
# cuando el cliente escribe, reclamar lo cambia por su identificador real y su
# mensaje entra en el chat importado, con el historial delante. Mientras, no
# se le puede escribir desde el CRM: Meta rechazaria el marcador.
module Turuta
  module UsuarioWhatsapp
    PREFIJO = 'ZZ.import'.freeze

    module_function

    # "@Carla.Riena" -> "carla.riena". Lo mismo que queBuscar de la API
    # (dashboard-app/reinicio.logic.ts). Nil si no lo parece.
    def normalizar(valor)
      m = /\A@?([a-z0-9._]{2,40})\z/i.match(valor.to_s.strip)
      m && m[1].match?(/[a-z]/i) ? m[1].downcase : nil
    end

    # Siempre el mismo para el mismo usuario: importar otro chat suyo cae en el
    # mismo contacto.
    def marcador(usuario)
      "#{PREFIJO}#{Digest::SHA256.hexdigest(usuario)[0, 40]}"
    end

    # Como los deja Whatsapp::IdentifierSyncService cuando el cliente escribe.
    def atributos(usuario)
      { 'social_whatsapp_user_name' => usuario, 'social_profiles' => { 'whatsapp' => usuario } }
    end

    # El contacto de la cuenta con ese usuario, si ya escribio a algun numero.
    def contacto(account, usuario)
      account.contacts.where("LOWER(additional_attributes->>'social_whatsapp_user_name') = ?", usuario).first
    end

    # Al llegar un mensaje de un cliente con usuario: si su chat se importo con
    # marcador en esta bandeja, el marcador pasa a ser su identificador real.
    # Devuelve ese contact_inbox, o nil si no hay nada que reclamar.
    def reclamar(inbox:, source_ids:, username:)
      usuario = normalizar(username)
      return if usuario.nil? || source_ids.blank?
      return if inbox.contact_inboxes.exists?(source_id: source_ids)

      contact_inbox = inbox.contact_inboxes.find_by(source_id: marcador(usuario))
      contact_inbox&.update!(source_id: source_ids.first)
      contact_inbox
    end
  end
end
