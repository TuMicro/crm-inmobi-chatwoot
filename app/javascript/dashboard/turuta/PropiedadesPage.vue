<script setup>
// [turuta] Pagina "Propiedades": lo que la IA manda y sabe de cada propiedad.
// La lista sale de las webs del cliente (nuestra API la lee de Supabase) y por
// cada una el equipo decide que manda la IA (la ficha con sus fotos, videos,
// PDF, enlace y ubicacion, o una macro de Chatwoot) y lo que sabe para
// responder (estado,
// negociacion, horario, condiciones, notas y datos confirmados).
//
// Misma envoltura que la pagina Embudo (cabecera de informe, tarjetas) y los
// componentes de Chatwoot (TabBar, Input), para que no se note el salto y el
// tema oscuro salga solo. Los calculos viven en propiedades.js.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import TabBar from 'dashboard/components-next/tabbar/TabBar.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import CampoSelect from './CampoSelect.vue';
import { leadAppConfig, textoError } from './leadApp';
import {
  ACEPTA_ARCHIVOS,
  ESTADOS,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  ICONO_DE_ARCHIVO,
  MAX_ARCHIVOS,
  NEGOCIABLES,
  MAX_PIEZAS,
  QUE_HACE_EL_ESTADO,
  cuerpoDe,
  estadoMacroAsesores,
  fichaEsGenerada,
  filtrar,
  formularioDe,
  hayCambios,
  indicadores,
  opcionesDeEstado,
  ordenar,
  origen,
  precioTexto,
  resumen,
  subtitulo,
  textoDeWeb,
  problemaConElArchivo,
  resumenCortoDeMacro,
  tamanoLegible,
  tipoDeArchivo,
  vistaPrevia,
  websParaElegir,
} from './propiedades';

const route = useRoute();
const router = useRouter();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const currentUser = useMapGetter('getCurrentUser');
const rol = useMapGetter('getCurrentRole');
const esAdmin = computed(() => rol.value === 'administrator');
const config = computed(() => leadAppConfig(apps.value));

const datos = ref(null);
const cargando = ref(false);
const error = ref(null);
const guardando = ref(false);

const busqueda = ref('');

// Las fotos, videos y PDF que se suben desde la PC: una cola, de uno en uno.
// Cada subida recuerda su propiedad: si el equipo cambia de propiedad, sigue.
const subidas = ref([]);
const erroresSubida = ref([]);
const arrastrando = ref(false);
const moviendo = ref(false);
let siguienteSubida = 0;
let procesando = false;
const web = ref('');
const estado = ref('');
const elegidaId = ref(null);
const form = ref(null);

// Las macros de la cuenta (para usar una como ficha) y las webs conectadas.
const macros = ref([]);
const webs = ref([]);
const verWebs = ref(false);
const guardandoWebs = ref(false);

async function pedir(path, init = {}) {
  const cfg = config.value;
  if (!cfg) throw new Error('config');
  const r = await fetch(cfg.api + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (r.status === 401) throw new Error('auth');
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.message || 'network');
  return cuerpo;
}

const propiedades = computed(() => datos.value?.propiedades || []);
const sitios = computed(() => datos.value?.sitios || []);
const cifras = computed(() => resumen(propiedades.value));
const lista = computed(() =>
  ordenar(
    filtrar(propiedades.value, {
      texto: busqueda.value,
      site: web.value,
      estado: estado.value,
    })
  )
);
const elegida = computed(
  () => propiedades.value.find(p => p.id === elegidaId.value) || null
);
const sinGuardar = computed(() => hayCambios(form.value, elegida.value));
// Lo que va tras la ficha: archivos, textos y la ubicacion. Se guarda al
// momento, pieza a pieza; los textos, al salir del campo.
const piezas = computed(() => elegida.value?.piezas || []);
const archivos = computed(() => elegida.value?.archivos || []);
const borradores = ref({});
const nuevoTexto = ref(null);
const hayUbicacion = computed(() =>
  piezas.value.some(x => x.tipo === 'ubicacion')
);
const deLaElegida = x =>
  x.site === elegida.value?.site && x.propertyId === elegida.value?.id;
const subidasDeEsta = computed(() => subidas.value.filter(deLaElegida));
const erroresDeEsta = computed(() => erroresSubida.value.filter(deLaElegida));
const cabePieza = computed(
  () => piezas.value.length + subidasDeEsta.value.length < MAX_PIEZAS
);
const cabeMas = computed(
  () =>
    cabePieza.value &&
    archivos.value.length + subidasDeEsta.value.length < MAX_ARCHIVOS
);

// La macro para los asesores: lo mismo que manda la IA, como macro de Chatwoot.
const guardandoMacro = ref(false);
const cajaMacro = computed(() =>
  estadoMacroAsesores(elegida.value, {
    macros: macros.value,
    sinGuardar: sinGuardar.value,
    subiendo: subidasDeEsta.value.length > 0,
  })
);
const generada = computed(() => fichaEsGenerada(form.value, elegida.value));
const macroDeId = id =>
  macros.value.find(m => id && String(m.id) === String(id)) || null;
// La macro enlazada para los asesores, y la que la IA manda en vez de la
// ficha si se eligio antes en la pestaña Macro (ya no existe: se carga aqui).
const macroEnlazada = computed(() => macroDeId(elegida.value?.macroAsesoresId));
const macroQueMandaLaIA = computed(() => macroDeId(elegida.value?.macroId));
const burbujas = computed(() =>
  form.value ? vistaPrevia(form.value, elegida.value, borradores.value) : []
);
const websConectadas = computed(() => webs.value.filter(w => w.conectada));

// Pestañas: el filtro por web.
const pestanasWeb = computed(() => [
  { label: textoDeWeb(''), site: '' },
  ...sitios.value.map(s => ({ label: textoDeWeb(s), site: s })),
]);
const pestanaWeb = computed(() =>
  Math.max(
    0,
    pestanasWeb.value.findIndex(t => t.site === web.value)
  )
);

const opcionesFiltroEstado = [
  { value: '', label: 'Cualquier estado' },
  ...ESTADOS.map(e => ({ value: e, label: ETIQUETA_ESTADO[e] })),
];

const enlaceMacro = macroId =>
  router.resolve({
    name: macroId ? 'macros_edit' : 'macros_new',
    params: macroId
      ? { accountId: route.params.accountId, macroId }
      : { accountId: route.params.accountId },
  }).href;

function abrir(p) {
  if (!p) return;
  if (p.id !== elegidaId.value) {
    borradores.value = {};
    nuevoTexto.value = null;
  }
  elegidaId.value = p.id;
  form.value = formularioDe(p);
}

// Confirmaciones con el dialogo de Chatwoot, no con el del navegador.
const dialogoConfirmar = ref(null);
const confirmacion = ref({
  titulo: '',
  detalle: '',
  boton: '',
  peligro: false,
});
let responderA = null;

/** Abre el dialogo y se resuelve con true (acepta) o false (cancela o cierra). */
function confirmar({
  titulo,
  detalle = '',
  boton = 'Aceptar',
  peligro = false,
}) {
  confirmacion.value = { titulo, detalle, boton, peligro };
  dialogoConfirmar.value?.open();
  return new Promise(resolve => {
    responderA = resolve;
  });
}

