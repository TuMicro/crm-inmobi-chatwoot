# == Schema Information
#
# Table name: account_users
#
#  id                       :bigint           not null, primary key
#  active_at                :datetime
#  auto_offline             :boolean          default(TRUE), not null
#  availability             :integer          default("online"), not null
#  role                     :integer          default("agent")
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#  account_id               :bigint
#  agent_capacity_policy_id :bigint
#  custom_role_id           :bigint
#  inviter_id               :bigint
#  user_id                  :bigint
#
# Indexes
#
#  index_account_users_on_account_id                (account_id)
#  index_account_users_on_agent_capacity_policy_id  (agent_capacity_policy_id)
#  index_account_users_on_custom_role_id            (custom_role_id)
#  index_account_users_on_user_id                   (user_id)
#  uniq_user_id_per_account_id                      (account_id,user_id) UNIQUE
#

class AccountUser < ApplicationRecord
  include AvailabilityStatusable

  belongs_to :account
  belongs_to :user
  belongs_to :inviter, class_name: 'User', optional: true

  enum role: { agent: 0, administrator: 1 }
  enum availability: { online: 0, offline: 1, busy: 2 }

  accepts_nested_attributes_for :account

  after_create_commit :notify_creation, :create_notification_setting
  # [turuta] Aviso inmediato a nuestra API: ver turuta_notify_agents_changed.
  after_commit :turuta_notify_agents_changed, on: [:create, :destroy]
  after_update_commit :turuta_notify_agents_changed, if: :turuta_reparto_changed?
  after_destroy :notify_deletion, :remove_user_from_account
  after_save :update_presence_in_redis, if: :saved_change_to_availability?
  after_commit :invalidate_filtered_unread_count_visibility, on: [:create, :destroy]
  after_update_commit :invalidate_filtered_unread_count_visibility_update, if: :filtered_unread_count_visibility_changed?

  validates :user_id, uniqueness: { scope: :account_id }

  # [turuta] Lo que cambia a quien se le reparten leads: el rol (solo los agentes
  # son asesores), la disponibilidad, y el auto offline, del que depende que la
  # disponibilidad signifique algo.
  def turuta_reparto_changed?
    saved_change_to_role? || saved_change_to_availability? || saved_change_to_auto_offline?
  end

  # [turuta] Alta, baja o cambio de estado de un agente: se avisa por los webhooks
  # de la cuenta con un evento nuestro, 'turuta_agents_changed'. Nuestra API lo
  # recibe por el mismo webhook que ya tiene registrado (con su secreto en la URL)
  # y sincroniza los asesores al momento, en vez de esperar a su sondeo de cinco
  # minutos. No hace falta configurar nada nuevo. Un webhook ajeno recibiria un
  # evento que no conoce y lo ignoraria. Nunca debe impedir guardar el agente.
  def turuta_notify_agents_changed
    payload = { event: 'turuta_agents_changed', account: { id: account_id } }
    Webhook.where(account_id: account_id, webhook_type: :account_type).find_each do |webhook|
      WebhookJob.perform_later(webhook.url, payload)
    end
  rescue StandardError => e
    Rails.logger.warn("[turuta] no se pudo avisar del cambio de agentes: #{e.message}")
  end

  def create_notification_setting
    setting = user.notification_settings.new(account_id: account.id)
    # [turuta] Sin correos a los agentes por defecto: el asesor vive en la
    # bandeja y el correo de "te asignaron una conversacion" solo hacia ruido.
    # Los necesarios (invitacion, contrasena) no pasan por aqui.
    setting.selected_email_flags = []
    # [turuta] Tampoco push: la seccion de notificaciones del perfil esta oculta.
    setting.selected_push_flags = []
    setting.save!
  end

  def remove_user_from_account
    ::Agents::DestroyJob.perform_later(account, user)
  end

  def permissions
    administrator? ? ['administrator'] : ['agent']
  end

  def push_event_data
    {
      id: id,
      availability: availability,
      role: role,
      user_id: user_id
    }
  end

  private

  def notify_creation
    Rails.configuration.dispatcher.dispatch(AGENT_ADDED, Time.zone.now, account: account)
  end

  def notify_deletion
    Rails.configuration.dispatcher.dispatch(AGENT_REMOVED, Time.zone.now, account: account)
  end

  def update_presence_in_redis
    OnlineStatusTracker.set_status(account.id, user.id, availability)
  end

  def filtered_unread_count_visibility_changed?
    previous_changes.key?('role') || previous_changes.key?('custom_role_id')
  end

  def invalidate_filtered_unread_count_visibility
    ::Conversations::UnreadCounts::FilteredCountInvalidator.new(account).user_visibility_changed!(user_id: user_id)
  end

  def invalidate_filtered_unread_count_visibility_update
    dispatch_account_cache_invalidated if invalidate_filtered_unread_count_visibility
  end

  def dispatch_account_cache_invalidated
    Rails.configuration.dispatcher.dispatch(ACCOUNT_CACHE_INVALIDATED, Time.zone.now, account: account, cache_keys: account.cache_keys)
  end
end

AccountUser.prepend_mod_with('AccountUser')
AccountUser.include_mod_with('Audit::AccountUser')
AccountUser.include_mod_with('Concerns::AccountUser')
