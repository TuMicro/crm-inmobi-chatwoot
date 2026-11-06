# [turuta] POST /api/v1/accounts/:account_id/turuta_importaciones: importa un
# chat exportado de WhatsApp (Turuta::ImportarChat). Solo administradores. Lo
# llama Ajustes -> "Importar un chat" (turuta/ImportarChatPage.vue).
class Api::V1::Accounts::TurutaImportacionesController < Api::V1::Accounts::BaseController
  before_action :solo_administradores

  def create
    render json: Turuta::ImportarChat.new(account: Current.account, params: permitidos).perform
  rescue Turuta::ImportarChat::Error => e
    render json: { message: e.message }, status: :unprocessable_entity
  end

  private

  def solo_administradores
    return if Current.account_user&.administrator?

    render json: { message: 'Solo administradores' }, status: :forbidden
  end

  def permitidos
    params.permit(:inbox_id, :telefono, :usuario, :nombre, :assignee_id, :zona, :huella,
                  mensajes: [:fecha, :entrante, :texto]).to_h
  end
end