function responderConfirmacion(si) {
  const responder = responderA;
  responderA = null;
  // Cerrar avisa "close": ya no hay a quien responder.
  if (si) dialogoConfirmar.value?.close();
  responder?.(si);
}

const DESCARTAR = {
  titulo: 'Hay cambios sin guardar',
  detalle: 'Si sales de esta propiedad ahora, se pierden.',
  boton: 'Descartar cambios',
  peligro: true,
};

/** Cambiar de propiedad con cambios a medias pide confirmacion. */
async function elegir(p) {
  if (p.id === elegidaId.value) return;
  if (sinGuardar.value && !(await confirmar(DESCARTAR))) return;
  abrir(p);
}

async function cerrar() {
  if (sinGuardar.value && !(await confirmar(DESCARTAR))) return;
  elegidaId.value = null;
  form.value = null;
}

function descartar() {
  if (elegida.value) form.value = formularioDe(elegida.value);
}

function restaurarFicha() {
  form.value.ficha = elegida.value?.fichaGenerada || '';
}

async function cargar() {
  if (!config.value) {
    error.value = 'config';
    return;
  }
  cargando.value = true;
  error.value = null;
  try {
    const cuenta = route.params.accountId;
    const [respuestaLista, respuestaMacros, respuestaWebs] = await Promise.all([
      pedir(`/dashboard-app/properties?accountId=${cuenta}`),
      pedir(`/dashboard-app/macros?accountId=${cuenta}`).catch(() => ({})),
      pedir(`/dashboard-app/properties/webs?accountId=${cuenta}`).catch(
        () => ({})
      ),
    ]);
    datos.value = respuestaLista;
    macros.value = respuestaMacros.macros || [];
    webs.value = websParaElegir(respuestaWebs);
    // La propiedad abierta se mantiene, con lo recien guardado; si ya no esta
    // en la lista (se despublico en la web), se cierra.
    const sigue = propiedades.value.find(p => p.id === elegidaId.value);
    if (elegidaId.value && !sigue) {
      elegidaId.value = null;
      form.value = null;
    } else if (sigue) {
      abrir(sigue);
    }
  } catch (e) {
    error.value = ['auth', 'config'].includes(e.message)
      ? e.message
      : 'network';
  } finally {
    cargando.value = false;
  }
}

async function recargarMacros() {
  try {
    const r = await pedir(
      `/dashboard-app/macros?accountId=${route.params.accountId}`
    );
    macros.value = r.macros || [];
  } catch (e) {
    useAlert('No se pudieron leer las macros');
  }
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  cargar();
});

watch(config, (cfg, prev) => {
  if (cfg && !prev) cargar();
});

/** Pone al dia una propiedad de la lista sin tocar lo que se esta editando. */
function actualizarPropiedad(nueva) {
  const todas = datos.value?.propiedades || [];
  const i = todas.findIndex(p => p.id === nueva?.id);
  if (i >= 0) todas.splice(i, 1, nueva);
}

/**
 * Sube un archivo a nuestra API, que lo prepara para WhatsApp (un video
 * pesado lo comprime) y lo guarda en el almacen. Con XMLHttpRequest y no
 * fetch para poder enseñar el progreso. Se resuelve siempre, con la respuesta.
 */
