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
