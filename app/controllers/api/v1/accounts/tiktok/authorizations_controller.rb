class Api::V1::Accounts::Tiktok::AuthorizationsController < Api::V1::Accounts::OauthAuthorizationController
  include Tiktok::IntegrationHelper

  def create
    redirect_url = Tiktok::AuthClient.authorize_url(
      # [turuta] origin: el dominio por el que se pide, para volver a el (Turuta::DominioDeOrigen)
      state: generate_tiktok_token(Current.account.id, params[:return_to], origin: Turuta::DominioDeOrigen.origen(request.host_with_port))
    )

    if redirect_url
      render json: { success: true, url: redirect_url }
    else
      render json: { success: false }, status: :unprocessable_entity
    end
  end
end
