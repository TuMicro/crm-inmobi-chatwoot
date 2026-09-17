<script setup>
// [turuta] Pagina "Embudo": leads por etapa y por asesor, desde nuestra API.
// Es una ruta nuestra dentro del dashboard de Chatwoot (turuta/routes.js).
// La configuracion (API y token) sale de la Dashboard App, igual que la ficha.
//
// Misma envoltura y misma cabecera que los informes de Chatwoot (ReportsWrapper,
// ReportHeader) y el mismo estilo de tarjeta (MetricCard), para que no se note el salto
// al pasar de un informe a otro. Los calculos viven en embudo.js.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import { leadAppConfig, textoError } from './leadApp';
import {
  filasConBarra,
  filasPorEtapa,
  iniciales,
  intensidad,
  maximoDeLaTabla,
  ordenarAsesores,
  resumen,
} from './embudo';

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const config = computed(() => leadAppConfig(apps.value));

// Periodo de la seccion "Cierres": el resto de la pagina es una foto de hoy.
const PERIODOS = [7, 30, 90];
const dias = ref(30);

const datos = ref(null);
const cargando = ref(false);
const error = ref(null);

async function cargar() {
  if (!config.value) {
    error.value = 'config';
    return;
  }
  cargando.value = true;
  error.value = null;
  try {
    const url = `${config.value.api}/dashboard-app/funnel?accountId=${route.params.accountId}&dias=${dias.value}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${config.value.token}` },
    });
    if (r.status === 401) throw new Error('auth');
    if (!r.ok) throw new Error('network');
    const body = await r.json();
    if (!body.found) throw new Error('config');
    datos.value = body;
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

// La configuracion puede llegar despues de montar: reintentar entonces.
watch(config, (cfg, prev) => {
  if (cfg && !prev) cargar();
});

function cambiarPeriodo(n) {
  if (dias.value === n) return;
  dias.value = n;
  cargar();
}

const cifras = computed(() => resumen(datos.value));
const etapas = computed(() => datos.value?.etapas || []);
const porEtapa = computed(() => filasPorEtapa(etapas.value));
const asesores = computed(() => ordenarAsesores(datos.value?.asesores));
const maximoCelda = computed(() => maximoDeLaTabla(asesores.value));
const cierres = computed(() => datos.value?.cierres || null);
const cierresPorAsesor = computed(() =>
  filasConBarra(cierres.value?.porAsesor)
);
const perdidosPorMotivo = computed(() =>
  filasConBarra(datos.value?.perdidos)
);

const tarjetas = computed(() => [
  {
    id: 'activos',
    titulo: 'Leads activos',
    valor: cifras.value.activos,
    nota: `de ${cifras.value.total} en total`,
    icono: 'i-lucide-users',
    color: 'text-n-blue-11 bg-n-blue-3',
  },
  {
    id: 'cerrados',
    titulo: 'Cerrados',
    valor: cifras.value.cerrados,
    nota: 'ventas concretadas',
    icono: 'i-lucide-circle-check-big',
    color: 'text-n-teal-11 bg-n-teal-3',
  },
  {
    id: 'perdidos',
    titulo: 'Perdidos',
    valor: cifras.value.perdidos,
    nota: 'con su motivo anotado',
    icono: 'i-lucide-circle-x',
    color: 'text-n-slate-11 bg-n-slate-3',
  },
  {
    id: 'tasa',
    titulo: 'Tasa de cierre',
    valor:
      cifras.value.tasaDeCierre === null
        ? '—'
        : `${cifras.value.tasaDeCierre} %`,
    nota: 'cerrados sobre cerrados y perdidos',
    icono: 'i-lucide-percent',
    color: 'text-n-amber-11 bg-n-amber-3',
  },
]);

const COLOR_DE_BARRA = {
  abierta: 'bg-n-brand',
  ganada: 'bg-n-teal-9',
  perdida: 'bg-n-slate-8',
};

// Fondo de cada celda de la tabla: mas leads, mas color. Con las variables de
// color de Chatwoot, asi el tema oscuro sale solo.
const FONDOS = [
  'transparent',
  'rgb(var(--blue-3))',
  'rgb(var(--blue-4))',
  'rgb(var(--blue-5))',
  'rgb(var(--blue-6))',
];
const fondoDeCelda = valor => ({
  backgroundColor: FONDOS[intensidad(valor, maximoCelda.value)],
});