function enviarArchivo(s) {
  return new Promise(resolve => {
    const datosForm = new FormData();
    // Los campos antes que el archivo: asi el servidor los tiene al leerlo.
    datosForm.append('accountId', String(route.params.accountId));
    datosForm.append('site', s.site);
    datosForm.append('propertyId', s.propertyId);
    datosForm.append('updatedBy', currentUser.value?.name || '');
    datosForm.append('archivo', s.archivo);
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${config.value.api}/dashboard-app/properties/piezas/archivo`
    );
    xhr.setRequestHeader('Authorization', `Bearer ${config.value.token}`);
    xhr.upload.onprogress = e => {
      if (!e.lengthComputable) return;
      s.progreso = Math.round((e.loaded * 100) / e.total);
      // Subido: ahora el servidor lo prepara (un video, un par de minutos).
      if (s.progreso >= 100) s.fase = 'preparando';
    };
    xhr.onload = () => {
      let cuerpo = {};
      try {
        cuerpo = JSON.parse(xhr.responseText || '{}');
      } catch (e) {
        cuerpo = {};
      }
      resolve({ status: xhr.status, cuerpo });
    };
    xhr.onerror = () => resolve({ status: 0, cuerpo: {} });
    xhr.send(datosForm);
  });
}

/** Sube la siguiente de la cola, y al acabar la siguiente. */
async function procesarSubidas() {
  if (procesando || !config.value) return;
  const s = subidas.value.find(x => x.fase === 'esperando');
  if (!s) return;
  procesando = true;
  s.fase = 'subiendo';
  const { status, cuerpo } = await enviarArchivo(s);
  if (status >= 200 && status < 300 && cuerpo.propiedad) {
    actualizarPropiedad(cuerpo.propiedad);
  } else {
    erroresSubida.value.push({
      site: s.site,
      propertyId: s.propertyId,
      nombre: s.nombre,
      mensaje:
        status === 0
          ? 'No se pudo subir: revisa la conexión.'
          : cuerpo.message || 'No se pudo subir.',
    });
  }
  subidas.value = subidas.value.filter(x => x.uid !== s.uid);
  procesando = false;
  procesarSubidas();
}

/** Pone en la cola los archivos elegidos o soltados, con sus avisos. */
function anadirArchivos(elegidos) {
  const p = elegida.value;
  if (!p) return;
  erroresSubida.value = erroresSubida.value.filter(e => !deLaElegida(e));
  let yaHay = archivos.value.length + subidasDeEsta.value.length;
  Array.from(elegidos || []).forEach(archivo => {
    const problema = problemaConElArchivo(archivo, yaHay);
    if (problema) {
      erroresSubida.value.push({
        site: p.site,
        propertyId: p.id,
        nombre: archivo.name,
        mensaje: problema,
      });
      return;
    }
    yaHay += 1;
    siguienteSubida += 1;
    subidas.value.push({
      uid: siguienteSubida,
      site: p.site,
      propertyId: p.id,
      archivo,
      nombre: archivo.name,
      tipo: tipoDeArchivo(archivo),
      progreso: 0,
      fase: 'esperando',
    });
  });
  procesarSubidas();
}

function textoDeSubida(s) {
  if (s.fase === 'esperando') return 'En cola';
  if (s.fase === 'subiendo') return `Subiendo ${s.progreso} %`;
  return s.tipo === 'video'
    ? 'Preparando para WhatsApp… un video pesado tarda un par de minutos'
    : 'Preparando…';
}

function elegirArchivo(evento) {
  // Se copian antes de vaciar el campo (vaciarlo vacia la lista).
  const elegidos = Array.from(evento.target.files || []);
  evento.target.value = '';
  anadirArchivos(elegidos);
}

function soltarArchivo(evento) {
  arrastrando.value = false;
  anadirArchivos(evento.dataTransfer?.files);
}

/** Lo comun a las peticiones sobre lo que va tras la ficha. */
function cuerpoPieza(p, extra = {}) {
  return JSON.stringify({
    accountId: Number(route.params.accountId),
    site: p.site,
    propertyId: p.id,
    updatedBy: currentUser.value?.name || '',
    ...extra,
  });
}

function escribirBorrador(id, texto) {
  borradores.value = { ...borradores.value, [id]: texto };
}

function sinBorrador(id) {
  borradores.value = Object.fromEntries(
    Object.entries(borradores.value).filter(([clave]) => clave !== id)
  );
}

/** Sube o baja una pieza en el orden en que se manda. */
async function moverPieza(i, paso) {
  const p = elegida.value;
  const ids = piezas.value.map(x => x.id);
  const j = i + paso;
  if (!p || j < 0 || j >= ids.length || moviendo.value) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  moviendo.value = true;
  try {
    const r = await pedir('/dashboard-app/properties/piezas/orden', {
      method: 'PUT',
      body: cuerpoPieza(p, { ids }),
    });
    actualizarPropiedad(r.propiedad);
  } catch (e) {
    useAlert(`No se pudo cambiar el orden: ${e.message}`);
  } finally {
    moviendo.value = false;
  }
}

function preguntaAlQuitar(pieza) {
  if (pieza.tipo === 'ubicacion') return null;
  if (pieza.tipo === 'texto') {
    return {
      titulo: '¿Quitar este mensaje?',
      detalle: 'La IA dejará de mandarlo tras la ficha.',
      boton: 'Quitar',
      peligro: true,
    };
  }
  return {
    titulo: `¿Quitar «${pieza.nombre}»?`,
    detalle: 'La IA dejará de mandarlo y se borra del almacén.',
    boton: 'Quitar',
    peligro: true,
  };
}

async function quitarPieza(pieza) {
  const pregunta = preguntaAlQuitar(pieza);
  if (pregunta && !(await confirmar(pregunta))) return;
  const p = elegida.value;
  try {
    const q = new URLSearchParams({
      accountId: String(route.params.accountId),
      site: p.site,
      propertyId: p.id,
      id: pieza.id,
      updatedBy: currentUser.value?.name || '',
    });
    const r = await pedir(`/dashboard-app/properties/piezas?${q}`, {
      method: 'DELETE',
    });
    actualizarPropiedad(r.propiedad);
    sinBorrador(pieza.id);
  } catch (e) {
    useAlert(`No se pudo quitar: ${e.message}`);
  }
}

/** Guarda un texto al salir del campo, si cambió. */
async function guardarTexto(pieza) {
  const texto = borradores.value[pieza.id];
  if (texto === undefined || texto.trim() === pieza.texto.trim()) {
    sinBorrador(pieza.id);
    return;
  }
  try {
    const r = await pedir('/dashboard-app/properties/piezas/texto', {
      method: 'PATCH',
      body: cuerpoPieza(elegida.value, { id: pieza.id, texto }),
    });
    actualizarPropiedad(r.propiedad);
    sinBorrador(pieza.id);
  } catch (e) {
    useAlert(`No se pudo guardar el mensaje: ${e.message}`);
  }
}

async function anadirTexto() {
  const texto = String(nuevoTexto.value || '').trim();
  if (!elegida.value || !texto) return;
  try {
    const r = await pedir('/dashboard-app/properties/piezas/texto', {
      method: 'POST',
      body: cuerpoPieza(elegida.value, { texto }),
    });
    actualizarPropiedad(r.propiedad);
    nuevoTexto.value = null;
  } catch (e) {
    useAlert(`No se pudo añadir el mensaje: ${e.message}`);
  }
}

async function anadirUbicacion() {
  if (!elegida.value) return;
  try {
    const r = await pedir('/dashboard-app/properties/piezas/ubicacion', {
      method: 'POST',
      body: cuerpoPieza(elegida.value),
    });
    actualizarPropiedad(r.propiedad);
  } catch (e) {
    useAlert(`No se pudo añadir la ubicación: ${e.message}`);
  }
}

function anadirDato() {
  form.value.datos.push({ clave: '', valor: '' });
}

function quitarDato(i) {
  form.value.datos.splice(i, 1);
}

/**
 * Guarda el formulario. Devuelve si se guardo. `callado`: sin el aviso (lo
 * usa la macro de los asesores, que guarda antes de pasarse a Chatwoot).
 */
async function guardar({ callado = false } = {}) {
  if (!elegida.value || guardando.value) return false;
  guardando.value = true;
  try {
    await pedir('/dashboard-app/properties/playbook', {
      method: 'PUT',
      body: JSON.stringify(
        cuerpoDe(
          form.value,
          elegida.value,
          route.params.accountId,
          currentUser.value?.name
        )
      ),
    });
    await cargar();
    const macroVieja =
      elegida.value?.macroAsesoresId && !elegida.value.macroAsesoresAlDia;
    if (!callado) {
      useAlert(
        macroVieja
          ? 'Guardado. La macro de los asesores ya no está al día: actualízala o crea otra, abajo.'
          : 'Guardado. La IA lo usa desde el próximo mensaje.'
      );
    }
    return true;
  } catch (e) {
    useAlert(
      e.message === 'auth'
        ? 'No se pudo autenticar contra el CRM'
        : `No se pudo guardar: ${e.message}`
    );
    return false;
  } finally {
    guardando.value = false;
  }
}

/**
 * La macro de los asesores: la crea, la actualiza o crea otra (`clave`:
 * crear, actualizar, nueva). Sale de lo guardado: con cambios a medias, se
 * guardan antes.
 */
async function guardarMacroAsesores(clave) {
  const p = elegida.value;
  if (!p || guardandoMacro.value || cajaMacro.value.motivo) return;
  guardandoMacro.value = clave;
  try {
    if (sinGuardar.value && !(await guardar({ callado: true }))) return;
    const r = await pedir('/dashboard-app/properties/macro', {
      method: 'POST',
      body: cuerpoPieza(p, { nueva: clave === 'nueva' }),
    });
    actualizarPropiedad(r.propiedad);
    await recargarMacros();
    useAlert(
      r.macro?.creada
        ? `Macro «${r.macro.nombre}» creada: los asesores ya la tienen.`
        : `Macro «${r.macro?.nombre}» actualizada.`
    );
  } catch (e) {
    useAlert(`No se pudo guardar la macro: ${e.message}`);
  } finally {
    guardandoMacro.value = false;
  }
}

// Cargar una macro de Chatwoot en la propiedad, para editarla aqui.
const dialogoMacros = ref(null);
const macroACargar = ref(null);
const cargandoMacro = ref(false);

async function abrirCargarMacro() {
  macroACargar.value = null;
  await recargarMacros();
  dialogoMacros.value?.open();
}

/** Carga una macro: su primer mensaje es la ficha y el resto, la lista. */
async function cargarMacro(macroId) {
  const p = elegida.value;
  if (!p || cargandoMacro.value) return false;
  cargandoMacro.value = true;
  try {
    const r = await pedir('/dashboard-app/properties/macro/cargar', {
      method: 'POST',
      body: cuerpoPieza(p, { macroId: Number(macroId) }),
    });
    await cargar();
    await recargarMacros();
    const faltan = (r.omitidos || [])
      .map(o => `${o.nombre} (${o.motivo})`)
      .join('; ');
    useAlert(
      faltan
        ? `Macro «${r.macro?.nombre}» cargada, menos: ${faltan}`
        : `Macro «${r.macro?.nombre}» cargada: edítala aquí y guarda los cambios en la misma macro.`
    );
    return true;
  } catch (e) {
    useAlert(`No se pudo cargar la macro: ${e.message}`);
    return false;
  } finally {
    cargandoMacro.value = false;
  }
}

async function cargarMacroElegida() {
  if (!macroACargar.value) return;
  if (await cargarMacro(macroACargar.value)) dialogoMacros.value?.close();
}

async function guardarWebs() {
  if (guardandoWebs.value) return;
  const sites = webs.value.filter(w => w.conectada).map(w => w.site);
  guardandoWebs.value = true;
  try {
    await pedir('/dashboard-app/ai/sites', {
      method: 'PUT',
      body: JSON.stringify({
        accountId: Number(route.params.accountId),
        sites,
      }),
    });
    verWebs.value = false;
    web.value = '';
    await cargar();
    useAlert('Webs guardadas. La IA las usa desde el próximo mensaje.');
  } catch (e) {
    useAlert(`No se pudieron guardar las webs: ${e.message}`);
  } finally {
    guardandoWebs.value = false;
  }
}

const COLOR_ESTADO = {
  disponible: 'bg-n-teal-3 text-n-teal-11',
  reservado: 'bg-n-amber-3 text-n-amber-11',
  vendido: 'bg-n-slate-3 text-n-slate-11',
  alquilado: 'bg-n-slate-3 text-n-slate-11',
};

const TARJETA =
  'rounded-xl shadow-sm outline outline-1 outline-n-container bg-n-solid-2';
const AREA =
  'block w-full !mb-0 px-3 py-2.5 text-sm rounded-lg border-0 outline outline-1 -outline-offset-1 outline-n-weak hover:outline-n-slate-6 focus:outline-n-brand bg-n-alpha-black2 text-n-slate-12 placeholder:text-n-slate-10 transition-all duration-200';
const TITULO = 'mb-0 text-base font-medium text-n-slate-12';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    class="w-full px-6 overflow-auto bg-n-surface-1"
    data-turuta="propiedades"
  >
    <div class="pb-24 mx-auto max-w-7xl">
      <ReportHeader
        header-title="Propiedades"
        header-description="Qué manda la IA cuando un lead pregunta por una propiedad, y qué sabe de ella para responder. La lista sale de las webs del cliente."
      >
        <Button
          label="Actualizar"
          icon="i-lucide-refresh-cw"
          variant="faded"
          color="slate"
          size="sm"
          :is-loading="cargando"
          @click="cargar"
        />
      </ReportHeader>

      <p
        v-if="error"
        class="px-6 py-5 text-sm text-n-slate-11"
        :class="TARJETA"
      >
        {{ textoError(error) }}
      </p>
      <p
        v-else-if="!datos"
        class="px-6 py-5 text-sm text-n-slate-11"
        :class="TARJETA"
      >
        Cargando...
      </p>
      <p
        v-else-if="!datos.configurado"
        class="px-6 py-5 text-sm text-n-slate-11"
        :class="TARJETA"
      >
        El inventario no está conectado: faltan las claves de las webs en el
        servidor. Sin ellas la IA no ofrece propiedades.
      </p>

      <div v-else class="flex flex-col gap-4">
        <!-- Cifras -->
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article
            v-for="t in [
              {
                id: 'total',
                titulo: 'Propiedades',
                valor: cifras.total,
                nota: `${cifras.disponibles} disponibles`,
                icono: 'i-lucide-building-2',
                color: 'text-n-blue-11 bg-n-blue-3',
              },
              {
                id: 'ficha',
                titulo: 'Con ficha propia o macro',
                valor: cifras.conFichaPropia,
                nota: 'el resto manda la generada',
                icono: 'i-lucide-file-text',
                color: 'text-n-teal-11 bg-n-teal-3',
              },
              {
                id: 'archivos',
                titulo: 'Con macro o archivos',
                valor: cifras.conMacroOArchivos,
                nota: 'fotos, videos, PDF o enlace',
                icono: 'i-lucide-images',
                color: 'text-n-amber-11 bg-n-amber-3',
              },
              {
                id: 'fuera',
                titulo: 'No disponibles',
                valor: cifras.noDisponibles,
                nota: 'reservadas, vendidas o alquiladas',
                icono: 'i-lucide-circle-slash',
                color: 'text-n-slate-11 bg-n-slate-3',
              },
            ]"
            :key="t.id"
            class="flex items-start gap-4 px-5 py-4"
            :class="TARJETA"
          >
            <span
              class="flex items-center justify-center flex-none rounded-lg size-10"
              :class="t.color"
            >
              <Icon :icon="t.icono" class="size-5" />
            </span>
            <div class="min-w-0">
              <p class="mb-1 text-sm text-n-slate-11">{{ t.titulo }}</p>
              <p
                class="mb-1 text-2xl font-medium leading-none tabular-nums text-n-slate-12"
              >
                {{ t.valor }}
              </p>
              <p class="mb-0 text-xs text-n-slate-10">{{ t.nota }}</p>
            </div>
          </article>
        </section>

        <!-- Webs conectadas (solo administradores) -->
        <section v-if="esAdmin" class="px-5 py-3" :class="TARJETA">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="flex items-center gap-2 mb-0 text-sm text-n-slate-11">
              <Icon icon="i-lucide-globe" class="size-4 text-n-slate-10" />
              Webs conectadas:
              <span
                v-for="w in websConectadas"
                :key="w.site"
                class="px-2 py-0.5 text-xs font-medium rounded-md bg-n-alpha-2 text-n-slate-12"
              >
                {{ w.site }}
              </span>
              <span v-if="!websConectadas.length" class="text-n-amber-11">
                ninguna
              </span>
            </p>
            <Button
              :label="verWebs ? 'Cerrar' : 'Cambiar'"
              variant="ghost"
              color="blue"
              size="xs"
              @click="verWebs = !verWebs"
            />
          </div>
          <div v-if="verWebs" class="pt-3 mt-3 border-t border-n-weak">
            <p class="mb-3 text-xs text-n-slate-10">
              La IA ofrece las propiedades de todas las webs conectadas, en
              todas las bandejas.
            </p>
            <div class="grid gap-2 md:grid-cols-2">
              <label
                v-for="w in webs"
                :key="w.site"
                class="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline outline-1 transition-colors"
                :class="
                  w.conectada
                    ? 'outline-n-brand bg-n-alpha-1'
                    : 'outline-n-weak hover:bg-n-alpha-1'
                "
              >
                <input v-model="w.conectada" type="checkbox" class="mt-1" />
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-n-slate-12">
                    {{ w.nombre }}
                    <span class="font-normal text-n-slate-10">
                      · {{ w.site }}
                    </span>
                  </span>
                  <span class="block text-xs truncate text-n-slate-10">
                    {{ w.publicadas }} publicadas{{
                      w.ejemplos.length ? `: ${w.ejemplos.join(', ')}` : ''
                    }}
                  </span>
                </span>
              </label>
            </div>
            <div class="flex justify-end mt-3">
              <Button
                label="Guardar las webs"
                variant="solid"
                color="blue"
                size="sm"
                :is-loading="guardandoWebs"
                :disabled="guardandoWebs"
                @click="guardarWebs"
              />
            </div>
          </div>
        </section>

        <p
          v-if="!propiedades.length"
          class="px-6 py-5 text-sm text-n-slate-11"
          :class="TARJETA"
        >
          No hay propiedades publicadas en las webs conectadas.
        </p>

        <div
          v-else
          class="grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)] items-start"
        >
          <!-- Lista -->
          <section class="p-3 lg:sticky lg:top-4" :class="TARJETA">
            <div class="relative">
              <Icon
                icon="i-lucide-search"
                class="absolute -translate-y-1/2 pointer-events-none top-1/2 ltr:left-3 rtl:right-3 size-4 text-n-slate-10"
              />
              <input
                v-model="busqueda"
                type="search"
                placeholder="Buscar por distrito, calle o código"
                :class="AREA"
                class="h-9 ltr:pl-9 rtl:pr-9"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <TabBar
                v-if="sitios.length > 1"
                :tabs="pestanasWeb"
                :initial-active-tab="pestanaWeb"
                @tab-changed="t => (web = t.site)"
              />
              <div class="ltr:ml-auto rtl:mr-auto w-36">
                <CampoSelect
                  v-model="estado"
                  :options="opcionesFiltroEstado"
                  compacto
                />
              </div>
            </div>

            <p class="px-1 mt-3 mb-1 text-xs text-n-slate-10">
              {{ lista.length }} de {{ cifras.total }}
            </p>
            <ul
              class="flex flex-col gap-1 mb-0 list-none max-h-[36rem] overflow-y-auto ltr:ml-0 rtl:mr-0"
            >
              <li v-for="p in lista" :key="p.id">
                <button
                  type="button"
                  class="flex w-full gap-3 p-2 text-left transition-colors rounded-lg"
                  :class="
                    p.id === elegidaId
                      ? 'bg-n-alpha-2 outline outline-1 outline-n-weak'
                      : 'hover:bg-n-alpha-1'
                  "
                  @click="elegir(p)"
                >
                  <img
                    v-if="p.portada"
                    :src="p.portada"
                    alt=""
                    class="flex-none object-cover rounded-md size-12 bg-n-alpha-2"
                  />
                  <span
                    v-else
                    class="flex items-center justify-center flex-none rounded-md size-12 bg-n-alpha-2"
                  >
                    <Icon
                      icon="i-lucide-building-2"
                      class="size-5 text-n-slate-10"
                    />
                  </span>
                  <span class="min-w-0 grow">
                    <span
                      class="block text-sm font-medium truncate text-n-slate-12"
                      :title="p.titulo"
                    >
                      {{ p.titulo }}
                    </span>
                    <span class="block text-xs truncate text-n-slate-10">
                      {{ subtitulo(p) }}
                    </span>
                    <span class="flex items-center justify-between mt-1">
                      <span
                        class="text-xs font-medium tabular-nums text-n-slate-11"
                      >
                        {{ precioTexto(p) }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <span
                          v-if="p.disponibilidad !== 'disponible'"
                          class="px-1.5 py-px text-[10px] font-medium rounded"
                          :class="COLOR_ESTADO[p.disponibilidad]"
                        >
                          {{ ETIQUETA_ESTADO[p.disponibilidad] }}
                        </span>
                        <span
                          v-for="i in indicadores(p)"
                          :key="i.clave"
                          :title="i.titulo"
                          class="flex"
                        >
                          <Icon
                            :icon="i.icono"
                            class="size-3.5"
                            :class="i.ok ? 'text-n-teal-10' : 'text-n-slate-7'"
                          />
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            </ul>
            <p
              class="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-2 mt-2 mb-0 text-[11px] border-t border-n-weak text-n-slate-10"
            >
              <span class="flex items-center gap-1">
                <Icon icon="i-lucide-file-text" class="size-3" /> ficha propia
              </span>
              <span class="flex items-center gap-1">
                <Icon icon="i-lucide-images" class="size-3" /> archivos
              </span>
              <span class="flex items-center gap-1">
                <Icon icon="i-lucide-calendar-clock" class="size-3" /> horario
              </span>
              <span class="flex items-center gap-1">
                <Icon icon="i-lucide-zap" class="size-3" /> macro
              </span>
            </p>
          </section>

          <!-- Sin propiedad elegida -->
          <section
            v-if="!elegida"
            class="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
            :class="TARJETA"
          >
            <span
              class="flex items-center justify-center rounded-full size-12 bg-n-alpha-2"
            >
              <Icon
                icon="i-lucide-mouse-pointer-click"
                class="size-5 text-n-slate-10"
              />
            </span>
            <p class="mb-0 text-sm font-medium text-n-slate-12">
              Elige una propiedad de la lista
            </p>
            <p class="max-w-sm mb-0 text-sm text-n-slate-10">
              Verás lo que la IA le manda al lead y lo que sabe de ella para
              responder.
            </p>
          </section>

          <!-- Editor -->
          <section v-else class="min-w-0" :class="TARJETA">
            <header class="flex gap-4 p-5 border-b border-n-weak">
              <img
                v-if="elegida.portada"
                :src="elegida.portada"
                alt=""
                class="flex-none object-cover rounded-lg size-16 bg-n-alpha-2"
              />
              <div class="min-w-0 grow">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="mb-0 text-lg font-medium truncate text-n-slate-12">
                    {{ elegida.titulo }}
                  </h2>
                  <span
                    class="px-2 py-0.5 text-xs font-medium rounded-md"
                    :class="COLOR_ESTADO[elegida.disponibilidad]"
                  >
                    {{ ETIQUETA_ESTADO[elegida.disponibilidad] }}
                  </span>
                </div>
                <p class="mt-1 mb-0 text-sm text-n-slate-11">
                  {{ subtitulo(elegida) }} ·
                  <span class="font-medium">{{ precioTexto(elegida) }}</span>
                </p>
                <p class="mt-0.5 mb-0 text-xs text-n-slate-10">
                  {{ origen(elegida) }}
                  <template v-if="elegida.fichaActualizadaPor">
                    · guardado por {{ elegida.fichaActualizadaPor }}
                  </template>
                </p>
              </div>
              <Button
                icon="i-lucide-x"
                variant="ghost"
                color="slate"
                size="sm"
                @click="cerrar"
              />
            </header>

            <!-- 1. Que manda la IA -->
            <div class="p-5 border-b border-n-weak">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h3 :class="TITULO">Qué le manda la IA al lead</h3>
                <Button
                  label="Cargar una macro"
                  icon="i-lucide-download"
                  variant="faded"
                  color="slate"
                  size="sm"
                  @click="abrirCargarMacro"
                />
              </div>
              <p class="mt-1 mb-4 text-sm text-n-slate-10">
                La ficha y lo que va detrás, en este orden. Puedes empezar desde
                una de tus macros y editarla aquí.
              </p>

              <div
                v-if="elegida.macroId"
                class="flex flex-wrap items-center gap-3 px-3 py-2.5 mb-4 rounded-lg bg-n-amber-3 text-n-amber-11"
              >
                <Icon icon="i-lucide-triangle-alert" class="flex-none size-4" />
                <p class="mb-0 text-sm grow basis-60">
                  Ahora la IA manda la macro «{{
                    macroQueMandaLaIA?.nombre || elegida.macroId
                  }}» en vez de esto. Cárgala aquí para verla y editarla: desde
                  entonces manda lo de esta página.
                </p>
                <Button
                  label="Cargar la macro"
                  color="amber"
                  size="sm"
                  :is-loading="cargandoMacro"
                  @click="cargarMacro(elegida.macroId)"
                />
              </div>

              <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <!-- La ficha y lo que va detras -->
                <div class="flex flex-col gap-4 min-w-0">
                  <div>
                    <div
                      class="flex flex-wrap items-center justify-between gap-2 mb-1.5"
                    >
                      <span class="text-heading-3 text-n-slate-12">
                        Ficha de WhatsApp
                      </span>
                      <span
                        v-if="generada"
                        class="flex items-center gap-1 text-xs text-n-slate-10"
                      >
                        <Icon icon="i-lucide-sparkles" class="size-3.5" />
                        Generada desde la web
                      </span>
                      <span v-else class="flex items-center gap-2 text-xs">
                        <Icon
                          icon="i-lucide-pencil-line"
                          class="size-3.5 text-n-teal-11"
                        />
                        <span class="text-n-teal-11">Editada</span>
                        <Button
                          label="Volver a la generada"
                          variant="link"
                          color="blue"
                          size="xs"
                          @click="restaurarFicha"
                        />
                      </span>
                    </div>
                    <textarea
                      v-model="form.ficha"
                      rows="14"
                      :class="AREA"
                      class="!h-auto leading-relaxed resize-y"
                    />
                    <p class="mt-1 mb-0 text-xs text-n-slate-10">
                      Retoca lo que quieras. Si la dejas igual que la generada,
                      sigue a la web cuando allí cambie el precio o la
                      descripción.
                    </p>
                  </div>
                  <!-- Lo que va tras la ficha: archivos, mensajes y la ubicacion -->
                  <div class="flex flex-col gap-2">
                    <div
                      class="flex flex-wrap items-baseline justify-between gap-2"
                    >
                      <span class="text-heading-3 text-n-slate-12">
                        Después de la ficha
                      </span>
                      <span class="text-xs text-n-slate-10">
                        En este orden · se guarda al momento ·
                        {{ archivos.length }} de {{ MAX_ARCHIVOS }} archivos
                      </span>
                    </div>

                    <p
                      v-if="!piezas.length"
                      class="px-3 py-2 mb-0 text-xs rounded-lg bg-n-alpha-1 text-n-slate-10"
                    >
                      Nada: la IA solo manda la ficha.
                    </p>
                    <ul
                      v-else
                      class="flex flex-col gap-1.5 mb-0 list-none ltr:ml-0 rtl:mr-0"
                    >
                      <li
                        v-for="(pieza, i) in piezas"
                        :key="pieza.id"
                        class="flex items-center gap-3 p-2 rounded-lg outline outline-1 outline-n-weak bg-n-alpha-1"
                      >
                        <img
                          v-if="pieza.tipo === 'imagen' && pieza.url"
                          :src="pieza.url"
                          alt=""
                          class="flex-none object-cover w-16 h-12 rounded-md bg-n-alpha-2"
                        />
                        <video
                          v-else-if="pieza.tipo === 'video' && pieza.url"
                          :src="pieza.url"
                          class="flex-none object-cover w-16 h-12 rounded-md bg-n-slate-12"
                          muted
                          playsinline
                          preload="metadata"
                        />
                        <span
                          v-else
                          class="flex items-center justify-center flex-none w-16 h-12 rounded-md bg-n-alpha-2"
                        >
                          <Icon
                            :icon="
                              ICONO_DE_ARCHIVO[pieza.tipo] ||
                              ICONO_DE_ARCHIVO.documento
                            "
                            class="size-5 text-n-slate-10"
                          />
                        </span>

                        <div class="min-w-0 grow">
                          <textarea
                            v-if="pieza.tipo === 'texto'"
                            :value="borradores[pieza.id] ?? pieza.texto"
                            rows="2"
                            placeholder="Escribe el mensaje…"
                            :class="AREA"
                            class="!h-auto resize-y"
                            @input="
                              escribirBorrador(pieza.id, $event.target.value)
                            "
                            @change="guardarTexto(pieza)"
                          />
                          <template v-else-if="pieza.tipo === 'ubicacion'">
                            <p class="mb-0 text-sm font-medium text-n-slate-12">
                              Ubicación
                            </p>
                            <p
                              v-if="elegida.mapsUrl"
                              class="mb-0 text-xs truncate text-n-slate-10"
                            >
                              {{ elegida.mapsUrlEquipo ? '' : 'De la web · ' }}
                              <a
                                :href="elegida.mapsUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-n-blue-11 hover:underline"
                              >
                                {{ elegida.mapsUrl }}
                              </a>
                            </p>
                            <p v-else class="mb-0 text-xs text-n-slate-10">
                              La web no tiene la ubicación: no se manda.
                            </p>
                          </template>
                          <template v-else>
                            <p
                              class="mb-0 text-sm font-medium truncate text-n-slate-12"
                              :title="pieza.nombre"
                            >
                              {{ pieza.nombre }}
                            </p>
                            <p class="mb-0 text-xs text-n-slate-10">
                              {{ ETIQUETA_TIPO[pieza.tipo] }}
                              <template v-if="pieza.bytes">
                                · {{ tamanoLegible(pieza.bytes) }}
                              </template>
                              <template v-if="pieza.url">
                                ·
                                <a
                                  :href="pieza.url"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="text-n-blue-11 hover:underline"
                                >
                                  Ver
                                </a>
                              </template>
                            </p>
                          </template>
                        </div>

                        <div class="flex items-center flex-none">
                          <Button
                            v-tooltip="'Antes'"
                            icon="i-lucide-arrow-up"
                            variant="ghost"
                            color="slate"
                            size="xs"
                            :disabled="i === 0 || moviendo"
                            @click="moverPieza(i, -1)"
                          />
                          <Button
                            v-tooltip="'Después'"
                            icon="i-lucide-arrow-down"
                            variant="ghost"
                            color="slate"
                            size="xs"
                            :disabled="i === piezas.length - 1 || moviendo"
                            @click="moverPieza(i, 1)"
                          />
                          <Button
                            v-tooltip="'Quitar'"
                            icon="i-lucide-trash-2"
                            variant="ghost"
                            color="ruby"
                            size="xs"
                            @click="quitarPieza(pieza)"
                          />
                        </div>
                      </li>
                    </ul>

                    <div
                      v-for="sub in subidasDeEsta"
                      :key="sub.uid"
                      class="p-3 rounded-lg outline outline-1 outline-n-weak bg-n-alpha-1"
                    >
                      <p
                        class="flex justify-between gap-3 mb-2 text-xs text-n-slate-11"
                      >
                        <span class="truncate">{{ sub.nombre }}</span>
                        <span class="text-right">{{ textoDeSubida(sub) }}</span>
                      </p>
                      <div
                        class="h-1.5 overflow-hidden rounded-full bg-n-alpha-2"
                      >
                        <div
                          class="h-full transition-all duration-200 rounded-full bg-n-brand"
                          :class="{
                            'animate-pulse': sub.fase === 'preparando',
                          }"
                          :style="{ width: `${sub.progreso}%` }"
                        />
                      </div>
                    </div>

                    <!-- Un mensaje nuevo -->
                    <div
                      v-if="nuevoTexto !== null"
                      class="flex flex-col gap-2 p-2 rounded-lg outline outline-1 outline-n-brand"
                    >
                      <textarea
                        v-model="nuevoTexto"
                        rows="3"
                        placeholder="Un enlace de YouTube, un recorrido virtual, una aclaración…"
                        :class="AREA"
                        class="!h-auto resize-y"
                      />
                      <div class="flex justify-end gap-2">
                        <Button
                          label="Cancelar"
                          variant="ghost"
                          color="slate"
                          size="sm"
                          @click="nuevoTexto = null"
                        />
                        <Button
                          label="Añadir"
                          size="sm"
                          :disabled="!nuevoTexto.trim()"
                          @click="anadirTexto"
                        />
                      </div>
                    </div>

                    <div v-if="cabePieza" class="flex flex-wrap gap-2">
                      <Button
                        v-if="nuevoTexto === null"
                        label="Mensaje de texto"
                        icon="i-lucide-message-square-plus"
                        variant="faded"
                        color="slate"
                        size="sm"
                        @click="nuevoTexto = ''"
                      />
                      <Button
                        v-if="!hayUbicacion && elegida.mapsUrl"
                        label="Ubicación"
                        icon="i-lucide-map-pin"
                        variant="faded"
                        color="slate"
                        size="sm"
                        @click="anadirUbicacion"
                      />
                    </div>

                    <label
                      v-if="cabeMas"
                      class="flex flex-col items-center justify-center gap-1 px-4 py-5 mb-0 text-center transition-colors border-2 border-dashed rounded-lg cursor-pointer"
                      :class="
                        arrastrando
                          ? 'border-n-brand bg-n-alpha-1'
                          : 'border-n-weak hover:border-n-slate-6'
                      "
                      @dragover.prevent="arrastrando = true"
                      @dragleave.prevent="arrastrando = false"
                      @drop.prevent="soltarArchivo"
                    >
                      <input
                        type="file"
                        multiple
                        :accept="ACEPTA_ARCHIVOS"
                        class="hidden"
                        @change="elegirArchivo"
                      />
                      <Icon
                        icon="i-lucide-upload"
                        class="size-5 text-n-slate-10"
                      />
                      <span class="text-sm font-medium text-n-slate-12">
                        Sube fotos, videos o PDF desde tu PC
                      </span>
                      <span class="text-xs text-n-slate-10">
                        o arrástralos aquí · los videos pesados se comprimen
                        solos para WhatsApp
                      </span>
                    </label>

                    <p
                      v-for="(e, i) in erroresDeEsta"
                      :key="`error-${i}`"
                      class="mb-0 text-xs text-n-ruby-11"
                    >
                      {{ e.nombre }}: {{ e.mensaje }}
                    </p>
                  </div>

                  <!-- La macro para los asesores -->
                  <div
                    class="flex flex-wrap items-center gap-3 p-3 rounded-lg outline outline-1 outline-n-weak"
                  >
                    <span
                      class="flex items-center justify-center flex-none rounded-lg size-9 bg-n-alpha-2"
                    >
                      <Icon
                        icon="i-lucide-zap"
                        class="size-4 text-n-slate-11"
                      />
                    </span>
                    <div class="min-w-0 grow basis-60">
                      <p
                        class="mb-0 text-sm font-medium truncate text-n-slate-12"
                      >
                        {{ cajaMacro.titulo }}
                      </p>
                      <p class="mb-0 text-xs text-n-slate-10">
                        {{ cajaMacro.detalle }}
                      </p>
                      <p
                        v-if="macroEnlazada?.ignoradas?.length"
                        class="mt-1 mb-0 text-xs text-n-slate-10"
                      >
                        La macro también hace (la IA no):
                        {{ macroEnlazada.ignoradas.join(', ') }}. Se conserva al
                        guardar.
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center flex-none gap-3">
                      <a
                        v-if="elegida.macroAsesoresId"
                        :href="enlaceMacro(elegida.macroAsesoresId)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-n-blue-11 hover:underline"
                      >
                        Editar la macro
                      </a>
                      <Button
                        v-for="accion in cajaMacro.acciones"
                        :key="accion.clave"
                        v-tooltip="cajaMacro.motivo"
                        :label="accion.label"
                        :variant="accion.destacado ? 'solid' : 'faded'"
                        color="blue"
                        size="sm"
                        :is-loading="guardandoMacro === accion.clave"
                        :disabled="!!cajaMacro.motivo || !!guardandoMacro"
                        @click="guardarMacroAsesores(accion.clave)"
                      />
                    </div>
                  </div>
                </div>

                <!-- Vista previa -->
                <aside
                  class="flex flex-col p-3 rounded-xl bg-n-alpha-1 xl:min-h-[28rem]"
                >
                  <p
                    class="flex items-center gap-1.5 mb-2 text-xs font-medium text-n-slate-11"
                  >
                    <Icon icon="i-lucide-eye" class="size-3.5" />
                    Así le llega al lead
                  </p>
                  <!-- En pantalla ancha, tan alta como el editor de al lado:
                       solo hay scroll si lo que se manda no cabe. -->
                  <div class="xl:relative xl:flex-1 xl:min-h-0">
                    <div
                      v-if="burbujas.length"
                      class="flex flex-col items-end gap-1.5 xl:absolute xl:inset-0 xl:overflow-y-auto"
                    >
                      <div
                        v-for="(b, i) in burbujas"
                        :key="i"
                        class="max-w-full px-3 py-2 text-xs rounded-lg rounded-tr-sm shadow-sm bg-n-teal-3 text-n-slate-12"
                      >
                        <span
                          v-if="b.tipo === 'texto'"
                          class="block break-words whitespace-pre-wrap"
                          >{{ b.texto }}</span
                        >
                        <img
                          v-else-if="b.clase === 'imagen' && b.url"
                          :src="b.url"
                          :alt="b.nombre"
                          class="block object-cover w-40 rounded max-h-32"
                        />
                        <span v-else class="flex items-center gap-2">
                          <Icon
                            :icon="
                              ICONO_DE_ARCHIVO[b.clase] ||
                              ICONO_DE_ARCHIVO.documento
                            "
                            class="flex-none size-4 text-n-teal-11"
                          />
                          <span class="truncate">{{ b.nombre }}</span>
                        </span>
                      </div>
                    </div>
                    <p v-else class="mb-0 text-xs text-n-slate-10">
                      Escribe la ficha para ver cómo le llega.
                    </p>
                  </div>
                </aside>
              </div>
            </div>

            <!-- 2. Lo que sabe la IA -->
            <div class="p-5">
              <h3 :class="TITULO">Lo que la IA sabe de ella</h3>
              <p class="mt-1 mb-4 text-sm text-n-slate-10">
                No se le manda al lead tal cual: la IA lo usa para responder con
                sus palabras.
              </p>

              <div class="grid gap-4 md:grid-cols-2">
                <CampoSelect
                  v-model="form.availability"
                  label="Estado"
                  :options="opcionesDeEstado(elegida)"
                  :ayuda="`${QUE_HACE_EL_ESTADO[form.availability]} No cambia la web.`"
                />
                <CampoSelect
                  v-model="form.negotiable"
                  label="¿El precio se negocia?"
                  :options="NEGOCIABLES"
                  ayuda="La IA nunca negocia: solo responde esto."
                />
                <Input
                  v-model="form.visitHours"
                  label="Horario de visitas"
                  placeholder="Lunes a sábado de 11:30 a 13:30"
                  message="Lo dice, pero nunca agenda: la visita la cierra un asesor."
                />
                <Input
                  v-model="form.conditions"
                  label="Condiciones"
                  placeholder="Solo al contado. No tiene cochera."
                  message="Las dice tal cual."
                />
              </div>

              <label class="flex flex-col gap-1 mt-4 mb-0">
                <span class="mb-0.5 text-heading-3 text-n-slate-12">
                  Notas para la IA
                </span>
                <textarea
                  v-model="form.notes"
                  rows="3"
                  placeholder="Mantenimiento S/ 450 al mes. Se aceptan mascotas pequeñas."
                  :class="AREA"
                  class="!h-auto resize-y"
                />
                <span class="text-xs text-n-slate-10">
                  Lo usa para responder, sin decir que es una nota.
                </span>
              </label>

              <div class="mt-5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-heading-3 text-n-slate-12">
                    Datos confirmados
                  </span>
                  <Button
                    label="Añadir dato"
                    icon="i-lucide-plus"
                    variant="ghost"
                    color="blue"
                    size="xs"
                    @click="anadirDato"
                  />
                </div>
                <p class="mt-1 mb-2 text-xs text-n-slate-10">
                  Dato y valor, como «piso = 7». Los guarda también la IA cuando
                  el equipo le contesta una consulta con una nota «IA:». Valen
                  para cualquier lead.
                </p>
                <div
                  v-for="(d, i) in form.datos"
                  :key="i"
                  class="grid items-center gap-2 mt-2 grid-cols-[10rem_minmax(0,1fr)_auto]"
                >
                  <input
                    v-model="d.clave"
                    type="text"
                    placeholder="piso"
                    :class="AREA"
                    class="h-9"
                  />
                  <input
                    v-model="d.valor"
                    type="text"
                    placeholder="7"
                    :class="AREA"
                    class="h-9"
                  />
                  <Button
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="ruby"
                    size="sm"
                    @click="quitarDato(i)"
                  />
                </div>
                <p
                  v-if="!form.datos.length"
                  class="px-3 py-2 mt-2 mb-0 text-xs rounded-lg bg-n-alpha-1 text-n-slate-10"
                >
                  Todavía no hay ninguno.
                </p>
              </div>
            </div>

            <!-- Guardar -->
            <footer
              class="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 px-5 py-3 border-t rounded-b-xl border-n-weak bg-n-solid-2"
            >
              <span
                class="text-xs ltr:mr-auto rtl:ml-auto"
                :class="sinGuardar ? 'text-n-amber-11' : 'text-n-slate-10'"
              >
                {{ sinGuardar ? 'Hay cambios sin guardar' : 'Todo guardado' }}
              </span>
              <Button
                label="Descartar"
                variant="ghost"
                color="slate"
                size="sm"
                :disabled="!sinGuardar || guardando"
                @click="descartar"
              />
              <Button
                label="Guardar"
                variant="solid"
                color="blue"
                size="sm"
                :disabled="!sinGuardar || guardando"
                :is-loading="guardando"
                @click="guardar"
              />
            </footer>
          </section>
        </div>
      </div>
    </div>

    <Dialog
      ref="dialogoConfirmar"
      :type="confirmacion.peligro ? 'alert' : 'edit'"
      :title="confirmacion.titulo"
      :description="confirmacion.detalle"
      :confirm-button-label="confirmacion.boton"
      cancel-button-label="Cancelar"
      width="md"
      @confirm="responderConfirmacion(true)"
      @close="responderConfirmacion(false)"
    />

    <Dialog
      ref="dialogoMacros"
      title="Cargar una macro"
      :description="
        sinGuardar
          ? 'Su contenido reemplaza la ficha y lo que va detrás. Los cambios sin guardar se pierden.'
          : 'Su contenido reemplaza la ficha y lo que va detrás: el primer mensaje pasa a ser la ficha y el resto, la lista. Luego lo editas aquí y «Guardar cambios en la misma macro» la actualiza.'
      "
      confirm-button-label="Cargar"
      cancel-button-label="Cancelar"
      :disable-confirm-button="!macroACargar"
      :is-loading="cargandoMacro"
      width="xl"
      @confirm="cargarMacroElegida"
    >
      <p v-if="!macros.length" class="mb-0 text-sm text-n-slate-10">
        No hay macros visibles para todos.
        <a
          :href="enlaceMacro(null)"
          target="_blank"
          rel="noopener noreferrer"
          class="text-n-blue-11 hover:underline"
        >
          Crear una
        </a>
      </p>
      <div v-else class="flex flex-col gap-2 overflow-y-auto max-h-[50vh]">
        <label
          v-for="m in macros"
          :key="m.id"
          class="flex items-start gap-3 p-3 mb-0 transition-colors rounded-lg cursor-pointer outline outline-1"
          :class="
            macroACargar === m.id
              ? 'outline-n-brand bg-n-alpha-2'
              : 'outline-n-weak hover:bg-n-alpha-1'
          "
        >
          <input
            v-model="macroACargar"
            type="radio"
            name="macro-a-cargar"
            :value="m.id"
            class="mt-1"
          />
          <span class="min-w-0">
            <span class="block text-sm font-medium text-n-slate-12">
              {{ m.nombre }}
              <span
                v-if="m.id === elegida?.macroAsesoresId"
                class="font-normal text-n-teal-11"
              >
                · la de esta propiedad
              </span>
              <span v-if="!m.publica" class="font-normal text-n-slate-10">
                · personal
              </span>
            </span>
            <span class="block text-xs text-n-slate-10">
              {{ resumenCortoDeMacro(m) }}
            </span>
          </span>
        </label>
      </div>
    </Dialog>
  </div>
</template>
