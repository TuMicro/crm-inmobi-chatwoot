// [turuta] Mensajes masivos (25/11): la misma plantilla aprobada de WhatsApp a
// todos los chats que cumplen un filtro (MensajesMasivosPage.vue), contra
// nuestra API (dashboard-app/difusiones). Aqui, lo que no pinta: se prueba en
// mensajesMasivos.spec.js.
//
// El filtro es el de la lista de chats. La consulta que se manda es la misma
// que arma ChatList.vue: las filas en snake_case por filterQueryGenerator.
import snakecaseKeys from 'snakecase-keys';
import filterQueryGenerator from 'dashboard/helper/filterQueryGenerator';

/** Lo que hay que escribir para lanzar un envio. */
export const CONFIRMACION = 'ENVIAR';

/** Lo que se escribe en un campo de la plantilla para poner el nombre. */
export const CAMPO_NOMBRE = '{nombre}';

/** Si una fila del filtro tiene con que filtrar. */
const conValor = fila => {
  const v = fila?.values;
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === 'object') return Object.keys(v).length > 0;
  return v !== '' && v !== null && v !== undefined;
};

/**
 * Las filas que cuentan: las que tienen valor, o un operador que no lo pide
 * ("esta presente"). Una fila vacia es la que se ofrece al abrir, sin tocar.
 */
export function filasConValor(filas, tipos) {
  return (filas || []).filter(fila => {
    const tipo = (tipos || []).find(t => t.attributeKey === fila.attributeKey);
    const operador = tipo?.filterOperators?.find(
      o => o.value === fila.filterOperator
    );
    return operador?.hasInput === false || conValor(fila);
  });
}

/** La consulta para el servidor: { payload: [...] }. Null sin filas. */
export function consultaDeFiltros(filas) {
  if (!filas?.length) return null;
  return filterQueryGenerator(
    snakecaseKeys(JSON.parse(JSON.stringify(filas)), { deep: true })
  );
}

const nombreDe = v => {
  if (v && typeof v === 'object') return v.name ?? v.id ?? '';
  return v ?? '';
};

const valoresDe = fila => {
  const v = fila.values;
  if (Array.isArray(v)) return v.map(nombreDe).join(', ');
  return String(nombreDe(v));
};

/**
 * El filtro como se lee: "Etapa del lead igual a Seguimiento y Etiquetas igual
 * a surco, miraflores". Se guarda con el envio, para saber despues a quien se
 * mando. `tipos` son los del dialogo de filtros (useConversationFilterContext).
 */
export function textoDeFiltros(filas, tipos, { y = 'y', o = 'o' } = {}) {
  return (filas || [])
    .map((fila, i) => {
      const tipo = (tipos || []).find(
        t => t.attributeKey === fila.attributeKey
      );
      const operador = tipo?.filterOperators?.find(
        op => op.value === fila.filterOperator
      );
      const partes = [
        tipo?.attributeName || fila.attributeKey,
        (operador?.label || fila.filterOperator || '').toLowerCase(),
        operador?.hasInput === false ? '' : valoresDe(fila),
      ].filter(Boolean);
      // El "y / o" de una fila esta guardado en la anterior.
      const union =
        i === 0 ? '' : `${filas[i - 1].queryOperator === 'or' ? o : y} `;
      return union + partes.join(' ');
    })
    .join(' ');
}

/** Si en los datos de la plantilla alguien escribio {nombre}. */
export function usaNombre(valor) {
  if (typeof valor === 'string')
    return /\{(nombre|nombre_completo)\}/i.test(valor);
  if (Array.isArray(valor)) return valor.some(usaNombre);
  if (valor && typeof valor === 'object')
    return Object.values(valor).some(usaNombre);
  return false;
}

/** Las plantillas de una bandeja, para el desplegable. */
export function opcionesDePlantilla(plantillas) {
  return (plantillas || []).map(p => ({
    value: `${p.name}|${p.language}`,
    label: `${p.name} (${p.language})`,
  }));
}

export const plantillaElegida = (plantillas, valor) =>
  (plantillas || []).find(p => `${p.name}|${p.language}` === valor) || null;

/** "unos 3 minutos": salen de cinco en cinco, unos 300 por minuto. */
export function cuantoTarda(personas) {
  const minutos = Math.ceil((personas || 0) / 300);
  if (minutos <= 1) return 'menos de un minuto';
  return `unos ${minutos} minutos`;
}

export const ESTADO_DE_ENVIO = {
  PENDING_APPROVAL: {
    texto: 'Espera aprobación',
    clase: 'bg-n-blue-3 text-n-blue-11',
  },
  REJECTED: { texto: 'No aprobado', clase: 'bg-n-ruby-3 text-n-ruby-11' },
  SENDING: { texto: 'Enviando', clase: 'bg-n-amber-3 text-n-amber-11' },
  DONE: { texto: 'Terminado', clase: 'bg-n-teal-3 text-n-teal-11' },
  CANCELLED: { texto: 'Cancelado', clase: 'bg-n-alpha-2 text-n-slate-11' },
};

