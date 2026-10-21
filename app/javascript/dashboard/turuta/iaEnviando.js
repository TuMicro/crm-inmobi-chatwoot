// [turuta] Mientras la IA manda una ficha (el texto, las fotos, los videos y
// los PDF salen de uno en uno y esperan a llegar al movil), nuestra API marca
// el chat con custom_attributes.turuta_ia_enviando = hasta cuando (ISO) y lo
// borra al terminar (services/api AiService.atender). El chat muestra un
// aviso como el de "esta escribiendo", para que nadie escriba en medio.
// Si la API se cae a mitad, el aviso se va solo al pasar esa hora.

export const CLAVE_IA_ENVIANDO = 'turuta_ia_enviando';

export const TEXTO_IA_ENVIANDO =
  'La IA está enviando la ficha. Espera a que termine para escribir.';

export function iaEnviando(chat, ahora = Date.now()) {
  const hasta = Date.parse(chat?.custom_attributes?.[CLAVE_IA_ENVIANDO] || '');
  return Number.isFinite(hasta) && hasta > ahora;
}

// El aviso de abajo, como el de las macros (22/10).
export const TEXTO_TOAST_IA = 'La IA está enviando la ficha…';
export const TEXTO_TOAST_IA_FIN = 'La IA terminó de enviar la ficha.';

const SALIENTE = 1;
const deLaIa = m =>
  m?.message_type === SALIENTE &&
  !m.private &&
  (m.sender?.type === 'agent_bot' || m.sender_type === 'AgentBot');
const llego = m => ['delivered', 'read', 'failed'].includes(m?.status);
const haceMenosDe = (m, ms, ahora) => ahora - (m?.created_at || 0) * 1000 < ms;

/**
 * La IA esta mandando una ficha, visto en los mensajes del chat (22/10): un
 * archivo suyo de hace menos de dos minutos, y su ultimo mensaje es de hace
 * menos de 8 s o aun no ha llegado al movil. Asi el aviso sale aunque no
 * llegue la marca de la API (iaEnviando), que es la que lo dice primero.
 */
export function iaEnviandoPorMensajes(mensajes, ahora = Date.now()) {
  const salientes = (mensajes || []).filter(
    m => m?.message_type === SALIENTE && !m.private
  );
  const ultimo = salientes[salientes.length - 1];
  if (!deLaIa(ultimo)) return false;
  const conArchivo = salientes.some(
    m =>
      deLaIa(m) &&
      (m.attachments || []).length > 0 &&
      haceMenosDe(m, 120000, ahora)
  );
  if (!conArchivo) return false;
  return (
    haceMenosDe(ultimo, 8000, ahora) ||
    (!llego(ultimo) && haceMenosDe(ultimo, 60000, ahora))
  );
}
