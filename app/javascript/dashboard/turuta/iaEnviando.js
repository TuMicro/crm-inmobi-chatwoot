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
 * La marca que pone nuestra API en cada mensaje de una ficha (23/10): que
 * ficha es y que pieza, { id, paso, de } ("3 de 4").
 */
export const marcaDeFicha = m => m?.content_attributes?.turuta_ficha || null;

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
  // Las fichas marcadas las cuenta estadoDelEnvio; aqui, solo las de antes o
  // las que salen por una macro.
  const conArchivo = salientes.some(
    m =>
      deLaIa(m) &&
      !marcaDeFicha(m) &&
      (m.attachments || []).length > 0 &&
      haceMenosDe(m, 120000, ahora)
  );
  if (!conArchivo) return false;
  return (
    haceMenosDe(ultimo, 10000, ahora) ||
    (!llego(ultimo) && haceMenosDe(ultimo, 60000, ahora))
  );
}

/**
 * Como va la ficha de la IA, por sus mensajes: 'enviando', 'terminada' (acaba
 * de salir su ultima pieza: el aviso dice "terminó" al momento, sin esperar a
 * que llegue al movil) o null. Con la marca se sabe exacto; sin ella (fichas
 * por macro), se deduce como antes (iaEnviandoPorMensajes).
 */
export function estadoDelEnvio(mensajes, ahora = Date.now()) {
  const salientes = (mensajes || []).filter(
    m => m?.message_type === SALIENTE && !m.private
  );
  const ultimo = salientes[salientes.length - 1];
  const marca = deLaIa(ultimo) ? marcaDeFicha(ultimo) : null;
  if (marca && haceMenosDe(ultimo, 120000, ahora)) {
    return Number(marca.paso) >= Number(marca.de) ? 'terminada' : 'enviando';
  }
  return iaEnviandoPorMensajes(mensajes, ahora) ? 'enviando' : null;
}

/**
 * Cuanto tiene que llevar la IA sin mandar nada para dar la ficha por
 * terminada (23/10). Entre un archivo y el siguiente hay huecos (se sube el
 * video antes de mandarlo): sin este margen el aviso se cerraba y abria, y
 * salia "terminó" tras cada archivo.
 */
export const ESPERA_FIN_AVISO_MS = 15000;

/**
 * El aviso de abajo para una ficha: se abre una vez, y "terminó" sale una
 * sola vez: al momento si se sabe que salio la ultima pieza ('terminada'), o
 * cuando lleva ESPERA_FIN_AVISO_MS sin enviarse nada. `actualizar` se llama
 * con 'enviando', 'terminada' o null; `cancelar`, al cambiar de chat (cierra
 * sin decir nada).
 */
export function seguirEnvioDeLaIa({
  abrir,
  cerrar,
  espera = ESPERA_FIN_AVISO_MS,
  temporizador = { poner: setTimeout, quitar: clearTimeout },
}) {
  let abierto = false;
  let fin = null;
  const quitarFin = () => {
    if (fin) temporizador.quitar(fin);
    fin = null;
  };
  return {
    actualizar(estado) {
      if (estado === 'enviando') {
        quitarFin();
        if (!abierto) {
          abierto = true;
          abrir();
        }
        return;
      }
      if (estado === 'terminada') {
        quitarFin();
        if (abierto) {
          abierto = false;
          cerrar(true);
        }
        return;
      }
      if (!abierto || fin) return;
      fin = temporizador.poner(() => {
        fin = null;
        abierto = false;
        cerrar(true);
      }, espera);
    },
    cancelar() {
      quitarFin();
      if (abierto) cerrar(false);
      abierto = false;
    },
  };
}
