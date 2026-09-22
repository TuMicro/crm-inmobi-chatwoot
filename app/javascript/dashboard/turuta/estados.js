// [turuta] Que estados de chat se ofrecen en los filtros, y a quien.
//
// En el CRM un chat esta abierto o resuelto; "posponer" no existe. "Pendiente"
// es el estado en que Chatwoot deja un chat mientras lo atiende el Agent Bot,
// o sea la IA (docs/12): se ensena solo al administrador, con el nombre
// "Con la IA", para que pueda mirar lo que la IA esta haciendo y tomar el
// chat si hace falta. Los agentes no lo ven: para ellos el chat aparece
// cuando la IA se lo entrega.

const ESTADOS = ['open', 'resolved', 'pending', 'all'];

/** Los estados que ve este rol, en el orden del desplegable. */
export const estadosDeChat = rol =>
  ESTADOS.filter(e => e !== 'pending' || rol === 'administrator');

/** Para filtrar la lista de opciones de Chatwoot ({ value }) sin reordenarla. */
export const opcionDeEstadoVisible = (opcion, rol) =>
  estadosDeChat(rol).includes(opcion.value);
