<script setup>
// [turuta] Pagina "IA": lo que hizo la IA, el interruptor por bandeja y lo que
// dice de la empresa. Contra nuestra API (dashboard-app/ai), con el token del
// panel: el administrador no necesita entrar a la maquina.
//
// Lo que NO se edita aqui es lo fijo del prompt (como habla, el orden de lo
// que hace, lo que no hace nunca): eso es codigo. Se puede leer entero con el
// boton "Ver el prompt". Manual: docs/16-manual-ia.md en crm-inmobi.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import { leadAppConfig, textoError } from './leadApp';
import {
  CAMPOS,
  avisos,
  barrasPorDia,
  cambiosDe,
  cifras,
  dinero,
  formularioDe,
  hayCambios,
  motivos,
} from './ia';

const PERIODOS = [7, 30, 90];

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const config = computed(() => leadAppConfig(apps.value));

const datos = ref(null);
const cargando = ref(false);
const guardando = ref(false);
const error = ref(null);
const dias = ref(30);
const form = ref({});
const prompt = ref(null);

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

const cuenta = () => route.params.accountId;

async function cargar() {
  if (!config.value) {
    error.value = 'config';
    return;
  }
  cargando.value = true;
  error.value = null;
  try {
    datos.value = await pedir(
      `/dashboard-app/ai?accountId=${cuenta()}&dias=${dias.value}`
    );
    form.value = formularioDe(datos.value.config);
  } catch (e) {
    error.value = ['auth', 'config'].includes(e.message)
      ? e.message
      : 'network';
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  cargar();
});

watch(config, (cfg, prev) => {
  if (cfg && !prev) cargar();
});

const metricas = computed(() => datos.value?.metricas || null);
const numeros = computed(() => cifras(metricas.value));
const porMotivo = computed(() => motivos(metricas.value?.porMotivo));
const barras = computed(() => barrasPorDia(metricas.value?.porDia));
const bandejas = computed(() => datos.value?.bandejas || []);
const encendida = computed(() => datos.value?.aiMode === 'QUALIFY');
const listaAvisos = computed(() => avisos(datos.value));
const sinGuardar = computed(() => hayCambios(form.value, datos.value?.config));

function cambiarPeriodo(n) {
  if (dias.value === n) return;
  dias.value = n;
  cargar();
}

async function accion(fn, exito) {
  if (guardando.value) return;
  guardando.value = true;
  try {
    await fn();
    await cargar();
    if (exito) useAlert(exito);
  } catch (e) {
    useAlert(
      e.message === 'auth'
        ? 'No se pudo autenticar contra el CRM'
        : `No se pudo completar: ${e.message}`
    );
  } finally {
    guardando.value = false;
  }
}

/** Encender o apagar entera. Al encender, en todas las bandejas. */
function cambiarModo(quiero) {
  const texto = quiero
    ? 'La IA atenderá los chats nuevos de todas las bandejas.'
    : 'La IA dejará de atender. Los chats que tenía a medias pasan a un asesor.';
  // eslint-disable-next-line no-alert
  if (!window.confirm(texto)) return;
  accion(
    () =>
      pedir('/dashboard-app/ai/mode', {
        method: 'PUT',
        body: JSON.stringify({
          accountId: Number(cuenta()),
          mode: quiero ? 'QUALIFY' : 'OFF',
        }),
      }),
    quiero ? 'La IA está encendida.' : 'La IA está apagada.'
  );
}

/** Encender solo en unas bandejas: las demás quedan apagadas. */
function cambiarBandeja(inboxId, quiero) {
  const ids = bandejas.value
    .filter(b => (b.chatwootInboxId === inboxId ? quiero : b.ia))
    .map(b => b.chatwootInboxId);
  if (!ids.length) {
    cambiarModo(false);
    return;
  }
  accion(
    () =>
      pedir('/dashboard-app/ai/mode', {
        method: 'PUT',
        body: JSON.stringify({
          accountId: Number(cuenta()),
          mode: 'QUALIFY',
          inboxIds: ids,
        }),
      }),
    'Listo.'
  );
}

