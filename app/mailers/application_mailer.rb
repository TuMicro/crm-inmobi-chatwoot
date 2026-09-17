class ApplicationMailer < ActionMailer::Base
  include ActionView::Helpers::SanitizeHelper

  default from: ENV.fetch('MAILER_SENDER_EMAIL', 'Chatwoot <accounts@chatwoot.com>')
  before_action { ensure_current_account(params.try(:[], :account)) }
  around_action :switch_locale
  layout 'mailer/base'
  # Fetch template from Database if available
  # Order: Account Specific > Installation Specific > Fallback to file
  # [turuta] Nuestras plantillas de correo, en app/views/turuta, van delante de
  # todas: tambien de enterprise/app/views, que trae su propia copia de la
  # invitacion. Asi no se edita nada dentro de enterprise/. Se antepone ANTES
  # que el resolver de la base de datos para que ese siga siendo el primero.
  prepend_view_path Rails.root.join('app/views/turuta')
  prepend_view_path ::EmailTemplate.resolver
  append_view_path Rails.root.join('app/views/mailers')
  helper :frontend_urls
  helper do
    def global_config
      # [turuta] Con la marca de las variables TURUTA_*. Ver turuta_global_config.
      @global_config ||= controller.send(:turuta_global_config)
    end
  end

  rescue_from(*ExceptionList::SMTP_EXCEPTIONS, with: :handle_smtp_exceptions)

  def smtp_config_set_or_development?
    ENV.fetch('SMTP_ADDRESS', nil).present? || Rails.env.development?
  end

  private

  def handle_smtp_exceptions(message)
    Rails.logger.warn 'Failed to send Email'
    Rails.logger.error "Exception: #{message}"
  end

  def send_mail_with_liquid(*args)
    args[0][:subject] = turuta_subject(args[0][:subject]) # [turuta]
    Rails.logger.info "Email sent to #{args[0][:to]} with subject #{args[0][:subject]}"
    mail(*args) do |format|
      # explored sending a multipart email containing both text type and html
      # parsing the html with nokogiri will remove the links as well
      # might also remove tags like b,li etc. so lets rethink about this later
      # format.text { Nokogiri::HTML(render(layout: false)).text }
      format.html { render }
    end
  end

  def liquid_droppables
    # Merge additional objects into this in your mailer
    # liquid template handler converts these objects into drop objects
    {
      account: Current.account,
      user: @agent,
      conversation: @conversation,
      inbox: @conversation&.inbox
    }
  end

  def liquid_locals
    # expose variables you want to be exposed in liquid
    locals = {
      global_config: turuta_global_config,
      # [turuta] El layout es liquid y no tiene I18n: los textos del pie se le pasan.
      turuta_sent_by: I18n.t('turuta.mail.layout.sent_by'),
      turuta_notifications_reason: I18n.t('turuta.mail.layout.notifications_reason'),
      turuta_manage_notifications: I18n.t('turuta.mail.layout.manage_notifications'),
      action_url: @action_url
    }

    locals.merge({ attachment_url: @attachment_url }) if @attachment_url
    locals.merge({ failed_contacts: @failed_contacts, imported_contacts: @imported_contacts })
    locals
  end

  def locale_from_account(account)
    return unless account

    I18n.available_locales.map(&:to_s).include?(account.locale) ? account.locale : nil
  end

  # [turuta] Marca de los correos por variables de entorno, igual que la de la
  # interfaz (vueapp.html.erb): no escribe en installation_configs. TURUTA_MAIL_BRAND
  # permite un nombre mas corto que el de la pestana. Con marca propia, el pie solo
  # lleva enlace si se da TURUTA_BRAND_URL: asi no apunta a chatwoot.com.
  def turuta_global_config
    config = GlobalConfig.get('BRAND_NAME', 'BRAND_URL').to_h.dup
    marca = ENV['TURUTA_MAIL_BRAND'].presence || ENV['TURUTA_BRAND_NAME'].presence
    return config if marca.blank?

    config['BRAND_NAME'] = marca
    config['BRAND_URL'] = ENV['TURUTA_BRAND_URL'].to_s
    config
  end

  # [turuta] Los asuntos de estos correos estan escritos en ingles dentro de cada
  # mailer. En vez de tocar cada uno se traducen aqui, reconociendolos por su
  # forma. Uno que no encaje (porque Chatwoot lo cambio) sale como venia.
  TURUTA_SUBJECTS = [
    [/\A(?<name>.+), A new conversation \[ID - (?<id>\d+)\] has been created in (?<inbox>.+)\.\z/, 'conversation_creation'],
    [/\A(?<name>.+), A new conversation \[ID - (?<id>\d+)\] has been assigned to you\.\z/, 'conversation_assignment'],
    [/\A(?<name>.+), You have been mentioned in conversation \[ID - (?<id>\d+)\]\z/, 'conversation_mention'],
    [/\A(?<name>.+), New message in your assigned conversation \[ID - (?<id>\d+)\]\.\z/, 'assigned_conversation_new_message'],
    [/\A(?<name>.+), New message in your participating conversation \[ID - (?<id>\d+)\]\.\z/, 'participating_conversation_new_message'],
    [/\AContact Import Completed\z/, 'contact_import_complete'],
    [/\AContact Import Failed\z/, 'contact_import_failed'],
    [/\AYour contact's export file is available to download\.\z/, 'contact_export_complete'],
    [/\AAutomation rule disabled due to validation errors\.\z/, 'automation_rule_disabled'],
    [/\AYour Whatsapp connection has expired\z/, 'whatsapp_disconnect']
  ].freeze

  def turuta_subject(subject)
    TURUTA_SUBJECTS.each do |(forma, clave)|
      datos = forma.match(subject.to_s)
      next unless datos

      return I18n.t("turuta.mail.subjects.#{clave}", **datos.named_captures.symbolize_keys, default: subject.to_s)
    end
    subject
  end

  def turuta_default_locale
    candidato = ENV.fetch('DEFAULT_LOCALE', nil).to_s
    I18n.available_locales.map(&:to_s).include?(candidato) ? candidato : nil
  end

  def ensure_current_account(account)
    Current.reset
    Current.account = account if account.present?
  end

  def switch_locale(&)
    locale ||= locale_from_account(Current.account)
    # [turuta] Sin cuenta (p. ej. "olvide mi contrasena" desde la entrada), el
    # idioma de la instalacion antes que el ingles.
    locale ||= turuta_default_locale
    locale ||= I18n.default_locale
    # ensure locale won't bleed into other requests
    # https://guides.rubyonrails.org/i18n.html#managing-the-locale-across-requests
    I18n.with_locale(locale, &)
  end
end
