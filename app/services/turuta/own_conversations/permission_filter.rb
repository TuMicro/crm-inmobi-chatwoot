# [turuta] Ver Turuta::OwnConversations. Recorta la relacion de la que salen la
# lista de chats, los filtros, sus contadores y los chats de un contacto.
# accessible_conversations solo se llama para quien no es administrador.
module Turuta::OwnConversations::PermissionFilter
  private

  def accessible_conversations
    relation = super
    return relation unless Turuta::OwnConversations.restricted?(user, account)

    Turuta::OwnConversations.scope(relation, user)
  end
end
