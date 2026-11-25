<script setup>
// [turuta] "Mensajes masivos" (administradores y asesores, 25/11): la misma
// plantilla aprobada de WhatsApp a todos los chats que cumplen un filtro.
// Cada persona alcanza los chats que ve en su lista y ve sus propios envios;
// un administrador, todos. Eso lo decide la API con el token del usuario.
// Tres vistas en la misma pagina: los envios hechos, uno nuevo y el detalle
// de uno. Contra nuestra API (dashboard-app/difusiones), que es quien aplica
// el filtro, manda los mensajes poco a poco y mira si llegaron.
//
// Siempre con plantilla: fuera de la ventana de 24 h WhatsApp no admite otra
// cosa. Y con dos frenos antes de enviar: primero se ve a quienes les llega,
// y para lanzarlo hay que escribir ENVIAR.
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
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
import { leadAppConfig } from './leadApp';
import {
  CONFIRMACION,
  HUECO_NOMBRE,
  ESTADO_DE_ENVIO,
  ESTADO_DE_MENSAJE,
  avance,
  clienteDeDifusion,
  consultaDeFiltros,
  cuantoTarda,
  fechaCorta,
  filasConValor,
  opcionesDePlantilla,
  plantillaElegida,
  textoDeFiltros,
  usaNombre,
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

async function cargarLista() {
  try {
    envios.value = (await api.value.lista()).envios || [];
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
  try {
    detalle.value = await api.value.cancelar(detalle.value.id);
    useAlert('Envío cancelado: lo que quedaba en cola ya no sale.');
  } catch (e) {
    useAlert(`No se pudo cancelar: ${e.message}`);
  } finally {
    cancelando.value = false;
  }
}

function volver() {
  vista.value = 'lista';
  detalle.value = null;
  cargarLista();
}

// Mientras algo esta saliendo, la pantalla se pone al dia sola.
let reloj = null;
async function alDia() {
  if (vista.value === 'detalle' && detalle.value?.estado === 'SENDING') {
    try {
      detalle.value = await api.value.detalle(detalle.value.id);
    } catch {
      // La siguiente vuelta lo vuelve a intentar.
    }
  } else if (
    vista.value === 'lista' &&
    envios.value.some(e => e.estado === 'SENDING')
  ) {
    await cargarLista();
  }
}

// ---------------------------------------------------------- un envio nuevo
const inboxId = ref(null);
const filas = ref([]);
const filtroRef = ref(null);
const audiencia = ref(null);
const buscando = ref(false);
const errorDeAudiencia = ref('');
const plantilla = ref('');
const parserRef = ref(null);
const sinNombre = ref('');
const titulo = ref('');
const confirmacion = ref('');
const enviando = ref(false);

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
const laPlantilla = computed(() =>
  plantillaElegida(plantillas.value, plantilla.value)
);
const params = computed(() => parserRef.value?.processedParams || {});
const pideNombre = computed(() => usaNombre(params.value));
const plantillaLista = computed(
  () => !!laPlantilla.value && parserRef.value?.isFormInvalid === false
);
const aLaVista = computed(() =>
  (audiencia.value?.destinatarios || []).slice(0, A_LA_VISTA)
);
const puedeEnviar = computed(
  () =>
    !!audiencia.value?.total &&
    plantillaLista.value &&
    !!titulo.value.trim() &&
    (!pideNombre.value || !!sinNombre.value.trim()) &&
    confirmacion.value.trim().toUpperCase() === CONFIRMACION
);

function empezar() {
  filas.value = [];
  audiencia.value = null;
  errorDeAudiencia.value = '';
  plantilla.value = '';
  sinNombre.value = '';
  titulo.value = '';
  confirmacion.value = '';
  if (!inboxId.value) inboxId.value = bandejas.value?.[0]?.id ?? null;
  vista.value = 'nuevo';
}

// La primera fila se pone cuando el filtro ya sabe que atributos hay.
watch(
  () => [vista.value, filtroRef.value],
  () => {
    if (vista.value === 'nuevo' && filtroRef.value && !filas.value.length) {
      filas.value = [filtroRef.value.filaNueva()];
    }
  }
);

// Otra bandeja u otro filtro: la lista que se vio ya no vale.
watch(
  [inboxId, filas],
  () => {
    audiencia.value = null;
    confirmacion.value = '';
  },
  { deep: true }
);
watch(inboxId, () => {
  plantilla.value = '';
});

async function verAQuienes() {
  if (buscando.value) return;
  errorDeAudiencia.value = '';
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
  try {
    const r = await api.value.audiencia(
      inboxId.value,
      consultaDeFiltros(utiles)
    );
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
    useAlert(`El envío a ${creado.total} personas ya está saliendo.`);
    detalle.value = creado;
    vista.value = 'detalle';
  } catch (e) {
    useAlert(`No se envió: ${e.message}`);
  } finally {
    enviando.value = false;
  }
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  // Lo que necesitan los filtros y las plantillas.
  store.dispatch('inboxes/get');
  store.dispatch('labels/get');
  store.dispatch('agents/get');
  store.dispatch('attributes/get');
  reloj = setInterval(alDia, CADA_MS);
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
        header-description="El mismo mensaje de WhatsApp a todos los chats que cumplen un filtro."
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
            cualquier filtro de los chats), la plantilla, y sale a todos.
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
          <span class="block mt-2 text-sm text-n-slate-11">
            {{ e.total }} personas · {{ e.conteos.enviados }} enviados ·
            {{ e.conteos.entregados }} entregados ·
            {{ e.conteos.leidos }} leídos
            <span v-if="e.conteos.fallidos" class="text-n-ruby-11">
              · {{ e.conteos.fallidos }} no llegaron
            </span>
          </span>
        </button>
      </div>

      <!-- ====================================================== uno nuevo -->
      <div v-else-if="vista === 'nuevo'" class="flex flex-col gap-4">
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
            <p class="mb-0 text-sm text-n-slate-11">
              Los mismos filtros que en la lista de chats, sobre los chats que
              tú ves ahí. Con varios, «y» exige todos y «o» cualquiera.
            </p>
            <FiltroDeAudiencia ref="filtroRef" v-model="filas" />
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
              <p
                v-if="audiencia.fuera.otraBandeja || audiencia.fuera.repetidos"
                class="mb-0 text-xs text-n-slate-10"
              >
                <template v-if="audiencia.fuera.otraBandeja">
                  {{ audiencia.fuera.otraBandeja }} chats cumplen el filtro pero
                  son de otro número o de otra red, y no reciben nada.
                </template>
                <template v-if="audiencia.fuera.repetidos">
                  {{ audiencia.fuera.repetidos }} son otro chat de alguien que
                  ya está en la lista: cada persona recibe uno solo.
                </template>
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
                      :key="d.conversationId"
                      class="border-t border-n-weak"
                    >
                      <td class="px-3 py-1.5">{{ d.nombre || '—' }}</td>
                      <td class="px-3 py-1.5">
                        {{ d.telefono || (d.usuario ? `@${d.usuario}` : '—') }}
                      </td>
                      <td class="px-3 py-1.5">{{ d.etapa || '—' }}</td>
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
                <p class="mb-0 text-sm text-n-slate-11">
                  Para que en un hueco salga el nombre de cada persona, escribe
                  <code class="px-1 rounded bg-n-alpha-2">{{
                    HUECO_NOMBRE
                  }}</code>
                  en ese hueco.
                </p>
                <WhatsAppTemplateParser
                  ref="parserRef"
                  :key="plantilla"
                  :template="laPlantilla"
                />
                <Input
                  v-if="pideNombre"
                  v-model="sinNombre"
                  label="Si el contacto no tiene nombre, poner"
                  placeholder="vecino"
                  message="Un contacto sin guardar se llama como su número. En su lugar sale esto."
                />
              </template>
            </template>
          </section>

          <section class="flex flex-col gap-4" :class="TARJETA">
            <h3 class="mb-0 text-base font-medium text-n-slate-12">
              3. Enviar
            </h3>
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
            <form
              class="flex flex-wrap items-end gap-3"
              @submit.prevent="enviar"
            >
              <div class="grow basis-64">
                <Input
                  v-model="confirmacion"
                  :label="`Escribe ${CONFIRMACION} para lanzarlo`"
                  :placeholder="CONFIRMACION"
                />
              </div>
              <Button
                type="submit"
                :label="
                  audiencia?.total ? `Enviar a ${audiencia.total}` : 'Enviar'
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
          </div>
          <p class="mb-0 text-xs text-n-slate-10">
            {{ fechaCorta(detalle.creadoEn) }}
            <template v-if="detalle.creadoPor">
              · {{ detalle.creadoPor }}
            </template>
            · plantilla {{ detalle.plantilla }}
          </p>
          <p v-if="detalle.filtros" class="mb-0 text-sm text-n-slate-11">
            A quiénes: {{ detalle.filtros }}
          </p>
          <p
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
                  :key="d.conversationId"
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
                    <RouterLink :to="chatDe(d)" class="text-n-blue-11">
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
