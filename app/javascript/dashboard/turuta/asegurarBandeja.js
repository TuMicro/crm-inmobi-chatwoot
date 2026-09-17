// [turuta] Los botones del cuadro de respuesta (adjuntar, audio, plantillas de
// WhatsApp) dependen del TIPO de bandeja del chat, y ese tipo sale de la lista
// de bandejas, que Chatwoot carga UNA vez, al entrar. Un agente que entra antes
// de ser miembro de la bandeja carga la lista vacia; luego le llegan chats por
// el canal en vivo, y el cuadro de respuesta se queda solo con el emoji hasta
// que recarga la pagina. Aqui: si el chat abierto es de una bandeja que no
// esta en la lista, se vuelve a pedir la lista.

// Como mucho un intento por bandeja cada minuto: si de verdad no es miembro,
// pedirla en bucle no arregla nada.
const ESPERA_MS = 60000;
const intentos = new Map();

/** true si pidio la lista de bandejas. */
export function asegurarBandeja(store, inboxId, ahoraMs = Date.now()) {
  if (!inboxId) return false;
  const bandeja = store.getters['inboxes/getInbox'](inboxId);
  if (bandeja && bandeja.id) return false;

  const ultimo = intentos.get(inboxId);
  if (ultimo !== undefined && ahoraMs - ultimo < ESPERA_MS) return false;
  intentos.set(inboxId, ahoraMs);
  store.dispatch('inboxes/get');
  return true;
}

/** Solo para las pruebas. */
export const olvidarIntentos = () => intentos.clear();
