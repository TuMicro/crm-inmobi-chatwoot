// [turuta] Colores de etapa (16/11, MadHouse, opcion A): cada chat de la lista
// se tine con el color de la etapa de su lead.
//
// Hay dos colores por etapa. El del equipo lo guarda nuestra API y lo elige un
// administrador en Ajustes -> Colores de etapa. El de cada persona va en sus
// ui_settings de Chatwoot (Perfil -> Mis colores de etapa), que viajan con su
// cuenta y no con el navegador. Manda el suyo; si no tiene, el del equipo; si
// tampoco hay, el chat se ve como siempre.
//
// El color se busca por el CODIGO de la etapa (crm_stage, que nuestra API
// escribe en cada conversacion), no por su nombre: renombrar una etapa no le
// quita el color.
import { computed, ref, unref, watch } from 'vue';
import { useStore } from 'vuex';
import { leadAppConfig } from './leadApp';
import './coloresDeEtapa.css';

/** La clave de los colores propios en los ui_settings del usuario. */
export const CLAVE_PERSONAL = 'turuta_colores_etapa';
/** Un color propio que dice "esta etapa, para mi, sin color". */
export const NINGUNO = 'ninguno';
/** La clave de la intensidad propia en los ui_settings del usuario. */
export const CLAVE_INTENSIDAD = 'turuta_intensidad_etapa';

/**
 * La intensidad del tinte (17/11) multiplica la transparencia que deja leer
 * el texto: 1 es la de por defecto. Va de 0.5 a 2, igual que en la API.
 */
export const INTENSIDAD = { minima: 0.5, maxima: 2, paso: 0.25 };

/** De 0.5 a 2, redondeada a 0.05; null es la de por defecto (1). Igual que la API. */
export function normalizarIntensidad(valor) {
  if (valor === null) return null;
  const n = typeof valor === 'string' && valor.trim() ? Number(valor) : valor;
  if (
    typeof n !== 'number' ||
    !Number.isFinite(n) ||
    n < INTENSIDAD.minima ||
    n > INTENSIDAD.maxima
  )
    return undefined;
  const redondeada = Math.round(n * 20) / 20;
  return redondeada === 1 ? null : redondeada;
}

/** La que se usa: la propia; si no, la del equipo; si no, 1. */
export const intensidadEfectiva = (propia, delEquipo) =>
  normalizarIntensidad(propia) ?? normalizarIntensidad(delEquipo) ?? 1;

/** Los que se ofrecen de entrada; con el selector se puede elegir cualquier otro. */
export const PALETA = [
  { nombre: 'Amarillo', color: '#F2C230' },
  { nombre: 'Naranja', color: '#F97316' },
  { nombre: 'Rojo', color: '#EF4444' },
  { nombre: 'Rosa', color: '#EC4899' },
  { nombre: 'Morado', color: '#A855F7' },
  { nombre: 'Azul', color: '#3B82F6' },
  { nombre: 'Celeste', color: '#06B6D4' },
  { nombre: 'Verde lima', color: '#A3E635' },
  { nombre: 'Verde intenso', color: '#16883F' },
  { nombre: 'Gris', color: '#78716C' },
];

/** "#RRGGBB"; null si es "sin color"; undefined si no es un color. Igual que la API. */
export function normalizarColor(valor) {
  if (valor === null) return null;
  if (typeof valor !== 'string') return undefined;
  const texto = valor.trim().toLowerCase();
  if (texto === '' || texto === NINGUNO) return null;
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(texto);
  if (!m) return undefined;
  const hex =
    m[1].length === 3
      ? m[1]
          .split('')
          .map(c => c + c)
          .join('')
      : m[1];
  return `#${hex.toUpperCase()}`;
}

/** El color de una etapa para esta persona: el suyo, si no el del equipo. */
export function colorDeEtapa(codigo, equipo, personales) {
  if (!codigo) return null;
  const propio = personales?.[codigo];
  if (propio === NINGUNO) return null;
  return normalizarColor(propio) || normalizarColor(equipo?.[codigo]) || null;
}

/** Los colores del equipo de cada etapa: { codigo: "#RRGGBB" | null }. */
export const coloresDelEquipo = etapas =>
  Object.fromEntries(
    (etapas || []).map(e => [e.codigo, normalizarColor(e.color) || null])
  );

/** Lo que cambio en Ajustes respecto a lo guardado: lo que se manda a la API. */
export function cambiosDelEquipo(borrador, guardado) {
  return Object.fromEntries(
    Object.entries(borrador || {}).filter(
      ([codigo, color]) =>
        (normalizarColor(color) || null) !== (guardado?.[codigo] || null)
    )
  );
}

/** Los propios tal como se guardan: solo colores validos o NINGUNO. */
export function propiosParaGuardar(borrador) {
  return Object.fromEntries(
    Object.entries(borrador || {})
      .map(([codigo, valor]) => [
        codigo,
        valor === NINGUNO ? NINGUNO : normalizarColor(valor),
      ])
      .filter(([, valor]) => valor)
  );
}

