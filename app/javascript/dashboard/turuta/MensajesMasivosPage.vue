<script setup>
// [turuta] "Mensajes masivos" (administradores y asesores, 25/11): la misma
// plantilla aprobada de WhatsApp a todos los chats que cumplen un filtro, o a
// una lista de numeros escrita a mano.
// Cada persona alcanza los chats que ve en su lista y ve sus propios envios;
// un administrador, todos. Eso lo decide la API con el token del usuario.
// El envio de un asesor espera a que un administrador lo apruebe, salvo que
// el administrador le haya dado permiso para enviar directamente.
// Tres vistas en la misma pagina: los envios hechos, uno nuevo y el detalle
// de uno. Contra nuestra API (dashboard-app/difusiones), que es quien aplica
// el filtro, manda los mensajes poco a poco y mira si llegaron.
//
// Siempre con plantilla: fuera de la ventana de 24 h WhatsApp no admite otra
// cosa. Y con dos frenos antes de enviar: primero se ve a quienes les llega,
// y para lanzarlo hay que escribir ENVIAR.
//
// Lo que se lleva escrito se guarda en la pestana (el borrador), y la
// plantilla elegida se copia al elegirla: Chatwoot recarga la lista de
// bandejas cuando quiere, y con la plantilla leida del almacen cada recarga
// vaciaba los campos ya llenos (25/11).
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import WhatsAppTemplateParser from 'dashboard/components-next/whatsapp/WhatsAppTemplateParser.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import CampoSelect from './CampoSelect.vue';
import FiltroDeAudiencia from './FiltroDeAudiencia.vue';
import VistaDeMensaje from './VistaDeMensaje.vue';
import { leadAppConfig } from './leadApp';
import {
  CONFIRMACION,
  CAMPO_NOMBRE,
  ESTADO_DE_ENVIO,
  ESTADO_DE_MENSAJE,
  avance,
  borradorConAlgo,
  clienteDeDifusion,
  consultaDeFiltros,
  cuantoTarda,
  fechaCorta,
  filasConValor,
  guardarBorrador,
  leerBorrador,
  opcionesDePlantilla,
  personaDeEjemplo,
  plantillaElegida,
  queFalta,
  textoDeFiltros,
  usaNombre,
  volcarValores,
} from './mensajesMasivos';

/** Cuantas personas se pintan de la lista; el resto se cuenta. */
const A_LA_VISTA = 100;
const CADA_MS = 5000;

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const currentUser = useMapGetter('getCurrentUser');
const bandejas = useMapGetter('inboxes/getWhatsAppInboxes');
const plantillasDe = useMapGetter('inboxes/getFilteredWhatsAppTemplates');
const agentes = useMapGetter('agents/getAgents');

const api = computed(() =>
  clienteDeDifusion(
    leadAppConfig(apps.value),
    currentUser.value,
    route.params.accountId
  )
);

const vista = ref('lista'); // lista | nuevo | detalle

// ------------------------------------------------------------- los envios
const envios = ref([]);
const cargando = ref(true);
const errorDeLista = ref('');
const detalle = ref(null);
const cancelando = ref(false);
// Lo que puede hacer quien mira, segun la API: `directo` es que su envio sale
// sin esperar a un administrador. Hasta que la API conteste, lo minimo.
const yo = ref({ admin: false, directo: false });
// Los asesores que envian sin pedir aprobacion (solo lo recibe un administrador).
const directos = ref([]);

async function cargarLista() {
  try {
    const r = await api.value.lista();
    envios.value = r.envios || [];
    if (r.yo) yo.value = r.yo;
    directos.value = r.directos || [];
    errorDeLista.value = '';
  } catch (e) {
    errorDeLista.value = e.message;
  } finally {
    cargando.value = false;
  }
}

async function abrir(id) {
  try {
    detalle.value = await api.value.detalle(id);
    vista.value = 'detalle';
  } catch (e) {
    useAlert(`No se pudo abrir el envío: ${e.message}`);
  }
}

async function cancelar() {
  if (!detalle.value || cancelando.value) return;
  cancelando.value = true;
  const esperaba = detalle.value.estado === 'PENDING_APPROVAL';
  try {
    detalle.value = await api.value.cancelar(detalle.value.id);
    useAlert(
      esperaba
        ? 'Solicitud retirada: no sale nada.'
        : 'Envío cancelado: lo que quedaba en cola ya no sale.'
    );
  } catch (e) {
    useAlert(`No se pudo cancelar: ${e.message}`);
  } finally {
    cancelando.value = false;
  }
}

// ------------------------------------------------ aprobar lo de un asesor
const aprobando = ref(false); // el segundo clic: "¿seguro?"
const rechazando = ref(false);
const razon = ref('');
const decidiendo = ref(false);

function dejarDeDecidir() {
  aprobando.value = false;
  rechazando.value = false;
  razon.value = '';
}

async function aprobar() {
  if (!detalle.value || decidiendo.value) return;
  decidiendo.value = true;
  try {
    detalle.value = await api.value.aprobar(detalle.value.id);
    useAlert(`Aprobado: el envío a ${detalle.value.total} ya está saliendo.`);
    dejarDeDecidir();
  } catch (e) {
    useAlert(`No se pudo aprobar: ${e.message}`);
  } finally {
    decidiendo.value = false;
  }
}

async function rechazar() {
  if (!detalle.value || decidiendo.value) return;
  decidiendo.value = true;
  try {
    detalle.value = await api.value.rechazar(
      detalle.value.id,
      razon.value.trim()
    );
    useAlert('No aprobado: no sale nada.');
    dejarDeDecidir();
  } catch (e) {
    useAlert(`No se pudo guardar: ${e.message}`);
  } finally {
    decidiendo.value = false;
  }
}

