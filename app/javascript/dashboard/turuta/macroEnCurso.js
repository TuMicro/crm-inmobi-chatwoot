// [turuta] Aviso de una macro que DURA lo que dura la macro.
//
// Chatwoot encola la macro y responde al momento: su aviso de "ejecutada" sale
// cuando todavia no se ha enviado nada. Y desde que los mensajes salen en orden
// (app/services/macros/execution_service.rb) una macro con fotos tarda varios
// segundos. El servidor no avisa de cuando termina, asi que se deduce mirando
// el chat: la macro manda N mensajes, y acaba cuando el ultimo ya esta en el
// chat y WhatsApp lo acepto (o lo rechazo).
import { emitter } from 'shared/helpers/mitt';

const ACCIONES_QUE_ENVIAN = new Set(['send_message', 'send_attachment']);

const SALIENTE = 1;
// Cada mensaje espera al anterior hasta 15 s en el servidor; se deja margen.
const SEGUNDOS_POR_MENSAJE = 20;
const SEGUNDOS_DE_COLA = 10;
// Lo que se da de gracia al ultimo mensaje si WhatsApp no confirma.
const GRACIA_DEL_ULTIMO_MS = 8000;
const CADA_MS = 700;
// El aviso final: verde y breve (components/Snackbar.vue).
const EXITO = { turutaTipo: 'exito', duration: 2000 };

/** Cuantos mensajes al cliente manda la macro. Las notas privadas no cuentan. */
export const enviosDe = macro =>
  (macro?.actions || []).filter(a => ACCIONES_QUE_ENVIAN.has(a.action_name))
    .length;

export const topeMs = esperados =>
  (esperados * SEGUNDOS_POR_MENSAJE + SEGUNDOS_DE_COLA) * 1000;

/** Mensajes al cliente que este usuario ha mandado desde que lanzo la macro.
 *  created_at viene en segundos; se da un margen por el reloj del navegador. */
export function enviadosDesde(mensajes, { desdeMs, usuarioId }) {
  const desde = Math.floor(desdeMs / 1000) - 5;
  return (mensajes || []).filter(
    m =>
      m.message_type === SALIENTE &&
      !m.private &&
      m.created_at >= desde &&
      (!usuarioId || !m.sender?.id || m.sender.id === usuarioId)
  );
}

const resuelto = mensaje =>
  Boolean(mensaje.source_id) ||
  ['delivered', 'read', 'failed'].includes(mensaje.status);

/**
 * 'esperando' | 'terminada' | 'agotada'.
 * `ultimoVistoMs` es cuando aparecio en el chat el ultimo mensaje esperado.
 */
export function estadoDeLaMacro({
  esperados,
  enviados,
  inicioMs,
  ahoraMs,
  ultimoVistoMs,
}) {
  if (ahoraMs - inicioMs > topeMs(esperados)) return 'agotada';
  if (enviados.length < esperados) return 'esperando';
  if (resuelto(enviados[esperados - 1])) return 'terminada';
  if (ultimoVistoMs && ahoraMs - ultimoVistoMs > GRACIA_DEL_ULTIMO_MS) {
    return 'terminada';
  }
  return 'esperando';
}

/**
 * Ensena un aviso fijo mientras la macro corre y lo cambia por el final.
 * Si la macro no manda mensajes, el aviso de siempre y nada mas.
 */
export function seguirMacro({
  macro,
  leerMensajes,
  usuarioId,
  avisar,
  textoEnCurso,
  textoFinal,
  // false cuando el final no es un exito limpio (p. ej. no se pudo resolver).
  exito = true,
}) {
  const esperados = enviosDe(macro);
  const final = exito ? [textoFinal, EXITO] : [textoFinal];
  if (!esperados) {
    avisar(...final);
    return;
  }

  const clave = `macro-${macro.id}-${Date.now()}`;
  const inicioMs = Date.now();
  let ultimoVistoMs = null;
  avisar(textoEnCurso, { turutaClave: clave, duration: topeMs(esperados) });

  const reloj = setInterval(() => {
    const ahoraMs = Date.now();
    const enviados = enviadosDesde(leerMensajes(), {
      desdeMs: inicioMs,
      usuarioId,
    });
    if (enviados.length >= esperados && !ultimoVistoMs) ultimoVistoMs = ahoraMs;

    const estado = estadoDeLaMacro({
      esperados,
      enviados,
      inicioMs,
      ahoraMs,
      ultimoVistoMs,
    });
    if (estado === 'esperando') return;

    clearInterval(reloj);
    emitter.emit('turutaCerrarToast', clave);
    // Agotada: no se sabe como acabo, asi que no se afirma que termino.
    if (estado === 'terminada') avisar(...final);
  }, CADA_MS);
}
