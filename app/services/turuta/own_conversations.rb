# [turuta] Un agente solo ve SUS chats y los que estan SIN ASIGNAR.
#
# En Chatwoot un agente ve todas las conversaciones de las bandejas de las que
# es miembro; restringirlo es cosa de los roles personalizados, que son de pago
# y viven en enterprise/, que no se toca. Esto es una implementacion propia e
# independiente, para el unico caso que necesita un CRM inmobiliario: cada
# asesor con sus leads, y el pozo comun de los que aun no tienen asesor.
#
# Los administradores lo ven todo, como siempre. Los tokens de API de un
# administrador (nuestra API) tambien. Un agente con rol personalizado no se
# toca: de ese se encarga Chatwoot.
#
# Donde se aplica, cada uno con un modulo de esta carpeta y un `prepend`:
#   - la lista, los filtros, los contadores y los chats de un contacto
#     (Conversations::PermissionFilterService)
#   - abrir, leer o responder un chat por su numero (ConversationPolicy)
#   - el buscador (SearchService)
#   - los avisos en vivo, para que el contenido ni llegue al navegador
#     (ActionCableListener)
#   - los contadores de no leidos (Conversations::UnreadCounts::Counter)
#
# Se apaga por instalacion con TURUTA_AGENTS_SEE_ALL=true, que devuelve el
# comportamiento de Chatwoot. La interfaz lee la misma variable.
module Turuta::OwnConversations
  SQL = 'conversations.assignee_id = ? OR conversations.assignee_id IS NULL'.freeze

  def self.disabled?
    ActiveModel::Type::Boolean.new.cast(ENV.fetch('TURUTA_AGENTS_SEE_ALL', false)) == true
  end

  # true si a este usuario hay que recortarle lo que ve en esta cuenta.
  def self.restricted?(user, account)
    return false if disabled?
    return false unless user.is_a?(User)
    return false if account.nil?

    account_user = AccountUser.find_by(account_id: account.id, user_id: user.id)
    return false if account_user.nil?

    account_user.agent? && account_user.custom_role_id.blank?
  end

  def self.scope(conversations, user)
    conversations.where(SQL, user.id)
  end

  def self.visible?(conversation, user)
    conversation.assignee_id.nil? || conversation.assignee_id == user.id
  end
end