// Quien envia sin pedir aprobacion: lo decide un administrador, asesor por asesor.
const asesores = computed(() =>
  (agentes.value || []).filter(a => a.role === 'agent')
);
const guardandoPermiso = ref(null);
async function cambiarPermiso(agente, directo) {
  guardandoPermiso.value = agente.id;
  try {
    directos.value = (await api.value.permiso(agente.id, directo)).directos;
  } catch (e) {
    useAlert(`No se pudo guardar: ${e.message}`);
  } finally {
    guardandoPermiso.value = null;
  }
}

// Mientras algo esta saliendo, la pantalla se pone al dia sola. Y cada medio
// minuto, la lista: por si un asesor pidio un envio o un administrador lo aprobo.
let reloj = null;
let vueltas = 0;
async function alDia() {
  vueltas += 1;
  const estado = detalle.value?.estado;
  if (vista.value === 'detalle') {
    const toca =
      estado === 'SENDING' ||
      (estado === 'PENDING_APPROVAL' && vueltas % 3 === 0);
    if (!toca) return;
    try {
      detalle.value = await api.value.detalle(detalle.value.id);
    } catch {
      // La siguiente vuelta lo vuelve a intentar.
    }
  } else if (
    vista.value === 'lista' &&
    (vueltas % 6 === 0 || envios.value.some(e => e.estado === 'SENDING'))
  ) {
    await cargarLista();
  }
}

// ---------------------------------------------------------- un envio nuevo
const modo = ref('filtros'); // filtros | lista: a quienes se elige como
const lista = ref(''); // los numeros pegados a mano
const inboxId = ref(null);
const filas = ref([]);
const filtroRef = ref(null);
const audiencia = ref(null);
const buscando = ref(false);
const errorDeAudiencia = ref('');
const plantilla = ref('');
// La plantilla elegida, COPIADA al elegirla (ver arriba).
const laPlantilla = ref(null);
const parserRef = ref(null);
const sinNombre = ref('');
const titulo = ref('');
const confirmacion = ref('');
const enviando = ref(false);
// Se recupero lo que habia escrito: se dice, y se ofrece empezar de cero.
const recuperado = ref(false);
// Del borrador: los campos de la plantilla, por poner cuando el parser exista.
let camposGuardados = null;
let restaurando = false;

const opcionesDeBandeja = computed(() =>
  (bandejas.value || []).map(b => ({
    value: b.id,
    label: b.phone_number ? `${b.name} (${b.phone_number})` : b.name,
  }))
);
const plantillas = computed(() =>
  inboxId.value ? plantillasDe.value(inboxId.value) : []
);
const opcionesPlantilla = computed(() => [
  { value: '', label: 'Elige una plantilla…' },
  ...opcionesDePlantilla(plantillas.value),
]);
const claveDe = p => (p ? `${p.name}|${p.language}` : '');
// La que ya esta copiada no se toca aunque el almacen se recargue: solo cambia
// si se elige otra.
watch(
  [plantilla, plantillas],
  () => {
    if (!plantilla.value) {
      laPlantilla.value = null;
      return;
    }
    if (claveDe(laPlantilla.value) === plantilla.value) return;
    const p = plantillaElegida(plantillas.value, plantilla.value);
    laPlantilla.value = p ? JSON.parse(JSON.stringify(p)) : null;
  },
  { immediate: true }
);
const params = computed(() => parserRef.value?.processedParams || {});
const pideNombre = computed(() => usaNombre(params.value));
const plantillaLista = computed(
  () => !!laPlantilla.value && parserRef.value?.isFormInvalid === false
);
const aLaVista = computed(() =>
  (audiencia.value?.destinatarios || []).slice(0, A_LA_VISTA)
);
// El mensaje se ensena como le llega a la primera persona de la lista, si ya
// se vio la lista: con su nombre donde se escribio {nombre}.
const ejemplo = computed(() => {
  const d = audiencia.value?.destinatarios?.[0];
  if (!d) return null;
  return {
    quien: d.nombre || d.telefono || (d.usuario ? `@${d.usuario}` : ''),
    persona: personaDeEjemplo(d, sinNombre.value),
  };
});
// Lo que falta para poder enviar, dicho: el boton apagado sin mas parece un fallo.
const falta = computed(() =>
  queFalta({
    audiencia: audiencia.value,
    hayPlantillas: plantillas.value.length > 0,
    plantilla: laPlantilla.value,
    plantillaLista: plantillaLista.value,
    pideNombre: pideNombre.value,
    sinNombre: sinNombre.value,
    titulo: titulo.value,
    confirmacion: confirmacion.value,
  })
);
const puedeEnviar = computed(() => falta.value.length === 0);

const cuenta = () => route.params.accountId;

function limpiar() {
  modo.value = 'filtros';
  lista.value = '';
  filas.value = [];
  audiencia.value = null;
  errorDeAudiencia.value = '';
  plantilla.value = '';
  sinNombre.value = '';
  titulo.value = '';
  confirmacion.value = '';
  camposGuardados = null;
  recuperado.value = false;
}

/** Lo que habia escrito, de vuelta en el formulario. */
function restaurar(b) {
  // Cambiar de bandeja borra la plantilla elegida; al restaurar, no.
  restaurando = true;
  modo.value = b.modo === 'lista' ? 'lista' : 'filtros';
  lista.value = typeof b.lista === 'string' ? b.lista : '';
  filas.value = Array.isArray(b.filas) ? b.filas : [];
  if (b.inboxId) inboxId.value = b.inboxId;
  plantilla.value = b.plantilla || '';
  camposGuardados = b.plantilla
    ? { clave: b.plantilla, valores: b.params }
    : null;
  sinNombre.value = b.sinNombre || '';
  titulo.value = b.titulo || '';
  recuperado.value = true;
  nextTick(() => {
    restaurando = false;
  });
}