export const ESTADO_DE_MENSAJE = {
  PENDING: { texto: 'En cola', clase: 'text-n-slate-10' },
  SENDING: { texto: 'Saliendo', clase: 'text-n-slate-10' },
  SENT: { texto: 'Enviado', clase: 'text-n-slate-12' },
  DELIVERED: { texto: 'Entregado', clase: 'text-n-teal-11' },
  READ: { texto: 'Leído', clase: 'text-n-blue-11' },
  FAILED: { texto: 'No llegó', clase: 'text-n-ruby-11' },
  CANCELLED: { texto: 'Cancelado', clase: 'text-n-slate-10' },
};

/** Cuantos mensajes de un envio ya no estan en cola, de 0 a 100. */
export function avance(envio) {
  const total = envio?.total || 0;
  if (!total) return 0;
  const quedan = envio?.conteos?.pendientes || 0;
  return Math.round(((total - quedan) / total) * 100);
}

/** "25 nov, 10:32", en la hora del navegador. */
export function fechaCorta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Las llamadas a nuestra API. `config` es la de la Dashboard App (leadApp.js)
 * y `usuario` el de Chatwoot: su token viaja aparte para que la API sepa
 * quien es (el del panel es compartido) y que chats puede alcanzar.
 */
export function clienteDeDifusion(config, usuario, accountId) {
  const pedir = async (path, init = {}) => {
    if (!config) throw new Error('No se pudo leer la configuración del CRM.');
    const r = await fetch(`${config.api}/dashboard-app/difusiones${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        'X-Chatwoot-Usuario': usuario?.access_token || '',
      },
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = Array.isArray(cuerpo.message)
        ? cuerpo.message.join('. ')
        : cuerpo.message;
      throw new Error(m || 'No se pudo completar.');
    }
    return cuerpo;
  };
  const cuenta = Number(accountId);
  const post = (path, datos) =>
    pedir(path, {
      method: 'POST',
      body: JSON.stringify({ accountId: cuenta, ...datos }),
    });
  return {
    lista: () => pedir(`?accountId=${cuenta}`),
    detalle: id => pedir(`/${id}?accountId=${cuenta}`),
    audiencia: (inboxId, filtros) => post('/audiencia', { inboxId, filtros }),
    audienciaDeLista: (inboxId, lista) =>
      post('/audiencia', { inboxId, lista }),
    crear: datos => post('', datos),
    cancelar: id => post(`/${id}/cancelar`, {}),
    aprobar: id => post(`/${id}/aprobar`, {}),
    rechazar: (id, razon) => post(`/${id}/rechazar`, { razon }),
    permiso: (agenteId, directo) =>
      pedir('/permisos', {
        method: 'PUT',
        body: JSON.stringify({ accountId: cuenta, agenteId, directo }),
      }),
  };
}

// ------------------------------------------------------------- el borrador
//
// Lo que se lleva escrito de un envio nuevo se guarda en la pestana
// (sessionStorage): si la pagina se vuelve a montar —se va a mirar un chat y se
// vuelve, o se recarga— el formulario sigue como estaba. No se guarda ni la
// lista de destinatarios (hay que volver a verla) ni la palabra ENVIAR.

const claveDeBorrador = accountId => `turuta_masivos_borrador_${accountId}`;

export function leerBorrador(accountId, almacen = window.sessionStorage) {
  try {
    const b = JSON.parse(almacen.getItem(claveDeBorrador(accountId)));
    return b && typeof b === 'object' ? b : null;
  } catch {
    return null;
  }
}

export function guardarBorrador(
  accountId,
  borrador,
  almacen = window.sessionStorage
) {
  try {
    if (borrador)
      almacen.setItem(claveDeBorrador(accountId), JSON.stringify(borrador));
    else almacen.removeItem(claveDeBorrador(accountId));
  } catch {
    // Sin sitio o sin permiso: el formulario funciona igual, solo no se guarda.
  }
}

/** Si en un borrador hay algo escrito que valga la pena recuperar. */
export function borradorConAlgo(b) {
  if (!b) return false;
  return !!(
    (b.lista || '').trim() ||
    (b.titulo || '').trim() ||
    b.plantilla ||
    (b.filas || []).some(f => {
      const v = f?.values;
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === 'object') return Object.keys(v).length > 0;
      return v !== '' && v !== null && v !== undefined;
    })
  );
}

/**
 * Pone en los campos de una plantilla (processed_params: cuerpo, cabecera,
 * botones) los valores que se habian escrito, EN EL SITIO: solo los campos que
 * la plantilla tiene ahora, y sin vaciar ninguno.
 */
export function volcarValores(campos, guardados) {
  if (!campos || typeof campos !== 'object') return;
  Object.keys(campos).forEach(k => {
    const g = guardados?.[k];
    if (campos[k] && typeof campos[k] === 'object') volcarValores(campos[k], g);
    else if (typeof g === 'string' && g !== '') campos[k] = g;
  });
}
