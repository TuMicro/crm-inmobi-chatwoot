# [turuta] Ver Turuta::OwnConversations. El buscador tiene sus propias consultas,
# que solo miraban la bandeja.
module Turuta::OwnConversations::Search
  private

  def filter_conversations
    relation = super
    return relation unless Turuta::OwnConversations.restricted?(current_user, current_account)

    @conversations = Turuta::OwnConversations.scope(relation, current_user)
  end

  # Con subconsulta y no con JOIN: la consulta de Chatwoot usa "created_at" sin
  # el nombre de la tabla, y un JOIN con conversations lo volveria ambiguo.
  def message_base_query
    query = super
    return query unless Turuta::OwnConversations.restricted?(current_user, current_account)

    visibles = Turuta::OwnConversations.scope(current_account.conversations, current_user).select(:id)
    query.where(conversation_id: visibles)
  end
end
