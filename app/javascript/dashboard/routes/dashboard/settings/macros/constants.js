const ACCIONES_DE_CHATWOOT = [
  {
    key: 'assign_team',
    label: 'ASSIGN_TEAM',
    inputType: 'search_select',
  },
  {
    key: 'assign_agent',
    label: 'ASSIGN_AGENT',
    inputType: 'search_select',
  },
  {
    key: 'add_label',
    label: 'ADD_LABEL',
    inputType: 'multi_select',
  },
  {
    key: 'remove_label',
    label: 'REMOVE_LABEL',
    inputType: 'multi_select',
  },
  {
    key: 'remove_assigned_agent',
    label: 'REMOVE_ASSIGNED_AGENT',
    inputType: null,
  },
  {
    key: 'remove_assigned_team',
    label: 'REMOVE_ASSIGNED_TEAM',
    inputType: null,
  },
  {
    key: 'send_email_transcript',
    label: 'SEND_EMAIL_TRANSCRIPT',
    inputType: 'email',
  },
  {
    key: 'mute_conversation',
    label: 'MUTE_CONVERSATION',
    inputType: null,
  },
  {
    key: 'snooze_conversation',
    label: 'SNOOZE_CONVERSATION',
    inputType: null,
  },
  {
    key: 'resolve_conversation',
    label: 'RESOLVE_CONVERSATION',
    inputType: null,
  },
  {
    key: 'send_attachment',
    label: 'SEND_ATTACHMENT',
    inputType: 'attachment',
  },
  {
    key: 'send_message',
    label: 'SEND_MESSAGE',
    inputType: 'textarea',
  },
  {
    key: 'add_private_note',
    label: 'ADD_PRIVATE_NOTE',
    inputType: 'textarea',
  },
  {
    key: 'change_priority',
    label: 'CHANGE_PRIORITY',
    inputType: 'search_select',
  },
  {
    key: 'send_webhook_event',
    label: 'SEND_WEBHOOK_EVENT',
    inputType: 'url',
  },
];

// [turuta] Fuera las acciones de cosas que la interfaz ya no tiene.
const TURUTA_ACCIONES_OCULTAS = new Set([
  'assign_team',
  'remove_assigned_team',
  'snooze_conversation',
  'change_priority',
  'send_webhook_event',
  // Resuelve el chat y BLOQUEA al contacto: WhatsApp descarta sus mensajes.
  'mute_conversation',
]);
export const MACRO_ACTION_TYPES = ACCIONES_DE_CHATWOOT.filter(
  accion => !TURUTA_ACCIONES_OCULTAS.has(accion.key)
);
