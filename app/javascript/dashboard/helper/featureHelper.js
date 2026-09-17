const FEATURE_HELP_URLS = {
  agent_bots: 'https://chwt.app/hc/agent-bots',
  agents: 'https://chwt.app/hc/agents',
  audit_logs: 'https://chwt.app/hc/audit-logs',
  campaigns: 'https://chwt.app/hc/campaigns',
  canned_responses: 'https://chwt.app/hc/canned',
  channel_email: 'https://chwt.app/hc/email',
  channel_facebook: 'https://chwt.app/hc/fb',
  custom_attributes: 'https://chwt.app/hc/custom-attributes',
  dashboard_apps: 'https://chwt.app/hc/dashboard-apps',
  help_center: 'https://chwt.app/hc/help-center',
  inboxes: 'https://chwt.app/hc/inboxes',
  integrations: 'https://chwt.app/hc/integrations',
  labels: 'https://chwt.app/hc/labels',
  macros: 'https://chwt.app/hc/macros',
  reports: 'https://chwt.app/hc/reports',
  sla: 'https://chwt.app/hc/sla',
  team_management: 'https://chwt.app/hc/teams',
  webhook: 'https://chwt.app/hc/webhooks',
  billing: 'https://chwt.app/pricing',
  saml: 'https://chwt.app/hc/saml',
  captain: 'https://chwt.app/captain-docs',
  captain_billing: 'https://chwt.app/hc/captain_billing',
};

// [turuta] Sin enlaces de "saber mas": todos llevan a la documentacion de
// Chatwoot y no hay equivalente oficial para estas pantallas. Las cabeceras
// de ajustes esconden el enlace cuando no hay URL. La tabla se conserva por
// si algun dia hay documentacion propia que enlazar.
const TURUTA_SIN_ENLACES = true;

export function getHelpUrlForFeature(featureName) {
  return TURUTA_SIN_ENLACES ? '' : FEATURE_HELP_URLS[featureName];
}
