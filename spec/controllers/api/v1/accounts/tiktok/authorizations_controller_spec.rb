require 'rails_helper'

RSpec.describe 'TikTok Authorization API', type: :request do
  let(:account) { create(:account) }

  describe 'POST /api/v1/accounts/{account.id}/tiktok/authorization' do
    context 'when it is an unauthenticated user' do
      it 'returns unauthorized' do
        post "/api/v1/accounts/#{account.id}/tiktok/authorization"

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when it is an authenticated user' do
      let(:agent) { create(:user, account: account, role: :agent) }
      let(:administrator) { create(:user, account: account, role: :administrator) }

      before do
        InstallationConfig.where(name: %w[TIKTOK_APP_ID TIKTOK_APP_SECRET]).delete_all
        GlobalConfig.clear_cache
      end

      it 'returns unauthorized for agent' do
        with_modified_env TIKTOK_APP_ID: 'tiktok-app-id', TIKTOK_APP_SECRET: 'tiktok-app-secret' do
          post "/api/v1/accounts/#{account.id}/tiktok/authorization",
               headers: agent.create_new_auth_token,
               as: :json
        end

        expect(response).to have_http_status(:unauthorized)
      end

      it 'creates a new authorization and returns the redirect url' do
        travel_to Time.zone.parse('2025-01-01 00:00:00 UTC') do
          with_modified_env TIKTOK_APP_ID: 'tiktok-app-id', TIKTOK_APP_SECRET: 'tiktok-app-secret' do
            post "/api/v1/accounts/#{account.id}/tiktok/authorization",
                 headers: administrator.create_new_auth_token,
                 as: :json
          end

          expect(response).to have_http_status(:success)
          expect(response.parsed_body['success']).to be true

          helper = Class.new do
            include Tiktok::IntegrationHelper
          end.new

          expected_state = helper.generate_tiktok_token(account.id)
          expected_url = Tiktok::AuthClient.authorize_url(state: expected_state)

          expect(response.parsed_body['url']).to eq(expected_url)
        end
      end

      # [turuta] Volver al dominio de origen (Turuta::DominioDeOrigen)
      it 'signs the extra domain the request came from' do
        host! 'crm.cliente.test'
        with_modified_env TIKTOK_APP_ID: 'tiktok-app-id', TIKTOK_APP_SECRET: 'tiktok-app-secret', CHATWOOT_HOSTS_EXTRA: 'crm.cliente.test' do
          post "/api/v1/accounts/#{account.id}/tiktok/authorization", headers: administrator.create_new_auth_token, as: :json
        end

        query = Rack::Utils.parse_query(URI(response.parsed_body.fetch('url')).query)
        payload = JWT.decode(query.fetch('state'), 'tiktok-app-secret', true, algorithm: 'HS256').first
        expect(payload).to include('sub' => account.id, 'origin' => 'crm.cliente.test')
      end

      it 'uses TURUTA_URL_DE_VUELTA as redirect_uri and signs FRONTEND_URL as origin when they differ' do
        host! 'crm.cliente.test'
        with_modified_env TIKTOK_APP_ID: 'tiktok-app-id', TIKTOK_APP_SECRET: 'tiktok-app-secret', FRONTEND_URL: 'https://crm.cliente.test',
                          CHATWOOT_HOSTS_EXTRA: 'app.crm.test', TURUTA_URL_DE_VUELTA: 'https://app.crm.test' do
          post "/api/v1/accounts/#{account.id}/tiktok/authorization", headers: administrator.create_new_auth_token, as: :json
        end

        query = Rack::Utils.parse_query(URI(response.parsed_body.fetch('url')).query)
        expect(query.fetch('redirect_uri')).to eq('https://app.crm.test/tiktok/callback')
        payload = JWT.decode(query.fetch('state'), 'tiktok-app-secret', true, algorithm: 'HS256').first
        expect(payload).to include('sub' => account.id, 'origin' => 'crm.cliente.test')
      end
    end
  end
end
