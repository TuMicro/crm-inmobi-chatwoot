// [turuta] Descanso de un asesor con hora de vuelta. Lo guarda NUESTRA API
// (services/api, assignment/break.logic.ts): mientras dura, el reparto no le da
// leads nuevos. Se acaba solo. Aqui vive el estado compartido por todas las
// filas de Ajustes > Agentes, para pedir la lista una vez y no una por fila.
import { ref } from 'vue';

export const OPCIONES_DESCANSO = [
  { minutos: 30, texto: '30 minutos' },
  { minutos: 60, texto: '1 hora' },
  { minutos: 120, texto: '2 horas' },
  { minutos: 240, texto: '4 horas' },
];

/** Minutos que faltan para las 23:59 de hoy, en la hora del navegador. */
export function minutosHastaFinDelDia(ahora = new Date()) {
  const fin = new Date(ahora);
  fin.setHours(23, 59, 0, 0);
  return Math.max(1, Math.round((fin.getTime() - ahora.getTime()) / 60000));
}

const hora = fecha =>
  fecha.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

/** Texto de la pastilla de la fila. Vacio si no esta en descanso.
 *  Se vuelve a mirar la hora aqui aunque la API ya lo diga: la pagina puede
 *  llevar abierta un rato y el descanso haberse acabado entre tanto. */
export function textoDescanso(descanso, ahora = new Date()) {
  if (!descanso?.enDescanso) return '';
  if (descanso.indefinido) return 'En pausa, sin hora de vuelta';

  const hasta = new Date(descanso.hasta);
  if (Number.isNaN(hasta.getTime()) || hasta.getTime() <= ahora.getTime()) {
    return '';
  }
  if (hasta.toDateString() === ahora.toDateString()) {
    return `En descanso hasta las ${hora(hasta)}`;
  }
  const dia = hasta.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  });
  return `En descanso hasta el ${dia}, ${hora(hasta)}`;
}

/** Cuerpo de la peticion para una opcion del menu. */
export function peticionDeDescanso(opcion, ahora = new Date()) {
  if (opcion === 'indefinido') return { indefinido: true };
  if (opcion === 'hoy') return { minutos: minutosHastaFinDelDia(ahora) };
  return { minutos: Number(opcion) };
}

// ------------------------------------------------------------------ estado

// chatwootAgentId -> { enDescanso, hasta, indefinido }
const descansos = ref({});
let carga = null;
let cuentaCargada = null;

async function pedir(config, ruta, opciones = {}) {
  const r = await fetch(`${config.api}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  });
  if (r.status === 404) throw new Error('sin-asesor');
  if (!r.ok) throw new Error('red');
  return r.json();
}

function cargar(config, accountId) {
  if (carga && cuentaCargada === accountId) return carga;
  cuentaCargada = accountId;
  carga = pedir(config, `/dashboard-app/advisors?accountId=${accountId}`)
    .then(body => {
      descansos.value = Object.fromEntries(
        (body.asesores || [])
          .filter(a => a.chatwootAgentId != null)
          .map(a => [a.chatwootAgentId, a.descanso])
      );
    })
    .catch(e => {
      carga = null; // que el siguiente montaje lo reintente
      throw e;
    });
  return carga;
}

async function poner(config, accountId, chatwootAgentId, opcion) {
  const body = await pedir(config, '/dashboard-app/advisors/break', {
    method: 'PUT',
    body: JSON.stringify({
      accountId: Number(accountId),
      chatwootAgentId,
      ...peticionDeDescanso(opcion),
    }),
  });
  descansos.value = { ...descansos.value, [chatwootAgentId]: body.descanso };
}

async function quitar(config, accountId, chatwootAgentId) {
  const body = await pedir(
    config,
    `/dashboard-app/advisors/break?accountId=${accountId}&chatwootAgentId=${chatwootAgentId}`,
    { method: 'DELETE' }
  );
  descansos.value = { ...descansos.value, [chatwootAgentId]: body.descanso };
}

export function useDescansos() {
  return { descansos, cargar, poner, quitar };
}