function guardarConfig() {
  const cambios = cambiosDe(form.value, datos.value?.config);
  if (!Object.keys(cambios).length) return;
  accion(
    () =>
      pedir('/dashboard-app/ai/config', {
        method: 'PUT',
        body: JSON.stringify({ accountId: Number(cuenta()), ...cambios }),
      }),
    'Guardado. La IA lo usa desde el próximo mensaje.'
  );
}

async function verPrompt() {
  if (prompt.value) {
    prompt.value = null;
    return;
  }
  try {
    const r = await pedir(`/dashboard-app/ai/prompt?accountId=${cuenta()}`);
    prompt.value = r.sistema;
  } catch (e) {
    useAlert('No se pudo leer el prompt');
  }
}

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
const CAMPO =
  'block w-full px-3 py-2 mt-1 text-sm rounded-lg border border-n-weak bg-n-alpha-black2 text-n-slate-12 outline-none hover:border-n-slate-6 focus:border-n-strong';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div class="w-full px-6 overflow-auto bg-n-surface-1" data-turuta="ia">
    <div class="max-w-6xl pb-24 mx-auto">
      <ReportHeader
        header-title="IA"
        header-description="Qué hizo la IA con los leads, en qué bandejas atiende y qué sabe de la empresa."
      >
        <div class="flex items-center gap-3">
          <div class="flex gap-1 p-0.5 rounded-lg bg-n-alpha-1">
            <button
              v-for="n in PERIODOS"
              :key="n"
              type="button"
              class="px-2.5 py-1 text-xs rounded-md transition-colors"
              :class="
                n === dias
                  ? 'bg-n-solid-2 text-n-slate-12 font-medium shadow-sm'
                  : 'text-n-slate-11 hover:text-n-slate-12'
              "
              @click="cambiarPeriodo(n)"
            >
              {{ n }} días
            </button>
          </div>
          <Button
            label="Actualizar"
            icon="i-lucide-refresh-cw"
            variant="faded"
            color="slate"
            size="sm"
            :is-loading="cargando"
            @click="cargar"
          />
        </div>
      </ReportHeader>

      <p v-if="error" class="text-sm text-n-slate-11" :class="TARJETA">
        {{ textoError(error) }}
      </p>
      <p v-else-if="!datos" class="text-sm text-n-slate-11" :class="TARJETA">
        Cargando...
      </p>

      <div v-else class="flex flex-col gap-4">
        <!-- Interruptor y avisos -->
        <section :class="TARJETA">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="min-w-0">
              <h2
                class="flex items-center gap-2 mb-1 text-lg font-medium text-n-slate-12"
              >
                <span
                  class="rounded-full size-2.5"
                  :class="encendida ? 'bg-n-teal-9' : 'bg-n-slate-8'"
                />
                {{ encendida ? 'La IA está atendiendo' : 'La IA está apagada' }}
              </h2>
              <p class="mb-0 text-sm text-n-slate-11">
                Atiende a los leads nuevos hasta calificarlos. Un asesor puede
                pausarla en un chat desde la ficha del lead.
              </p>
            </div>
            <Button
              :label="encendida ? 'Apagar la IA' : 'Encender la IA'"
              :icon="encendida ? 'i-lucide-power-off' : 'i-lucide-power'"
              :variant="encendida ? 'faded' : 'solid'"
              :color="encendida ? 'slate' : 'blue'"
              size="sm"
              :disabled="guardando"
              @click="cambiarModo(!encendida)"
            />
          </div>

          <ul
            v-if="listaAvisos.length"
            class="flex flex-col gap-1 mt-4 mb-0 list-none ltr:ml-0 rtl:mr-0"
          >
            <li
              v-for="a in listaAvisos"
              :key="a"
              class="flex items-start gap-2 text-sm text-n-amber-11"
            >
              <Icon
                icon="i-lucide-alert-triangle"
                class="flex-none mt-0.5 size-4"
              />
              <span>{{ a }}</span>
            </li>
          </ul>

          <div class="grid gap-2 mt-4 sm:grid-cols-2">
            <label
              v-for="b in bandejas"
              :key="b.chatwootInboxId"
              class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer bg-n-alpha-1"
            >
              <input
                type="checkbox"
                :checked="b.ia"
                :disabled="guardando"
                @change="
                  cambiarBandeja(b.chatwootInboxId, $event.target.checked)
                "
              />
              <span class="min-w-0">
                <span class="block text-sm truncate text-n-slate-12">
                  {{ b.nombre }}
                </span>
                <span class="block text-xs text-n-slate-10">
                  {{ b.ia ? 'la IA atiende esta bandeja' : 'sin IA' }}
                </span>
              </span>
            </label>
          </div>

          <p class="mt-4 mb-0 text-xs text-n-slate-10">
            Inventario:
            {{
              datos.sitios && datos.sitios.length
                ? datos.sitios.join(' + ')
                : 'ninguna web'
            }}. Las propiedades se editan en
            <span class="text-n-slate-11">Propiedades</span>.
          </p>
        </section>

        <!-- Cifras -->
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article
            v-for="t in [
              {
                id: 'atendidos',
                titulo: 'Leads atendidos',
                valor: numeros.atendidos,
                nota: `${numeros.activos} con la IA ahora`,
                icono: 'i-lucide-messages-square',
                color: 'text-n-blue-11 bg-n-blue-3',
              },
              {
                id: 'calificados',
                titulo: 'Calificados',
                valor: numeros.calificados,
                nota:
                  numeros.tasa === null
                    ? 'todavía ninguno'
                    : `${numeros.tasa} % de los atendidos`,
                icono: 'i-lucide-badge-check',
                color: 'text-n-teal-11 bg-n-teal-3',
              },
              {
                id: 'visitas',
                titulo: 'Pidieron visita',
                valor: numeros.visitas,
                nota: 'las cierra un asesor',
                icono: 'i-lucide-calendar-check',
                color: 'text-n-amber-11 bg-n-amber-3',
              },
              {
                id: 'coste',
                titulo: 'Coste',
                valor: dinero(numeros.costeUsd),
                nota: `${dinero(numeros.costePorLead)} por lead`,
                icono: 'i-lucide-wallet',
                color: 'text-n-slate-11 bg-n-slate-3',
              },
            ]"
            :key="t.id"
            class="flex items-start gap-4"
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
                class="mb-1 text-3xl font-medium leading-none tabular-nums text-n-slate-12"
              >
                {{ t.valor }}
              </p>
              <p class="mb-0 text-xs text-n-slate-10">{{ t.nota }}</p>
            </div>
          </article>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Actividad -->
          <section :class="TARJETA">
            <header class="flex items-baseline justify-between gap-4 mb-5">
              <h2 class="mb-0 text-lg font-medium text-n-slate-12">
                Actividad
              </h2>
              <span class="text-xs text-n-slate-10">
                {{ numeros.turnos }} respuestas · {{ numeros.latenciaMs }} ms de
                media
              </span>
            </header>
            <div class="flex items-end gap-0.5 h-28">
              <div
                v-for="b in barras"
                :key="b.dia"
                class="relative flex-1 group"
                :title="`${b.etiqueta}: ${b.turnos} respuestas, ${dinero(
                  b.costeUsd
                )}`"
              >
                <div
                  class="w-full rounded-t bg-n-brand transition-all duration-500"
                  :style="{ height: `${b.alto}%` }"
                />
              </div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-n-slate-10">
              <span>{{ barras.length ? barras[0].etiqueta : '' }}</span>
              <span>
                {{ barras.length ? barras[barras.length - 1].etiqueta : '' }}
              </span>
            </div>
          </section>

          <!-- Por qué entró una persona -->
          <section :class="TARJETA">
            <header class="flex items-baseline justify-between gap-4 mb-5">
              <h2 class="mb-0 text-lg font-medium text-n-slate-12">
                Por qué entró una persona
              </h2>
            </header>
            <ol
              v-if="porMotivo.length"
              class="flex flex-col gap-3 mb-0 list-none ltr:ml-0 rtl:mr-0"
            >
              <li
                v-for="m in porMotivo"
                :key="m.motivo"
                class="grid items-center gap-3 grid-cols-[11rem_1fr_2.5rem] text-sm"
              >
                <span class="truncate text-n-slate-12" :title="m.texto">
                  {{ m.texto }}
                </span>
                <div class="h-2.5 rounded-full bg-n-alpha-2 overflow-hidden">
                  <div
                    class="h-full transition-all duration-500 rounded-full"
                    :class="m.sigue ? 'bg-n-teal-9' : 'bg-n-slate-8'"
                    :style="{ width: `${m.ancho}%` }"
                  />
                </div>
                <span
                  class="font-medium text-right tabular-nums text-n-slate-12"
                >
                  {{ m.total }}
                </span>
              </li>
            </ol>
            <p v-else class="mb-0 text-sm text-n-slate-11">
              Todavía no ha pasado ningún chat a una persona.
            </p>
            <p class="mt-5 mb-0 text-xs text-n-slate-10">
              En verde, los casos en que la IA sigue atendiendo después de
              avisar al asesor.
            </p>
          </section>
        </div>

        <!-- Lo que la IA sabe de la empresa -->
        <section :class="TARJETA">
          <header
            class="flex flex-wrap items-baseline justify-between gap-2 mb-1"
          >
            <h2 class="mb-0 text-lg font-medium text-n-slate-12">
              Lo que la IA sabe de la empresa
            </h2>
            <button
              type="button"
              class="text-xs text-n-blue-11 hover:underline"
              @click="verPrompt"
            >
              {{ prompt ? 'Ocultar el prompt' : 'Ver el prompt entero' }}
            </button>
          </header>
          <p class="mb-5 text-sm text-n-slate-11">
            Cómo habla y qué hace es fijo. Aquí se cambia lo de esta empresa.
          </p>

          <div class="grid gap-4 md:grid-cols-2">
            <label
              v-for="c in CAMPOS"
              :key="c.clave"
              class="block text-xs font-medium text-n-slate-11"
              :class="c.tipo === 'largo' ? 'md:col-span-2' : ''"
            >
              {{ c.titulo }}
              <select
                v-if="c.tipo === 'opciones'"
                v-model="form[c.clave]"
                :class="CAMPO"
              >
                <option v-for="o in c.opciones" :key="o.valor" :value="o.valor">
                  {{ o.texto }}
                </option>
              </select>
              <textarea
                v-else-if="c.tipo === 'largo'"
                v-model="form[c.clave]"
                rows="5"
                :class="CAMPO"
              />
              <input
                v-else
                v-model="form[c.clave]"
                :type="c.tipo === 'numero' ? 'number' : 'text'"
                :class="CAMPO"
              />
              <span class="block mt-1 font-normal text-n-slate-10">
                {{ c.ayuda }}
              </span>
            </label>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6">
            <span v-if="sinGuardar" class="text-xs text-n-amber-11">
              Hay cambios sin guardar
            </span>
            <Button
              label="Guardar"
              variant="solid"
              color="blue"
              size="sm"
              :disabled="!sinGuardar || guardando"
              :is-loading="guardando"
              @click="guardarConfig"
            />
          </div>

          <textarea
            v-if="prompt"
            :value="prompt"
            readonly
            rows="20"
            class="w-full p-4 mt-4 font-mono text-xs rounded-lg resize-y bg-n-alpha-1 text-n-slate-11"
          />
        </section>
      </div>
    </div>
  </div>
</template>
