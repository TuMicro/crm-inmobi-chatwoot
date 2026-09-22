// [turuta] Un agente solo ve SUS chats y los que estan SIN ASIGNAR. La regla de
// verdad esta en el servidor (app/services/turuta/own_conversations.rb); esto es
// su reflejo en la interfaz, para que la lista, las pestanas y los avisos
// sonoros digan lo mismo. Sin imports: lo usa el almacen.

/** La instalacion puede devolver el comportamiento de Chatwoot con
 *  TURUTA_AGENTS_SEE_ALL=true. El servidor lee la misma variable. */
export const agentesVenTodo = (config = window.globalConfig) =>
  ['true', '1', 'yes', 'on'].includes(
    String(config?.TURUTA_AGENTS_SEE_ALL ?? '').toLowerCase()
  );

/** true si la regla aplica a este rol. Administradores y roles personalizados,
 *  no: a esos los gobierna Chatwoot. */
export const esAgenteRestringido = rol => rol === 'agent' && !agentesVenTodo();

export function esMioOSinAsignar(conversation, miId) {
  const asignado = conversation?.meta?.assignee;
  // Lo atiende la IA (el Agent Bot es el asignado): no es de nadie ni esta
  // sin asignar. El id del bot no es el de un usuario, aunque coincida.
  if (
    conversation?.meta?.assignee_type === 'AgentBot' ||
    asignado?.type === 'agent_bot'
  ) {
    return false;
  }
  return !asignado || asignado.id === miId;
}

/** Puede este usuario ver este chat. */
export const puedeVerChat = (conversation, rol, miId) =>
  !esAgenteRestringido(rol) || esMioOSinAsignar(conversation, miId);

/** Para un agente, "Todos" seria lo mismo que "Mias" mas "Sin asignar": sobra. */
export const pestanaVisible = (clave, rol) =>
  !(clave === 'all' && esAgenteRestringido(rol));