function empezar() {
  limpiar();
  const b = leerBorrador(cuenta());
  if (borradorConAlgo(b)) restaurar(b);
  vista.value = 'nuevo';
}

function empezarDeCero() {
  guardarBorrador(cuenta(), null);
  limpiar();
  if (filtroRef.value) filas.value = [filtroRef.value.filaNueva()];
}

// El numero por el que sale: el primero, o el que hubiera si sigue existiendo.
watch(
  () => [vista.value, bandejas.value],
  () => {
    if (vista.value !== 'nuevo' || !bandejas.value?.length) return;
    if (!bandejas.value.some(b => b.id === inboxId.value))
      inboxId.value = bandejas.value[0].id;
  },
  { immediate: true }
);

// Los campos de la plantilla que estaban escritos, en cuanto el parser existe.
watch(parserRef, async () => {
  if (!parserRef.value || !camposGuardados) return;
  const { clave, valores } = camposGuardados;
  camposGuardados = null;
  if (clave !== plantilla.value) return;
  // El parser pone sus campos vacios al montarse: se espera a que lo haga.
  await nextTick();
  if (parserRef.value) volcarValores(parserRef.value.processedParams, valores);
});

// El borrador: todo lo escrito menos la lista de destinatarios y el ENVIAR.
const borrador = computed(() => ({
  modo: modo.value,
  lista: lista.value,
  inboxId: inboxId.value,
  filas: filas.value,
  plantilla: plantilla.value,
  // Hasta que el parser existe, los que se trajeron: que no se pierdan.
  params: parserRef.value ? params.value : camposGuardados?.valores || {},
  sinNombre: sinNombre.value,
  titulo: titulo.value,
}));
watch(
  borrador,
  b => {
    if (vista.value === 'nuevo')
      guardarBorrador(cuenta(), { ...b, abierto: true });
  },
  { deep: true }
);

// La primera fila se pone cuando el filtro ya sabe que atributos hay.
watch(
  () => [vista.value, filtroRef.value],
  () => {
    if (vista.value === 'nuevo' && filtroRef.value && !filas.value.length) {
      filas.value = [filtroRef.value.filaNueva()];
    }
  }
);

// Otra bandeja, otro filtro u otra lista: lo que se vio ya no vale. `pedido`
// descarta la respuesta de una busqueda que se quedo vieja mientras llegaba.
let pedido = 0;
watch(
  [inboxId, filas, modo, lista],
  () => {
    pedido += 1;
    audiencia.value = null;
    confirmacion.value = '';
  },
  { deep: true }
);
watch(inboxId, () => {
  if (!restaurando) plantilla.value = '';
});

async function verAQuienesDeLaLista() {
  if (!lista.value.trim()) {
    errorDeAudiencia.value = 'Escribe o pega al menos un número.';
    return;
  }
  buscando.value = true;
  const este = pedido;
  try {
    const r = await api.value.audienciaDeLista(inboxId.value, lista.value);
    // El texto de a quienes lo pone la API ("Lista escrita a mano: 35 números").
    if (este === pedido) audiencia.value = { ...r, texto: null };
  } catch (e) {
    errorDeAudiencia.value = e.message;
  } finally {
    buscando.value = false;
  }
}

async function verAQuienes() {
  if (buscando.value) return;
  errorDeAudiencia.value = '';
  if (modo.value === 'lista') {
    await verAQuienesDeLaLista();
    return;
  }
  const tipos = filtroRef.value?.tipos || [];
  if (!filtroRef.value?.validar()) {
    errorDeAudiencia.value = 'Hay un filtro sin terminar: elige su valor.';
    return;
  }
  const utiles = filasConValor(filas.value, tipos);
  if (!utiles.length) {
    errorDeAudiencia.value = 'Elige al menos un filtro.';
    return;
  }
  buscando.value = true;
  const este = pedido;
  try {
    const r = await api.value.audiencia(
      inboxId.value,
      consultaDeFiltros(utiles)
    );
    if (este === pedido)
      audiencia.value = { ...r, texto: textoDeFiltros(utiles, tipos) };
  } catch (e) {
    errorDeAudiencia.value = e.message;
  } finally {
    buscando.value = false;
  }
}

async function enviar() {
  if (!puedeEnviar.value || enviando.value) return;
  enviando.value = true;
  try {
    const creado = await api.value.crear({
      inboxId: inboxId.value,
      audienciaId: audiencia.value.audienciaId,
      titulo: titulo.value.trim(),
      plantilla: {
        nombre: laPlantilla.value.name,
        idioma: laPlantilla.value.language,
      },
      params: JSON.parse(JSON.stringify(params.value)),
      sinNombre: sinNombre.value.trim(),
      filtrosTexto: audiencia.value.texto,
    });
    useAlert(
      creado.estado === 'PENDING_APPROVAL'
        ? 'Solicitud enviada: saldrá cuando un administrador la apruebe.'
        : `El envío a ${creado.total} personas ya está saliendo.`
    );
    guardarBorrador(cuenta(), null);
    detalle.value = creado;
    vista.value = 'detalle';
  } catch (e) {
    useAlert(`No se envió: ${e.message}`);
  } finally {
    enviando.value = false;
  }
}

function volver() {
  // Salir del formulario a proposito: lo escrito se guarda, pero al volver a
  // la pagina se abre la lista y no el formulario.
  if (vista.value === 'nuevo') {
    guardarBorrador(cuenta(), { ...borrador.value, abierto: false });
  }
  vista.value = 'lista';
  detalle.value = null;
  dejarDeDecidir();
  cargarLista();
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  // Lo que necesitan los filtros y las plantillas.
  store.dispatch('inboxes/get');
  store.dispatch('labels/get');
  store.dispatch('agents/get');
  store.dispatch('attributes/get');
  reloj = setInterval(alDia, CADA_MS);
  // Se estaba escribiendo un envio y la pagina se volvio a montar (se fue a
  // mirar un chat, se recargo): se sigue donde estaba.
  const b = leerBorrador(cuenta());
  if (b?.abierto && borradorConAlgo(b)) empezar();
});
onBeforeUnmount(() => clearInterval(reloj));

