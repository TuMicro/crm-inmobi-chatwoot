// [turuta] La hora de un campo ("HH:mm", lo mismo que da un <input
// type="time">) por partes, para elegirla con nuestro desplegable
// (CampoHora.vue). Funciones puras: hora.spec.js.

export const HORAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
/** De cinco en cinco: casi todas las visitas son a una hora redonda. */
export const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const dosDigitos = n => String(n).padStart(2, '0');

/** "13:05" -> { hora: 1, minuto: 5, pm: true }. Null si no es una hora. */
export function partesDeHora(valor) {
  const m = /^(\d{1,2}):(\d{2})/.exec(valor || '');
  if (!m) return null;
  const h = Number(m[1]);
  const minuto = Number(m[2]);
  if (h > 23 || minuto > 59) return null;
  return { hora: h % 12 || 12, minuto, pm: h >= 12 };
}

/** Al reves: { hora: 12, minuto: 0, pm: false } -> "00:00". */
export function horaDesdePartes({ hora, minuto, pm }) {
  return `${dosDigitos((hora % 12) + (pm ? 12 : 0))}:${dosDigitos(minuto)}`;
}

/** "1:05 p. m.", como el resto de la ficha. Vacio si no hay hora. */
export function textoHora(valor) {
  const p = partesDeHora(valor);
  if (!p) return '';
  return `${p.hora}:${dosDigitos(p.minuto)} ${p.pm ? 'p. m.' : 'a. m.'}`;
}

/**
 * Mientras no se diga a. m. o p. m.: las visitas son de dia, asi que de 8 a
 * 11 es por la manana y de 12 a 7, por la tarde.
 */
export const esPmPorDefecto = hora => hora === 12 || hora < 8;

/** Los minutos a ofrecer: los de siempre y, si no es uno de ellos, el que ya
 *  tenia la hora (una visita puesta a las 10:37 no se redondea sola). */
export function minutosConEl(minuto) {
  if (MINUTOS.includes(minuto)) return MINUTOS;
  return [...MINUTOS, minuto].sort((a, b) => a - b);
}
