# [turuta] Ver Turuta::OwnConversations. Abrir un chat por su numero, leer sus
# mensajes o responder pasa por ConversationPolicy#show?. Sin esto bastaria con
# escribir el numero del chat en la barra de direcciones.
module Turuta::OwnConversations::Policy
  private

  def agent_can_view_conversation?
    return false unless super
    return true unless Turuta::OwnConversations.restricted?(user, account)

    Turuta::OwnConversations.visible?(record, user)
  end
end
