# [turuta] Abrir un chat sin quitarle el Agent Bot (la IA, docs/12).
#
# Chatwoot deja en "pendiente" los chats que atiende un bot, y en cuanto un
# usuario los abre por la API le quita el bot (handle_human_open) y, si es
# agente, se los asigna. Nuestra API abre el chat en cuanto la IA responde,
# para que se vea entre los abiertos con el bot como asignado y la etiqueta
# "ia", sin un estado aparte. Con el parametro turuta_keep_ai_assignee, abrir
# no toca la asignacion. Solo lo manda nuestra API; desde la interfaz no viaja.
module Turuta::KeepAiAssignee
  private

  def handle_human_open
    return if ActiveModel::Type::Boolean.new.cast(params[:turuta_keep_ai_assignee]) == true

    super
  end
end
