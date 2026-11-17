require 'rails_helper'

describe Instagram::SendOnInstagramService do
  subject(:send_reply_service) { described_class.new(message: message) }

  let!(:account) { create(:account) }
  let!(:instagram_channel) { create(:channel_instagram, account: account, instagram_id: 'instagram-message-id-123') }
  let!(:instagram_inbox) { create(:inbox, channel: instagram_channel, account: account, greeting_enabled: false) }

  let!(:contact) { create(:contact, account: account) }
  let(:contact_inbox) { create(:contact_inbox, contact: contact, inbox: instagram_inbox) }
  let(:conversation) { create(:conversation, contact: contact, inbox: instagram_inbox, contact_inbox: contact_inbox) }
  let(:response) { double }
  let(:mock_response) do
    instance_double(
      HTTParty::Response,
      :success? => true,
      :body => { message_id: 'random_message_id' }.to_json,
      :parsed_response => { 'message_id' => 'random_message_id' }
    )
  end

  let(:error_body) do
    {
      'error' => {
        'message' => 'The Instagram account is restricted.',
        'type' => 'OAuthException',
        'code' => 400,
        'fbtrace_id' => 'anyrandomfbtraceid1234567890'
      }
    }
  end

  let(:error_response) do
    instance_double(
      HTTParty::Response,
      :success? => false,
      :body => error_body.to_json,
      :parsed_response => error_body
    )
  end

  let(:response_with_error) do
    instance_double(
      HTTParty::Response,
      :success? => true,
      :body => error_body.to_json,
      :parsed_response => error_body
    )
  end

  describe '#perform' do
    it 'sends Unified Login messages through the Instagram account on Facebook Graph' do
      instagram_channel.update!(auth_type: 'unified_login', expires_at: nil)
      message = create(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)
      request = stub_request(:post, 'https://graph.facebook.com/v22.0/instagram-message-id-123/messages')
                .with(query: { access_token: instagram_channel.access_token })
                .to_return(body: { message_id: 'unified-message' }.to_json, headers: { 'Content-Type' => 'application/json' })

      described_class.new(message: message).perform

      expect(request).to have_been_requested.once
      expect(message.reload.source_id).to eq('unified-message')
    end

    it 'shows reconnect for an expired Unified Login token even when Meta returns a non-190 error' do
      instagram_channel.update!(auth_type: 'unified_login', expires_at: 1.hour.from_now)
      message = create(:message, message_type: :outgoing, inbox: instagram_inbox, account: account, conversation: conversation)
      error = { error: { code: 2500, message: 'Authentication failed' } }
      request = stub_request(:post, 'https://graph.facebook.com/v22.0/instagram-message-id-123/messages')
                .with(query: hash_including('access_token' => /.*/))
                .to_return(status: 400, body: error.to_json, headers: { 'Content-Type' => 'application/json' })
      travel_to(2.hours.from_now) do
        described_class.new(message: message).perform
        expect(instagram_channel.reauthorization_required?).to be(true)
        expect(message.reload.status).to eq('failed')
        expect(message.external_error).to eq('2500 - Authentication failed')
      end
      expect(request).to have_been_requested.once
    end

    context 'with reply' do
      before do
        allow(HTTParty).to receive(:post).and_return(mock_response)
      end

      context 'without message_tag HUMAN_AGENT' do
        before do
          InstallationConfig.where(name: 'ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT').first_or_create(value: false)
        end

        it 'if message is sent from chatwoot and is outgoing' do
          message = create(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)

          response = described_class.new(message: message).perform
          expect(response['message_id']).to eq('random_message_id')
        end

        it 'if message is sent from chatwoot and is outgoing with multiple attachments' do
          message = build(:message, content: nil, message_type: 'outgoing', inbox: instagram_inbox, account: account,
                                    conversation: conversation)
          avatar = message.attachments.new(account_id: message.account_id, file_type: :image)
          avatar.file.attach(io: Rails.root.join('spec/assets/avatar.png').open, filename: 'avatar.png', content_type: 'image/png')
          sample = message.attachments.new(account_id: message.account_id, file_type: :image)
          sample.file.attach(io: Rails.root.join('spec/assets/sample.png').open, filename: 'sample.png', content_type: 'image/png')
          message.save!

          service = described_class.new(message: message)

          # Stub the send_message method on the service instance
          allow(service).to receive(:send_message)
          service.perform

          # Now you can set expectations on the stubbed method for each attachment
          expect(service).to have_received(:send_message).exactly(:twice)
        end

        it 'if message with attachment is sent from chatwoot and is outgoing' do
          message = build(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)
          attachment = message.attachments.new(account_id: message.account_id, file_type: :image)
          attachment.file.attach(io: Rails.root.join('spec/assets/avatar.png').open, filename: 'avatar.png', content_type: 'image/png')
          message.save!
          response = described_class.new(message: message).perform

          expect(response['message_id']).to eq('random_message_id')
        end

        it 'if message sent from chatwoot is failed' do
          message = create(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)

          allow(HTTParty).to receive(:post).and_return(response_with_error)
          described_class.new(message: message).perform
          expect(HTTParty).to have_received(:post)
          expect(message.reload.status).to eq('failed')
          expect(message.reload.external_error).to eq('400 - The Instagram account is restricted.')
        end
      end

      context 'with message_tag HUMAN_AGENT' do
        before do
          InstallationConfig.where(name: 'ENABLE_MESSENGER_CHANNEL_HUMAN_AGENT').first_or_create(value: true)
        end

        it 'if message is sent from chatwoot and is outgoing' do
          message = create(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)

          allow(HTTParty).to receive(:post).with(
            {
              recipient: { id: contact.get_source_id(instagram_inbox.id) },
              message: {
                text: message.content
              },
              messaging_type: 'MESSAGE_TAG',
              tag: 'HUMAN_AGENT'
            }
          ).and_return(
            {
              'message_id': 'random_message_id'
            }
          )

          described_class.new(message: message).perform
          expect(HTTParty).to have_received(:post)
        end
      end

      context 'when handling errors' do
        it 'handles HTTP errors' do
          message = create(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)
          allow(HTTParty).to receive(:post).and_return(error_response)

          described_class.new(message: message).perform

          expect(message.reload.status).to eq('failed')
          expect(message.reload.external_error).to eq('400 - The Instagram account is restricted.')
        end

        it 'handles response errors' do
          message = create(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)

          error_response = instance_double(
            HTTParty::Response,
            success?: true,
            body: { 'error' => { 'message' => 'Invalid message format', 'code' => 100 } }.to_json,
            parsed_response: { 'error' => { 'message' => 'Invalid message format', 'code' => 100 } }
          )

          allow(HTTParty).to receive(:post).and_return(error_response)

          described_class.new(message: message).perform

          expect(message.reload.status).to eq('failed')
          expect(message.reload.external_error).to eq('100 - Invalid message format')
        end

        it 'handles reauthorization errors if access token is expired' do
          message = create(:message, message_type: 'outgoing', inbox: instagram_inbox, account: account, conversation: conversation)

          error_response = instance_double(
            HTTParty::Response,
            success?: false,
            body: { 'error' => { 'message' => 'Access token has expired', 'code' => 190 } }.to_json,
            parsed_response: { 'error' => { 'message' => 'Access token has expired', 'code' => 190 } }
          )

          allow(HTTParty).to receive(:post).and_return(error_response)

          described_class.new(message: message).perform

          expect(message.reload.status).to eq('failed')
          expect(message.reload.external_error).to eq('190 - Access token has expired')
          expect(instagram_channel.reload).to be_reauthorization_required
        end
      end
    end
  end
end
