# [turuta] Ver Turuta::OwnConversations. El contador de no leidos de Chatwoot ya
# sabe contar "lo mio y lo que esta sin asignar": solo hay que pedirselo para
# los agentes normales.
module Turuta::OwnConversations::UnreadCounter
  private

  def permission_mode
    # Se llama una vez por bandeja y por etiqueta: la respuesta se guarda.
    @turuta_restricted = Turuta::OwnConversations.restricted?(user, account) if @turuta_restricted.nil?
    return :unassigned_and_mine if @turuta_restricted

    super
  end
end
