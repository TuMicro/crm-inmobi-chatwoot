class Api::V1::Accounts::AssignableAgentsController < Api::V1::Accounts::BaseController
  before_action :fetch_inboxes

  def index
    # TODO: Remove this opt-in once mobile clients support AgentBot assignees in this payload.
    # [turuta] Nunca: el bot de la IA es la firma de sus mensajes, no un
    # asesor, y no debe salir en "Agente asignado" (docs/11 de crm-inmobi).
    @include_agent_bots = false
    agent_ids = @inboxes.map do |inbox|
      authorize inbox, :show?
      member_ids = inbox.members.pluck(:user_id)
      member_ids
    end
    agent_ids = agent_ids.inject(:&)
    agents = Current.account.users.where(id: agent_ids)
    @assignable_agents = (agents + Current.account.administrators).uniq
    @agent_bots = @include_agent_bots ? AgentBot.accessible_to(Current.account) : []
  end

  private

  def fetch_inboxes
    @inboxes = Current.account.inboxes.find(permitted_params[:inbox_ids])
  end

  def permitted_params
    params.permit(inbox_ids: [])
  end
end
