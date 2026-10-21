// [turuta] Cuantas horas antes de la visita le llega al lead el recordatorio
// por WhatsApp: lo elige quien agenda, para esa visita (21/10; antes eran
// siempre 2). La regla de verdad esta en nuestra API (visits.logic.ts); esto
// es lo que el formulario dice antes de guardar. Funciones puras:
// recordatorio.spec.js.

export const HORAS_POR_DEFECTO = 2;
export const MIN_HORAS = 1;
export const MAX_HORAS = 72;

const HORA_MS = 60 * 60 * 1000;

/** Las horas escritas, si valen (entero de 1 a 72). Null si no. */
export function horasValidas(valor) {
  const n = typeof valor === 'string' && valor.trim() ? Number(valor) : valor;
  return Number.isInteger(n) && n >= MIN_HORAS && n <= MAX_HORAS ? n : null;
}

/** "2026-10-21" en esa zona: para saber si dos momentos caen el mismo dia. */
const diaEn = (fecha, zona) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);

/** "el jueves 22, 1:05 p. m.", en esa zona. */
const cuandoEn = (fecha, zona) =>
  `el ${new Intl.DateTimeFormat('es-PE', {
    timeZone: zona,
    weekday: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(fecha)
    .replace(/\s+/g, ' ')}`;

/**
 * Lo que el formulario dice del recordatorio, o null si no hay nada que decir
 * todavia (sin fecha y hora). `error` no deja guardar.
 *
 * - Horas que no valen: error.
 * - La visita es antes de esas horas: no se mandara (como siempre).
 * - Saldria un dia antes que la visita y su plantilla no esta aprobada en
 *   Meta: error, porque la de siempre dice "tu visita de hoy".
 * - Si no, cuando sale.
 */
export function avisoDelRecordatorio({
  visitaIso,
  horas,
  ahora = new Date(),
  zona = 'America/Lima',
  plantillaDelDia = false,
}) {
  const h = horasValidas(horas);
  if (h === null) {
    return {
      error: true,
      texto: `Entre ${MIN_HORAS} y ${MAX_HORAS} horas.`,
    };
  }
  if (!visitaIso) return null;
  const visita = new Date(visitaIso);
  const sale = new Date(visita.getTime() - h * HORA_MS);
  if (sale.getTime() < ahora.getTime()) {
    return {
      error: false,
      texto: `La visita es dentro de menos de ${h} h: no se enviará recordatorio.`,
    };
  }
  if (diaEn(sale, zona) !== diaEn(visita, zona) && !plantillaDelDia) {
    return {
      error: true,
      texto:
        `Con ${h} h saldría el día anterior a la visita, y para eso falta que ` +
        'Meta apruebe la plantilla del recordatorio del día anterior. Elige menos horas.',
    };
  }
  const cuando = cuandoEn(sale, zona);
  // "p. m." ya termina en punto.
  return {
    error: false,
    texto: `Le llegará ${cuando}${cuando.endsWith('.') ? '' : '.'}`,
  };
}