const generado = computed(() => {
  if (!datos.value?.generadoEn) return '';
  return new Date(datos.value.generadoEn).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
});

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div class="w-full px-6 overflow-auto bg-n-surface-1" data-turuta="embudo">
    <div class="max-w-6xl pb-24 mx-auto">
      <ReportHeader
        header-title="Embudo"
        header-description="Dónde está cada lead y quién lo lleva. Es una foto de este momento; los cierres se miden por periodo."
      >
        <div class="flex items-center gap-3">
          <span v-if="generado" class="text-xs text-n-slate-10">
            Actualizado a las {{ generado }}
          </span>
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
        <!-- Cifras -->
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article
            v-for="t in tarjetas"
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

        <!-- Por etapa -->
        <section :class="TARJETA">
          <header class="flex items-baseline justify-between gap-4 mb-5">
            <h2 class="mb-0 text-lg font-medium text-n-slate-12">Por etapa</h2>
            <span class="text-xs text-n-slate-10">
              leads en cada etapa y qué parte del total son
            </span>
          </header>
          <ol class="flex flex-col gap-3 mb-0 list-none ltr:ml-0 rtl:mr-0">
            <li
              v-for="e in porEtapa"
              :key="e.code"
              class="grid items-center gap-4 grid-cols-[11rem_1fr_5.5rem] text-sm"
            >
              <span class="truncate text-n-slate-12" :title="e.name">
                {{ e.name }}
              </span>
              <div class="h-2.5 rounded-full bg-n-alpha-2 overflow-hidden">
                <div
                  class="h-full transition-all duration-500 rounded-full"
                  :class="COLOR_DE_BARRA[e.tipo]"
                  :style="{ width: `${e.ancho}%` }"
                />
              </div>
              <span class="text-right tabular-nums">
                <span class="font-medium text-n-slate-12">{{ e.total }}</span>
                <span class="ml-1.5 text-xs text-n-slate-10">
                  {{ e.parte }} %
                </span>
              </span>
            </li>
          </ol>
          <footer class="flex flex-wrap gap-4 mt-5 text-xs text-n-slate-10">
            <span class="flex items-center gap-1.5">
              <span class="rounded-full size-2 bg-n-brand" /> En curso
            </span>
            <span class="flex items-center gap-1.5">
              <span class="rounded-full size-2 bg-n-teal-9" /> Venta cerrada
            </span>
            <span class="flex items-center gap-1.5">
              <span class="rounded-full size-2 bg-n-slate-8" /> Perdido
            </span>
          </footer>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Cierres del periodo -->
          <section v-if="cierres" :class="TARJETA">
            <header class="flex items-center justify-between gap-4 mb-1">
              <h2 class="mb-0 text-lg font-medium text-n-slate-12">
                Cierres del periodo
              </h2>
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
            </header>
            <p class="mb-5 text-sm text-n-slate-11">
              <span class="text-2xl font-medium tabular-nums text-n-teal-11">
                {{ cierres.total }}
              </span>
              en los últimos {{ cierres.dias }} días
            </p>
            <ul class="flex flex-col gap-3 mb-0 list-none ltr:ml-0 rtl:mr-0">
              <li
                v-for="c in cierresPorAsesor"
                :key="c.id || 'sin-asesor'"
                class="grid items-center gap-3 grid-cols-[2rem_1fr_2rem] text-sm"
              >
                <span
                  class="flex items-center justify-center text-xs font-medium rounded-full size-8 bg-n-alpha-2 text-n-slate-11"
                >
                  {{ iniciales(c.nombre) }}
                </span>
                <div class="min-w-0">
                  <p class="mb-1 truncate text-n-slate-12">{{ c.nombre }}</p>
                  <div class="h-1.5 rounded-full bg-n-alpha-2 overflow-hidden">
                    <div
                      class="h-full transition-all duration-500 rounded-full bg-n-teal-9"
                      :style="{ width: `${c.ancho}%` }"
                    />
                  </div>
                </div>
                <span
                  class="font-medium text-right tabular-nums"
                  :class="c.total ? 'text-n-slate-12' : 'text-n-slate-9'"
                >
                  {{ c.total }}
                </span>
              </li>
            </ul>
            <p class="mt-5 mb-0 text-xs text-n-slate-10">
              Leads que llegaron a Cierre en el periodo, contados al asesor que
              los lleva hoy.
            </p>
          </section>

          <!-- Perdidos por motivo -->
          <section :class="TARJETA">
            <header class="mb-1">
              <h2 class="mb-0 text-lg font-medium text-n-slate-12">
                Perdidos por motivo
              </h2>
            </header>
            <p class="mb-5 text-sm text-n-slate-11">
              <span class="text-2xl font-medium tabular-nums text-n-slate-12">
                {{ cifras.perdidos }}
              </span>
              en total
            </p>
            <ul
              v-if="perdidosPorMotivo.length"
              class="flex flex-col gap-3 mb-0 list-none ltr:ml-0 rtl:mr-0"
            >
              <li v-for="p in perdidosPorMotivo" :key="p.code" class="text-sm">
                <div class="flex items-baseline justify-between gap-4 mb-1">
                  <span class="truncate text-n-slate-12">{{ p.name }}</span>
                  <span class="flex-none tabular-nums">
                    <span class="font-medium text-n-slate-12">
                      {{ p.total }}
                    </span>
                    <span class="ml-1.5 text-xs text-n-slate-10">
                      {{ p.parte }} %
                    </span>
                  </span>
                </div>
                <div class="h-1.5 rounded-full bg-n-alpha-2 overflow-hidden">
                  <div
                    class="h-full transition-all duration-500 rounded-full bg-n-slate-8"
                    :style="{ width: `${p.ancho}%` }"
                  />
                </div>
              </li>
            </ul>
            <p v-else class="mb-0 text-sm text-n-slate-10">
              Todavía no se ha perdido ningún lead.
            </p>
          </section>
        </div>

        <!-- Por asesor. El scroll horizontal vive en un div interior SIN alto
             fijo: la tabla ocupa lo que necesite y no sale barra vertical. -->
        <section :class="TARJETA">
          <header class="flex items-baseline justify-between gap-4 mb-5">
            <h2 class="mb-0 text-lg font-medium text-n-slate-12">Por asesor</h2>
            <span class="text-xs text-n-slate-10">
              cuanto más color, más leads en esa etapa
            </span>
          </header>
          <div class="-mx-2 overflow-x-auto">
            <table class="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    class="sticky left-0 z-10 px-2 pb-3 font-medium text-left bg-n-solid-2 text-n-slate-11"
                  >
                    Asesor
                  </th>
                  <th
                    v-for="e in etapas"
                    :key="e.code"
                    class="px-2 pb-3 text-xs font-medium leading-tight text-center align-bottom text-n-slate-11 min-w-[4.5rem]"
                  >
                    {{ e.name }}
                  </th>
                  <th
                    class="px-2 pb-3 font-medium text-right text-n-slate-11"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="a in asesores"
                  :key="a.id || 'sin-asesor'"
                  class="group"
                >
                  <td
                    class="sticky left-0 z-10 py-1.5 px-2 border-t bg-n-solid-2 border-n-weak whitespace-nowrap"
                  >
                    <span class="flex items-center gap-2">
                      <span
                        class="flex items-center justify-center flex-none font-medium rounded-full text-xxs size-6 bg-n-alpha-2 text-n-slate-11"
                      >
                        {{ iniciales(a.nombre) }}
                      </span>
                      <span
                        :class="a.id ? 'text-n-slate-12' : 'text-n-slate-10'"
                      >
                        {{ a.nombre }}
                      </span>
                    </span>
                  </td>
                  <td
                    v-for="e in etapas"
                    :key="e.code"
                    class="px-1 py-1.5 border-t border-n-weak"
                  >
                    <span
                      class="flex items-center justify-center h-8 rounded-md tabular-nums"
                      :class="
                        a.porEtapa[e.code]
                          ? 'text-n-slate-12 font-medium'
                          : 'text-n-slate-8'
                      "
                      :style="fondoDeCelda(a.porEtapa[e.code])"
                    >
                      {{ a.porEtapa[e.code] || '·' }}
                    </span>
                  </td>
                  <td
                    class="px-2 py-1.5 font-medium text-right border-t border-n-weak tabular-nums text-n-slate-12"
                  >
                    {{ a.total }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td
                    class="sticky left-0 z-10 px-2 pt-3 font-medium border-t bg-n-solid-2 border-n-strong text-n-slate-11"
                  >
                    Total
                  </td>
                  <td
                    v-for="e in etapas"
                    :key="e.code"
                    class="px-2 pt-3 font-medium text-center border-t border-n-strong tabular-nums text-n-slate-12"
                  >
                    {{ e.total }}
                  </td>
                  <td
                    class="px-2 pt-3 font-medium text-right border-t border-n-strong tabular-nums text-n-slate-12"
                  >
                    {{ datos.total }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
