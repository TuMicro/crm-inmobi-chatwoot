class Macros::ExecutionService < ActionService
  def initialize(macro, conversation, user)
    super(conversation)
    @macro = macro
    @account = macro.account
    @user = user
    Current.user = user
  end

  def perform
    @macro.actions.each do |action|
      action = action.with_indifferent_access
      begin
        send(action[:action_name], action[:action_params])
      rescue StandardError => e
        ChatwootExceptionTracker.new(e, account: @account).capture_exception
      end
    end
  ensure
    Current.reset
  end

  private

  def assign_agent(agent_ids)
    agent_ids = agent_ids.map { |id| id == 'self' ? @user.id : id }
    super(agent_ids)
  end

  def add_private_note(message)
    return if conversation_a_tweet?

    params = { content: message[0], private: true }

    # Added reload here to ensure conversation us persistent with the latest updates
    mb = Messages::MessageBuilder.new(@user, @conversation.reload, params)
    mb.perform
  end

  def send_message(message)
    return if conversation_a_tweet?

    params = { content: message[0], private: false }

    # Added reload here to ensure conversation us persistent with the latest updates
    mb = Messages::MessageBuilder.new(@user, @conversation.reload, params)
    turuta_esperar_envio(mb.perform)
  end

  def send_attachment(blob_ids)
    return if conversation_a_tweet?

    return unless @macro.files.attached?

    blobs = ActiveStorage::Blob.where(id: blob_ids)

    return if blobs.blank?

    params = { content: nil, private: false, attachments: blobs }

    # Added reload here to ensure conversation us persistent with the latest updates
    mb = Messages::MessageBuilder.new(@user, @conversation.reload, params)
    turuta_esperar_envio(mb.perform)
  end

  # [turuta] Envio EN ORDEN. Cada mensaje sale por su propio SendReplyJob, en
  # paralelo: un texto llega a WhatsApp antes que la imagen que iba delante,
  # porque la imagen tarda mas en subir. Aqui se espera a que WhatsApp acepte
  # cada mensaje (le pone source_id) o lo rechace, antes de crear el siguiente.
  # Con tope: si el canal no contesta en 15 s, la macro sigue. Solo en bandejas
  # de WhatsApp; en otros canales source_id no se rellena y seria esperar en
  # balde. Esto corre dentro de MacrosExecutionJob, no en la peticion web.
  TURUTA_ESPERA_MAXIMA = 15

  def turuta_esperar_envio(message)
    return message unless message.is_a?(Message) && message.outgoing? && !message.private?
    return message unless @conversation.inbox.channel_type == 'Channel::Whatsapp'

    limite = Time.current + TURUTA_ESPERA_MAXIMA.seconds
    while Time.current < limite
      message.reload
      break if message.source_id.present? || message.failed?

      sleep 0.4
    end
    message
  rescue StandardError => e
    Rails.logger.warn("[turuta] macro: no se pudo esperar el envio: #{e.message}")
    message
  end

  def send_webhook_event(webhook_url)
    payload = @conversation.webhook_data.merge(event: 'macro.executed')
    WebhookJob.perform_later(webhook_url.first, payload)
  end
end

Macros::ExecutionService.include_mod_with('Macros::ExecutionService')