/** Si dos juegos de colores propios dicen lo mismo. */
export const mismosPropios = (a, b) => {
  const x = propiosParaGuardar(a);
  const y = propiosParaGuardar(b);
  const claves = new Set([...Object.keys(x), ...Object.keys(y)]);
  return [...claves].every(c => x[c] === y[c]);
};

// ------------------------------------------------------------- contraste

const rgb = hex => {
  const n = parseInt(normalizarColor(hex).slice(1), 16);
  // eslint-disable-next-line no-bitwise
  return [n >> 16, (n >> 8) & 255, n & 255];
};

const luminancia = ([r, g, b]) => {
  const lin = v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** Contraste WCAG 2 entre dos colores [r, g, b]. */
export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** El color que se ve al poner `color` con transparencia `alfa` sobre `fondo`. */
export function mezclar(fondo, color, alfa) {
  return fondo.map((f, i) => Math.round(f * (1 - alfa) + color[i] * alfa));
}

/**
 * Cada tema: el fondo de la lista y el texto mas claro de la tarjeta (la
 * vista previa del mensaje, slate-11), de _next-colors.scss. Se toma el fondo
 * menos favorable de los dos que puede tener la lista. Y la transparencia que
 * se busca: la normal y la del chat abierto o bajo el cursor.
 */
export const TEMAS = {
  claro: {
    fondo: [247, 247, 247],
    texto: [96, 100, 108],
    alfa: 0.2,
    alfaFuerte: 0.3,
  },
  oscuro: {
    fondo: [28, 29, 32],
    texto: [176, 180, 186],
    alfa: 0.24,
    alfaFuerte: 0.34,
  },
};

/** WCAG AA para texto normal. */
export const CONTRASTE_MINIMO = 4.5;

/**
 * La mayor transparencia, hasta `maximo`, con la que el texto de la tarjeta
 * sigue leyendose (CONTRASTE_MINIMO). Con un color claro o medio se queda en
 * `maximo`; uno muy oscuro en tema claro, o muy claro en oscuro, se aclara solo.
 */
export function alfaLegible(hex, tema, maximo) {
  const { fondo, texto } = TEMAS[tema];
  const color = rgb(hex);
  for (
    let centesimas = Math.round(maximo * 100);
    centesimas > 0;
    centesimas -= 1
  ) {
    const alfa = centesimas / 100;
    if (contraste(texto, mezclar(fondo, color, alfa)) >= CONTRASTE_MINIMO)
      return alfa;
  }
  return 0;
}

const rgba = (hex, alfa) => `rgba(${rgb(hex).join(', ')}, ${alfa})`;
const tintes = new Map();

/** Por mucha intensidad que se pida, el tinte no pasa de aqui. */
export const ALFA_TOPE = 0.6;

/** La transparencia de un color en un tema, con la intensidad aplicada. */
export function alfaCon(hex, tema, maximo, intensidad = 1) {
  const alfa = alfaLegible(hex, tema, maximo) * intensidad;
  return Math.min(ALFA_TOPE, Math.round(alfa * 100) / 100);
}

/**
 * Si con esa intensidad el texto de la tarjeta se sigue leyendo bien en los
 * dos temas. Con la de por defecto, siempre; mas fuerte, depende del color.
 */
export function legibleCon(hex, intensidad = 1) {
  const color = normalizarColor(hex);
  if (!color) return true;
  return Object.entries(TEMAS).every(
    ([tema, { fondo, texto, alfa }]) =>
      contraste(
        texto,
        mezclar(fondo, rgb(color), alfaCon(color, tema, alfa, intensidad))
      ) >= CONTRASTE_MINIMO
  );
}

/** Las variables CSS del tinte de un color (coloresDeEtapa.css). */
export function tinte(hex, intensidad = 1) {
  const color = normalizarColor(hex);
  if (!color) return {};
  const clave = `${color}|${intensidad}`;
  if (!tintes.has(clave)) {
    const t = {};
    Object.entries(TEMAS).forEach(([tema, { alfa, alfaFuerte }]) => {
      t[`--te-${tema}`] = rgba(color, alfaCon(color, tema, alfa, intensidad));
      t[`--te-${tema}-fuerte`] = rgba(
        color,
        alfaCon(color, tema, alfaFuerte, intensidad)
      );
    });
    t['--te-borde'] = color;
    tintes.set(clave, t);
  }
  return tintes.get(clave);
}

// ---------------------------------------------------------------- estado

/** Las etapas de la cuenta, en orden: [{ codigo, nombre, color }]. */
const etapas = ref([]);
/** La intensidad del equipo (1, la de por defecto). */
const intensidadEquipo = ref(1);
/** El color del equipo de cada etapa: { codigo: "#RRGGBB" }. */
const equipo = computed(() =>
  Object.fromEntries(
    etapas.value.filter(e => e.color).map(e => [e.codigo, e.color])
  )
);

let pedido = null;
let ultimaCarga = 0;
let iniciado = false;
let configActual = null;
let cuentaActual = null;

async function pedir(config, ruta, opciones = {}) {
  const r = await fetch(`${config.api}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...(opciones.headers || {}),
    },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.message || 'No se pudo completar');
  return body;
}

/** Trae los colores del equipo. Una sola peticion a la vez. */
export function cargarEtapas() {
  if (!configActual || !cuentaActual) return Promise.resolve();
  if (pedido) return pedido;
  pedido = pedir(
    configActual,
    `/dashboard-app/etapas?accountId=${cuentaActual}`
  )
    .then(body => {
      etapas.value = body.etapas || [];
      intensidadEquipo.value = body.intensidad ?? 1;
      ultimaCarga = Date.now();
    })
    .catch(() => {
      // Sin colores la lista se ve como siempre; se reintenta al volver.
    })
    .finally(() => {
      pedido = null;
    });
  return pedido;
}

/**
 * Una vez por pagina: carga los colores del equipo en cuanto se sabe a que
 * API llamar, y los refresca al volver a la pestana (como mucho cada minuto),
 * para que un cambio del administrador llegue sin recargar.
 */
function iniciar(store) {
  if (iniciado) return;
  iniciado = true;
  const apps = () => store.getters['dashboardApps/getRecords'];
  if (!leadAppConfig(apps()))
    store.dispatch('dashboardApps/get').catch(() => {});
  watch(
    () => [leadAppConfig(apps()), store.getters.getCurrentAccountId],
    ([config, cuenta]) => {
      if (!config || !cuenta) return;
      configActual = config;
      cuentaActual = cuenta;
      cargarEtapas();
    },
    { immediate: true }
  );
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible' &&
      Date.now() - ultimaCarga > 60000
    ) {
      cargarEtapas();
    }
  });
}

/**
 * Para la tarjeta de cada chat: la clase y las variables de su tinte. Es
 * barato: el estado es uno para toda la pagina.
 */
const SIN_TINTE = { clase: '', estilo: {} };

export function useTinteDeEtapa(codigo) {
  const store = useStore();
  // Sin store (las pruebas de Chatwoot montan la tarjeta sola) no hay colores.
  if (!store) return computed(() => SIN_TINTE);
  iniciar(store);
  return computed(() => {
    const ui = store.getters.getUISettings || {};
    const color = colorDeEtapa(unref(codigo), equipo.value, ui[CLAVE_PERSONAL]);
    if (!color) return SIN_TINTE;
    const intensidad = intensidadEfectiva(
      ui[CLAVE_INTENSIDAD],
      intensidadEquipo.value
    );
    return { clase: 'turuta-tinte', estilo: tinte(color, intensidad) };
  });
}

/** Para las pantallas de Ajustes y del Perfil. */
export function useColoresDeEtapa() {
  const store = useStore();
  iniciar(store);
  const personales = computed(
    () => store.getters.getUISettings?.[CLAVE_PERSONAL] || {}
  );
  /** La intensidad propia; null, la del equipo. */
  const intensidadPersonal = computed(
    () =>
      normalizarIntensidad(store.getters.getUISettings?.[CLAVE_INTENSIDAD]) ??
      null
  );

  /**
   * Guarda lo del equipo: los colores que cambiaron y, si cambio, la
   * intensidad. Solo un administrador: lo comprueba la API.
   */
  async function guardarEquipo({ colores, intensidad } = {}) {
    if (!configActual) throw new Error('Falta la configuracion del panel');
    const usuario = store.getters.getCurrentUser;
    const cambios = { accountId: Number(cuentaActual) };
    if (colores && Object.keys(colores).length) cambios.colores = colores;
    if (intensidad !== undefined) cambios.intensidad = intensidad;
    const body = await pedir(configActual, '/dashboard-app/etapas/colores', {
      method: 'PUT',
      headers: { 'X-Chatwoot-Usuario': usuario?.access_token || '' },
      body: JSON.stringify(cambios),
    });
    etapas.value = body.etapas || etapas.value;
    intensidadEquipo.value = body.intensidad ?? intensidadEquipo.value;
  }

  /**
   * Guarda lo propio: { codigo: "#RRGGBB" | NINGUNO } y la intensidad (null,
   * la del equipo).
   */
  async function guardarPersonales(colores, intensidad = null) {
    const actuales = store.getters.getUISettings || {};
    await store.dispatch('updateUISettings', {
      uiSettings: {
        ...actuales,
        [CLAVE_PERSONAL]: colores,
        [CLAVE_INTENSIDAD]: normalizarIntensidad(intensidad) ?? null,
      },
    });
  }

  return {
    etapas,
    equipo,
    personales,
    intensidadEquipo,
    intensidadPersonal,
    cargarEtapas,
    guardarEquipo,
    guardarPersonales,
  };
}