// La configuracion del CRM llega con las apps: hasta entonces no hay a quien pedir.
watch(
  () => !!leadAppConfig(apps.value),
  hay => {
    if (hay) cargarLista();
  },
  { immediate: true }
);

const chatDe = d =>
  `/app/accounts/${route.params.accountId}/conversations/${d.conversationId}`;

const CAMPO_DE_TEXTO =
  'block w-full !mb-0 px-3 py-2 text-sm rounded-lg border-0 outline outline-1 -outline-offset-1 outline-n-weak hover:outline-n-slate-6 focus:outline-n-brand bg-n-alpha-black2 text-n-slate-12 placeholder:text-n-slate-10';

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
const AVISO = 'flex gap-3 px-4 py-3 text-sm rounded-lg';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    class="w-full px-6 overflow-auto bg-n-surface-1"
    data-turuta="mensajes-masivos"
  >
    <div class="max-w-4xl pb-24 mx-auto">
      <ReportHeader
        header-title="Mensajes masivos"
        header-description="El mismo mensaje de WhatsApp a todos los chats que cumplen un filtro, o a una lista de números."
      />

      <!-- ============================================== los envios hechos -->
      <div v-if="vista === 'lista'" class="flex flex-col gap-4">
        <div class="flex justify-end">
          <Button
            label="Nuevo envío"
            icon="i-lucide-send"
            data-turuta="nuevo-envio"
            @click="empezar"
          />
        </div>

        <p v-if="errorDeLista" class="mb-0 text-sm text-n-ruby-11">
          {{ errorDeLista }}
        </p>
        <p v-else-if="cargando" class="mb-0 text-sm text-n-slate-10">
          Cargando…
        </p>
        <section v-else-if="!envios.length" :class="TARJETA">
          <p class="mb-1 text-sm font-medium text-n-slate-12">
            Todavía no hay ningún envío
          </p>
          <p class="mb-0 text-sm text-n-slate-11">
            Con «Nuevo envío» eliges a quiénes (por etapa, etiquetas, asesor o
            cualquier filtro de los chats, o pegando una lista de números), la
            plantilla, y sale a todos.
          </p>
        </section>

        <button
          v-for="e in envios"
          :key="e.id"
          type="button"
          class="w-full text-start hover:outline-n-slate-6"
          :class="TARJETA"
          data-turuta="envio"
          @click="abrir(e.id)"
        >
          <span class="flex flex-wrap items-center gap-2 mb-1">
            <span class="text-sm font-medium text-n-slate-12">
              {{ e.titulo }}
            </span>
            <span
              class="px-2 py-0.5 text-xs rounded-md"
              :class="ESTADO_DE_ENVIO[e.estado]?.clase"
            >
              {{ ESTADO_DE_ENVIO[e.estado]?.texto || e.estado }}
              <template v-if="e.estado === 'SENDING'">
                · {{ avance(e) }} %
              </template>
            </span>
          </span>
          <span class="block text-xs text-n-slate-10">
            {{ fechaCorta(e.creadoEn) }}
            <template v-if="e.creadoPor"> · {{ e.creadoPor }}</template>
            · plantilla {{ e.plantilla }}
          </span>
          <span
            v-if="e.estado === 'PENDING_APPROVAL'"
            class="block mt-2 text-sm text-n-slate-11"
          >
            {{ e.total }} personas · no sale nada hasta que
            {{ yo.admin ? 'lo apruebes' : 'un administrador lo apruebe' }}
          </span>
          <span v-else class="block mt-2 text-sm text-n-slate-11">
            {{ e.total }} personas · {{ e.conteos.enviados }} enviados ·
            {{ e.conteos.entregados }} entregados ·
            {{ e.conteos.leidos }} leídos
            <span v-if="e.conteos.fallidos" class="text-n-ruby-11">
              · {{ e.conteos.fallidos }} no llegaron
            </span>
          </span>
        </button>

        <!-- Quien envia sin pedir aprobacion: lo decide un administrador -->
        <details
          v-if="yo.admin && asesores.length"
          :class="TARJETA"
          data-turuta="permisos"
        >
          <summary class="text-sm font-medium cursor-pointer text-n-slate-12">
            Aprobación de los envíos de los asesores
          </summary>
          <p class="mt-3 mb-3 text-sm text-n-slate-11">
            El envío de un asesor no sale hasta que un administrador lo aprueba.
            Marca a quien pueda enviar directamente, sin pedir aprobación.
          </p>
          <label
            v-for="a in asesores"
            :key="a.id"
            class="flex items-center gap-2 mb-2 text-sm text-n-slate-12"
          >
            <input
              type="checkbox"
              class="!m-0"
              :checked="directos.includes(a.id)"
              :disabled="guardandoPermiso === a.id"
              @change="cambiarPermiso(a, $event.target.checked)"
            />
            {{ a.available_name || a.name }}
            <span class="text-xs text-n-slate-10">
              {{
                directos.includes(a.id)
                  ? 'envía directamente'
                  : 'pide aprobación'
              }}
            </span>
          </label>
        </details>
      </div>

      <!-- ====================================================== uno nuevo -->
      <div v-else-if="vista === 'nuevo'" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <Button
            label="Volver a los envíos"
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="slate"
            size="sm"
            @click="volver"
          />
          <span class="grow" />
          <template v-if="recuperado">
            <span class="text-xs text-n-slate-10">
              Recuperamos lo que tenías escrito.
            </span>
            <Button
              label="Empezar de cero"
              variant="ghost"
              color="slate"
              size="sm"
              data-turuta="de-cero"
              @click="empezarDeCero"
            />
          </template>
        </div>

        <section
          v-if="!opcionesDeBandeja.length"
          class="text-sm text-n-slate-11"
          :class="[TARJETA]"
        >
          Esta cuenta no tiene ningún número de WhatsApp conectado. Los mensajes
          masivos solo salen por WhatsApp.
        </section>

        <template v-else>
          <section class="flex flex-col gap-4" :class="TARJETA">
            <h3 class="mb-0 text-base font-medium text-n-slate-12">
              1. ¿A quiénes?
            </h3>
            <CampoSelect
              v-if="opcionesDeBandeja.length > 1"
              v-model="inboxId"
              :options="opcionesDeBandeja"
              label="Número por el que sale"
              ayuda="Solo les llega a los chats de ese número."
            />
            <div class="flex flex-wrap gap-2">
              <Button
                label="Por filtros"
                icon="i-lucide-list-filter"
                size="sm"
                :variant="modo === 'filtros' ? 'faded' : 'ghost'"
                :color="modo === 'filtros' ? 'blue' : 'slate'"
                data-turuta="modo-filtros"
                @click="modo = 'filtros'"
              />
              <Button
                label="Lista de números"
                icon="i-lucide-list-ordered"
                size="sm"
                :variant="modo === 'lista' ? 'faded' : 'ghost'"
                :color="modo === 'lista' ? 'blue' : 'slate'"
                data-turuta="modo-lista"
                @click="modo = 'lista'"
              />
            </div>
            <!-- v-show y no v-if: el filtro guarda sus filas mientras se mira la lista -->
            <div v-show="modo === 'filtros'" class="flex flex-col gap-4">
              <p class="mb-0 text-sm text-n-slate-11">
                Los mismos filtros que en la lista de chats, sobre los chats que
                tú ves ahí. Con varios, «y» exige todos y «o» cualquiera.
              </p>
              <FiltroDeAudiencia ref="filtroRef" v-model="filas" />
            </div>
            <label v-if="modo === 'lista'" class="flex flex-col gap-1 mb-0">
              <span class="mb-0.5 text-heading-3 text-n-slate-12">
                Números de WhatsApp
              </span>
              <textarea
                v-model="lista"
                rows="6"
                :class="CAMPO_DE_TEXTO"
                data-turuta="lista"
                placeholder="987654321, 912345678, +51 999 888 777"
              />
              <span class="text-xs text-n-slate-10">
                Escríbelos o pégalos como los tengas: separados por comas,
                espacios o uno por línea. A un celular de Perú sin prefijo se le
                pone el +51; los de otro país, con su código. Quien ya está en
                el CRM lo recibe en su chat de siempre; a un número nuevo se le
                abre un chat al enviar.
              </span>
            </label>
            <div class="flex flex-wrap items-center gap-3">
              <Button
                label="Ver a quiénes les llega"
                icon="i-lucide-users"
                variant="faded"
                color="slate"
                data-turuta="ver-audiencia"
                :is-loading="buscando"
                @click="verAQuienes"
              />
              <span v-if="buscando" class="text-xs text-n-slate-10">
                Con muchos chats puede tardar un minuto.
              </span>
            </div>
            <p v-if="errorDeAudiencia" class="mb-0 text-sm text-n-ruby-11">
              {{ errorDeAudiencia }}
            </p>

            <div
              v-if="audiencia"
              class="flex flex-col gap-3 p-4 rounded-lg bg-n-alpha-1"
              data-turuta="audiencia"
            >
              <p class="mb-0 text-sm font-medium text-n-slate-12">
                <template v-if="audiencia.total === 1">
                  Le llega a 1 persona
                </template>
                <template v-else>
                  Les llega a {{ audiencia.total }} personas
                </template>
              </p>
              <p v-if="audiencia.nuevos" class="mb-0 text-xs text-n-slate-11">
                {{ audiencia.nuevos }}
                {{
                  audiencia.nuevos === 1
                    ? 'es un número nuevo: se le'
                    : 'son números nuevos: se les'
                }}
                abre un chat en el CRM al enviar, y aparece en la lista de chats
                cuando conteste.
              </p>
              <p
                v-if="audiencia.fuera.otraBandeja || audiencia.fuera.repetidos"
                class="mb-0 text-xs text-n-slate-10"
              >
                <template v-if="audiencia.fuera.otraBandeja">
                  {{ audiencia.fuera.otraBandeja }} chats cumplen el filtro pero
                  son de otro número o de otra red, y no reciben nada.
                </template>
                <template v-if="audiencia.fuera.repetidos">
                  {{ audiencia.fuera.repetidos }}
                  {{
                    audiencia.fuera.repetidos === 1
                      ? 'estaba repetido'
                      : 'estaban repetidos'
                  }}: cada persona recibe uno solo.
                </template>
              </p>
              <p
                v-if="audiencia.fuera.deOtroAsesor"
                class="mb-0 text-xs text-n-slate-10"
              >
                {{ audiencia.fuera.deOtroAsesor }}
                {{
                  audiencia.fuera.deOtroAsesor === 1
                    ? 'es un lead de otro asesor y no recibe'
                    : 'son leads de otro asesor y no reciben'
                }}
                nada.
              </p>
              <p
                v-if="audiencia.fuera.noReconocidos?.length"
                class="mb-0 text-xs text-n-ruby-11"
                data-turuta="no-reconocidos"
              >
                {{
                  audiencia.fuera.noReconocidos.length === 1
                    ? 'Una entrada no es un número'
                    : `${audiencia.fuera.noReconocidos.length} entradas no son un número`
                }}
                y no reciben nada:
                {{ audiencia.fuera.noReconocidos.slice(0, 10).join(' · ') }}
                <template v-if="audiencia.fuera.noReconocidos.length > 10">
                  …
                </template>
              </p>
              <p
                v-if="audiencia.fuera.usuariosSinChat?.length"
                class="mb-0 text-xs text-n-ruby-11"
              >
                WhatsApp solo deja escribirle por su usuario a quien ya escribió
                a este número. No reciben nada:
                {{
                  audiencia.fuera.usuariosSinChat
                    .slice(0, 10)
                    .map(u => `@${u}`)
                    .join(' · ')
                }}
              </p>
              <div
                v-if="audiencia.total"
                class="overflow-auto max-h-72 rounded-md outline outline-1 outline-n-weak"
              >
                <table class="w-full text-sm">
                  <thead class="text-xs text-n-slate-10">
                    <tr>
                      <th class="px-3 py-2 font-medium text-start">Nombre</th>
                      <th class="px-3 py-2 font-medium text-start">Número</th>
                      <th class="px-3 py-2 font-medium text-start">Etapa</th>
                      <th class="px-3 py-2 font-medium text-start">Asesor</th>
                    </tr>
                  </thead>
                  <tbody class="text-n-slate-12">
                    <tr
                      v-for="d in aLaVista"
                      :key="d.conversationId || d.telefono"
                      class="border-t border-n-weak"
                    >
                      <td class="px-3 py-1.5">{{ d.nombre || '—' }}</td>
                      <td class="px-3 py-1.5">
                        {{ d.telefono || (d.usuario ? `@${d.usuario}` : '—') }}
                      </td>
                      <td class="px-3 py-1.5">
                        {{ d.etapa || (d.conversationId ? '—' : 'Nuevo') }}
                      </td>
                      <td class="px-3 py-1.5">{{ d.asesor || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p
                v-if="audiencia.total > aLaVista.length"
                class="mb-0 text-xs text-n-slate-10"
              >
                y {{ audiencia.total - aLaVista.length }} más.
              </p>
            </div>
          </section>

          <section class="flex flex-col gap-4" :class="TARJETA">
            <h3 class="mb-0 text-base font-medium text-n-slate-12">
              2. ¿Qué mensaje?
            </h3>
            <div
              v-if="!plantillas.length"
              class="bg-n-amber-2 text-n-amber-11"
              :class="[AVISO]"
            >
              <Icon
                icon="i-lucide-triangle-alert"
                class="flex-none mt-0.5 size-4"
              />
              <div>
                <p class="mb-1 font-medium">
                  Este número no tiene plantillas aprobadas
                </p>
                <p class="mb-0">
                  WhatsApp solo deja escribirle a alguien que lleva más de 24
                  horas sin escribir con una plantilla aprobada por Meta. Se
                  crean en
                  <a
                    href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline"
                  >
                    WhatsApp Manager → Plantillas de mensajes
                  </a>
                  y, una vez aprobadas, aparecen aquí en unas horas.
                </p>
              </div>
            </div>
            <template v-else>
              <CampoSelect
                v-model="plantilla"
                :options="opcionesPlantilla"
                label="Plantilla"
                ayuda="Las aprobadas por Meta para este número. Cada mensaje de plantilla lo cobra Meta."
              />
              <template v-if="laPlantilla">
                <div class="flex flex-col gap-2">
                  <p class="mb-0 text-heading-3 text-n-slate-12">
                    Así le llega
                  </p>
                  <VistaDeMensaje
                    :componentes="laPlantilla.components"
                    :params="params"
                    :persona="ejemplo?.persona"
                  />
                  <p class="mb-0 text-xs text-n-slate-10">
                    <template v-if="pideNombre && ejemplo">
                      Como le llega a {{ ejemplo.quien }}, la primera persona de
                      la lista. A cada una le sale su nombre.
                    </template>
                    <template v-else-if="pideNombre">
                      Donde dice {{ CAMPO_NOMBRE }} sale el nombre de cada
                      persona. Pulsa «Ver a quiénes les llega» para verlo con la
                      primera de la lista.
                    </template>
                    Categoría {{ laPlantilla.category }}, idioma
                    {{ laPlantilla.language }}.
                  </p>
                </div>
                <p class="mb-0 text-sm text-n-slate-11">
                  Para que en un campo salga el nombre de cada persona, escribe
                  <code class="px-1 rounded bg-n-alpha-2">{{
                    CAMPO_NOMBRE
                  }}</code>
                  en ese campo.
                </p>
                <!-- Del parser de Chatwoot, solo los campos: su recuadro con el
                     texto se esconde, que arriba esta el mensaje entero -->
                <div class="[&>div>div:first-child]:hidden">
                  <WhatsAppTemplateParser
                    ref="parserRef"
                    :key="plantilla"
                    :template="laPlantilla"
                  />
                </div>
                <Input
                  v-if="pideNombre"
                  v-model="sinNombre"
                  label="Si el contacto no tiene nombre, poner (obligatorio)"
                  placeholder="vecino"
                  :message="
                    sinNombre.trim()
                      ? 'Un contacto sin guardar se llama como su número. En su lugar sale esto.'
                      : 'Falta llenarlo: un contacto sin guardar se llama como su número, y en su lugar sale lo que pongas aquí.'
                  "
                  :message-type="sinNombre.trim() ? 'info' : 'error'"
                />
              </template>
            </template>
          </section>

          <section class="flex flex-col gap-4" :class="TARJETA">
            <h3 class="mb-0 text-base font-medium text-n-slate-12">
              3. {{ yo.directo ? 'Enviar' : 'Solicitar el envío' }}
            </h3>
            <div
              v-if="!yo.directo"
              class="bg-n-blue-2 text-n-blue-11"
              :class="[AVISO]"
              data-turuta="pide-aprobacion"
            >
              <Icon
                icon="i-lucide-shield-check"
                class="flex-none mt-0.5 size-4"
              />
              <p class="mb-0">
                Tu envío necesita la aprobación de un administrador. Al
                solicitarlo queda en espera y no sale nada hasta que lo apruebe;
                mientras tanto lo puedes retirar.
              </p>
            </div>
            <Input
              v-model="titulo"
              label="Nombre del envío"
              placeholder="Promoción de noviembre"
              message="Solo para reconocerlo después en la lista. No lo ve el cliente."
            />
            <div class="bg-n-ruby-2 text-n-ruby-11" :class="[AVISO]">
              <Icon
                icon="i-lucide-triangle-alert"
                class="flex-none mt-0.5 size-4"
              />
              <div>
                <p class="mb-1 font-medium">
                  <template v-if="audiencia?.total">
                    Sale a {{ audiencia.total }}
                    {{ audiencia.total === 1 ? 'persona' : 'personas' }}, en
                    {{ cuantoTarda(audiencia.total) }}
                  </template>
                  <template v-else>
                    Primero pulsa «Ver a quiénes les llega»
                  </template>
                </p>
                <p class="mb-0">
                  Un mensaje enviado no se puede retirar, y Meta cobra cada uno.
                  Si muchas personas lo bloquean o lo marcan como spam, Meta
                  baja la calidad del número y puede limitarlo: envía solo a
                  quien espera saber de ustedes.
                </p>
              </div>
            </div>
            <div
              v-if="falta.length"
              class="flex-col bg-n-amber-2 text-n-amber-11"
              :class="[AVISO]"
              data-turuta="falta"
            >
              <p class="mb-0 font-medium">
                Para poder {{ yo.directo ? 'enviar' : 'solicitarlo' }} falta:
              </p>
              <ul class="pl-5 mb-0 list-disc">
                <li v-for="f in falta" :key="f">{{ f }}</li>
              </ul>
            </div>
            <form
              class="flex flex-wrap items-end gap-3"
              @submit.prevent="enviar"
            >
              <div class="grow basis-64">
                <Input
                  v-model="confirmacion"
                  :label="`Escribe ${CONFIRMACION} para ${yo.directo ? 'lanzarlo' : 'solicitarlo'}`"
                  :placeholder="CONFIRMACION"
                />
              </div>
              <Button
                type="submit"
                :label="
                  (yo.directo ? 'Enviar' : 'Solicitar envío') +
                  (audiencia?.total ? ` a ${audiencia.total}` : '')
                "
                icon="i-lucide-send"
                data-turuta="enviar"
                :is-loading="enviando"
                :disabled="!puedeEnviar"
              />
            </form>
          </section>
        </template>
      </div>

      <!-- ================================================ el detalle de uno -->
      <div v-else-if="detalle" class="flex flex-col gap-4">
        <div>
          <Button
            label="Volver a los envíos"
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="slate"
            size="sm"
            @click="volver"
          />
        </div>

        <section class="flex flex-col gap-3" :class="TARJETA">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="mb-0 text-base font-medium text-n-slate-12">
              {{ detalle.titulo }}
            </h3>
            <span
              class="px-2 py-0.5 text-xs rounded-md"
              :class="ESTADO_DE_ENVIO[detalle.estado]?.clase"
            >
              {{ ESTADO_DE_ENVIO[detalle.estado]?.texto || detalle.estado }}
              <template v-if="detalle.estado === 'SENDING'">
                · {{ avance(detalle) }} %
              </template>
            </span>
            <span class="grow" />
            <Button
              v-if="detalle.estado === 'SENDING'"
              label="Cancelar lo que queda"
              icon="i-lucide-octagon-x"
              color="ruby"
              variant="faded"
              size="sm"
              data-turuta="cancelar"
              :is-loading="cancelando"
              @click="cancelar"
            />
            <Button
              v-else-if="detalle.estado === 'PENDING_APPROVAL' && !yo.admin"
              label="Retirar la solicitud"
              icon="i-lucide-undo-2"
              color="slate"
              variant="faded"
              size="sm"
              data-turuta="retirar"
              :is-loading="cancelando"
              @click="cancelar"
            />
          </div>

          <!-- Espera aprobacion: el administrador decide; el asesor espera -->
          <div
            v-if="detalle.estado === 'PENDING_APPROVAL'"
            class="flex-col bg-n-blue-2 text-n-blue-11"
            :class="[AVISO]"
            data-turuta="por-aprobar"
          >
            <template v-if="yo.admin">
              <p class="mb-0 font-medium">
                {{ detalle.creadoPor || 'Un asesor' }} pide enviar este mensaje
                a {{ detalle.total }}
                {{ detalle.total === 1 ? 'persona' : 'personas' }}
              </p>
              <p class="mb-0">
                Mira abajo el mensaje y a quiénes. No sale nada hasta que lo
                apruebes; Meta cobra cada mensaje y no se puede retirar.
              </p>
              <div
                v-if="!aprobando && !rechazando"
                class="flex flex-wrap gap-2"
              >
                <Button
                  label="Aprobar y enviar"
                  icon="i-lucide-check"
                  size="sm"
                  data-turuta="aprobar"
                  @click="aprobando = true"
                />
                <Button
                  label="No aprobar"
                  icon="i-lucide-x"
                  color="ruby"
                  variant="faded"
                  size="sm"
                  data-turuta="no-aprobar"
                  @click="rechazando = true"
                />
              </div>
              <div
                v-else-if="aprobando"
                class="flex flex-wrap items-center gap-2"
              >
                <span class="font-medium">
                  ¿Enviar ahora a {{ detalle.total }}?
                </span>
                <Button
                  :label="`Sí, enviar a ${detalle.total}`"
                  icon="i-lucide-send"
                  size="sm"
                  data-turuta="aprobar-si"
                  :is-loading="decidiendo"
                  @click="aprobar"
                />
                <Button
                  label="Todavía no"
                  variant="ghost"
                  color="slate"
                  size="sm"
                  @click="dejarDeDecidir"
                />
              </div>
              <form
                v-else
                class="flex flex-wrap items-end gap-2"
                @submit.prevent="rechazar"
              >
                <div class="grow basis-64">
                  <Input
                    v-model="razon"
                    label="Por qué no (lo verá quien lo pidió; puede ir vacío)"
                    placeholder="Esa promoción ya terminó"
                  />
                </div>
                <Button
                  type="submit"
                  label="No aprobar"
                  color="ruby"
                  size="sm"
                  data-turuta="no-aprobar-si"
                  :is-loading="decidiendo"
                />
                <Button
                  type="button"
                  label="Volver"
                  variant="ghost"
                  color="slate"
                  size="sm"
                  @click="dejarDeDecidir"
                />
              </form>
            </template>
            <template v-else>
              <p class="mb-0 font-medium">
                Esperando la aprobación de un administrador
              </p>
              <p class="mb-0">
                No sale nada hasta que lo apruebe. Avísale: lo ve en esta misma
                página, arriba de la lista.
              </p>
            </template>
          </div>
          <p
            v-if="detalle.estado === 'REJECTED'"
            class="mb-0 text-sm text-n-ruby-11"
            data-turuta="rechazado"
          >
            {{ detalle.rechazadoPor || 'Un administrador' }} no lo aprobó y no
            salió ningún mensaje.
            <template v-if="detalle.razonDelRechazo">
              Motivo: {{ detalle.razonDelRechazo }}
            </template>
          </p>
          <p class="mb-0 text-xs text-n-slate-10">
            {{ fechaCorta(detalle.creadoEn) }}
            <template v-if="detalle.creadoPor">
              · {{ detalle.creadoPor }}
            </template>
            <template v-if="detalle.aprobadoPor">
              · aprobado por {{ detalle.aprobadoPor }}
            </template>
            · plantilla {{ detalle.plantilla }}
          </p>
          <p v-if="detalle.filtros" class="mb-0 text-sm text-n-slate-11">
            A quiénes: {{ detalle.filtros }}
          </p>
          <template v-if="detalle.componentes?.length">
            <VistaDeMensaje
              :componentes="detalle.componentes"
              :params="detalle.params"
            />
            <p
              v-if="usaNombre(detalle.params)"
              class="mb-0 text-xs text-n-slate-10"
            >
              Donde dice {{ CAMPO_NOMBRE }} sale el nombre de cada persona.
            </p>
          </template>
          <p
            v-else
            class="p-3 mb-0 text-sm whitespace-pre-wrap rounded-lg bg-n-alpha-1 text-n-slate-12"
          >
            {{ detalle.texto }}
          </p>
          <dl class="grid grid-cols-2 gap-3 mb-0 sm:grid-cols-5">
            <div
              v-for="c in [
                ['Personas', detalle.total],
                ['Enviados', detalle.conteos.enviados],
                ['Entregados', detalle.conteos.entregados],
                ['Leídos', detalle.conteos.leidos],
                ['No llegaron', detalle.conteos.fallidos],
              ]"
              :key="c[0]"
              class="p-3 rounded-lg bg-n-alpha-1"
            >
              <dt class="text-xs text-n-slate-10">{{ c[0] }}</dt>
              <dd class="mb-0 text-lg font-medium text-n-slate-12">
                {{ c[1] }}
              </dd>
            </div>
          </dl>
          <p class="mb-0 text-xs text-n-slate-10">
            <template v-if="detalle.conteos.pendientes">
              Quedan {{ detalle.conteos.pendientes }} en cola.
            </template>
            <template v-if="detalle.conteos.cancelados">
              {{ detalle.conteos.cancelados }} se cancelaron antes de salir.
            </template>
            «Entregado» y «Leído» se van poniendo al día solos durante los días
            siguientes; quien tiene apagada la confirmación de lectura se queda
            en «Entregado».
          </p>
        </section>

        <section :class="TARJETA">
          <div
            class="overflow-auto rounded-md outline outline-1 outline-n-weak"
          >
            <table class="w-full text-sm">
              <thead class="text-xs text-n-slate-10">
                <tr>
                  <th class="px-3 py-2 font-medium text-start">Nombre</th>
                  <th class="px-3 py-2 font-medium text-start">Número</th>
                  <th class="px-3 py-2 font-medium text-start">Estado</th>
                  <th class="px-3 py-2 font-medium text-start" />
                </tr>
              </thead>
              <tbody class="text-n-slate-12">
                <tr
                  v-for="d in detalle.destinatarios"
                  :key="d.id || d.conversationId"
                  class="border-t border-n-weak"
                >
                  <td class="px-3 py-1.5">{{ d.nombre || '—' }}</td>
                  <td class="px-3 py-1.5">{{ d.telefono || '—' }}</td>
                  <td class="px-3 py-1.5">
                    <span :class="ESTADO_DE_MENSAJE[d.estado]?.clase">
                      {{ ESTADO_DE_MENSAJE[d.estado]?.texto || d.estado }}
                    </span>
                    <span v-if="d.error" class="block text-xs text-n-slate-10">
                      {{ d.error }}
                    </span>
                  </td>
                  <td class="px-3 py-1.5 text-end">
                    <RouterLink
                      v-if="d.conversationId"
                      :to="chatDe(d)"
                      class="text-n-blue-11"
                    >
                      Ver chat
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
