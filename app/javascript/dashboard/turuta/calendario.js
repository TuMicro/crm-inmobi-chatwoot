// [turuta] Google Calendar (docs/18 del repo crm-inmobi): lo que dicen la
// ficha del lead y la pagina "Calendario". Cada persona del equipo conecta su
// cuenta de Google y sus visitas se ponen tambien ahi. Las reglas de verdad
// estan en nuestra API (calendario.logic.ts); esto es lo que se ve antes de
// mandarlo. Funciones puras: se prueban en calendario.spec.js.

/** Como mucho, correos invitados por visita (igual que en la API). */
export const MAX_INVITADOS = 10;

const CORREO = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]{2,}$/;

/**
 * Los correos tal como se escriben en el formulario: separados por comas,
 * espacios, punto y coma o saltos de linea. Sin repetidos y en minusculas. Los
 * que no parecen un correo van en `malos`.
 */
export function correosDe(entrada) {
  const trozos = (
    Array.isArray(entrada)
      ? entrada.map(String)
      : String(entrada ?? '').split(/[\s,;]+/)
  )
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
  const correos = [];
  const malos = [];
  trozos.forEach(t => {
    if (!CORREO.test(t)) malos.push(t);
    else if (!correos.includes(t)) correos.push(t);
  });
  return { correos, malos };
}

/** Lo que se le dice a quien escribe los invitados; '' si esta bien. */
export function errorDeInvitados(texto) {
  const { correos, malos } = correosDe(texto);
  if (malos.length) {
    return `No parece un correo: ${malos.slice(0, 3).join(', ')}`;
  }
  if (correos.length > MAX_INVITADOS) {
    return `Como mucho ${MAX_INVITADOS} correos.`;
  }
  return '';
}

/**
 * En el calendario de quien va a caer la visita, ANTES de agendarla: el del
 * asesor asignado si lo tiene conectado; si no, el de quien agenda; si
 * tampoco, el de quien recibe copia de todas las visitas, si lo conecto.
 * `calendario` es lead.calendario ({ conectados, asesorAgentId, respaldo,
 * copia }) y `miId` el usuario que tiene la ficha abierta. Devuelve 'mio',
 * 'asesor', 'respaldo' o null (nadie lo tiene conectado, o el servidor no lo
 * tiene configurado).
 */
export function destinoDeLaVisita(calendario, miId) {
  if (!calendario) return null;
  const conectados = calendario.conectados || [];
  const asesor = calendario.asesorAgentId;
  if (asesor != null && conectados.includes(asesor)) {
    return asesor === miId ? 'mio' : 'asesor';
  }
  if (miId != null && conectados.includes(miId)) return 'mio';
  return calendario.respaldo ? 'respaldo' : null;
}

/**
 * La frase del formulario: donde se pone la visita. `nombres` trae el del
 * asesor y el de quien recibe la copia (lead.calendario.respaldo).
 */
export function textoDelDestino(destino, nombres = {}) {
  if (destino === 'mio') return 'Se pone también en tu Google Calendar.';
  if (destino === 'asesor') {
    return `Se pone también en el Google Calendar de ${nombres.asesor || 'su asesor'}.`;
  }
  if (destino === 'respaldo') {
    return `Se pone también en el Google Calendar de ${nombres.respaldo}, que recibe copia de todas.`;
  }
  return '';
}

/** Quienes reciben copia de todas las visitas, en una frase; '' si nadie. */
export function textoCopia(copia) {
  return copia?.length
    ? `Copia de todas las visitas: ${copia.join(', ')}.`
    : '';
}

/**
 * La linea de la visita ya agendada: en que calendario esta, o por que no.
 * `c` es lead.visita.calendario; null si el servidor no lo tiene configurado.
 */
export function textoCalendario(c) {
  if (!c) return '';
  const de = c.de ? ` de ${c.de}` : '';
  switch (c.estado) {
    case 'ok':
      return `En el Google Calendar${de}.`;
    case 'pendiente':
      return `Poniéndola en el Google Calendar${de}…`;
    case 'error':
      return `No se pudo poner en el Google Calendar${de}: ${c.error || 'sin detalle'}`;
    default:
      return 'No está en Google Calendar: ni su asesor ni quien la agendó lo tienen conectado.';
  }
}

const FALLOS = {
  cancelado: 'No se conectó: cancelaste en la pantalla de Google.',
  caducado: 'El enlace caducó. Pulsa «Conectar con Google» otra vez.',
};

/**
 * El aviso al volver de Google: nuestra API devuelve a la pagina con
 * ?calendario=conectado o ?calendario=error&detalle=... Null si no viene de ahi.
 */
export function avisoDeVuelta(query) {
  const resultado = query?.calendario;
  if (resultado === 'conectado') {
    return {
      ok: true,
      texto: 'Listo: tu Google Calendar quedó conectado.',
    };
  }
  if (resultado === 'error') {
    return {
      ok: false,
      texto:
        FALLOS[query.detalle] ||
        'Google no completó la conexión. Inténtalo otra vez.',
    };
  }
  return null;
}
