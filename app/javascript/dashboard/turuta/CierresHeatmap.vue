<script setup>
// [turuta] Mapa de calor "Cierres" del informe Resumen: a que dia y hora llegan
// los leads a la etapa de Cierre. Ocupa el sitio del mapa "Resueltos" de
// Chatwoot, que aqui no significa nada: la venta es el Cierre, no resolver el
// chat. Reutiliza la tarjeta y el mapa de Chatwoot; los datos son de NUESTRA API.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import MetricCard from 'dashboard/routes/dashboard/settings/reports/components/overview/MetricCard.vue';
import BaseHeatmap from 'dashboard/routes/dashboard/settings/reports/components/heatmaps/BaseHeatmap.vue';
import { leadAppConfig } from './leadApp';
import {
  PERIODOS_DEL_MAPA,
  cubosPorHora,
  textoDeCelda,
} from './cierresPorHora';

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const config = computed(() => leadAppConfig(apps.value));

const dias = ref(7);
const instantes = ref([]);
const cargando = ref(false);
const fallo = ref(false);

const datos = computed(() => cubosPorHora(instantes.value, dias.value));
const total = computed(() => datos.value.reduce((n, c) => n + c.value, 0));

async function cargar() {
  if (!config.value) return;
  cargando.value = true;
  fallo.value = false;
  try {
    const r = await fetch(
      `${config.value.api}/dashboard-app/closings?accountId=${route.params.accountId}&dias=${dias.value}`,
      { headers: { Authorization: `Bearer ${config.value.token}` } }
    );
    if (!r.ok) throw new Error('red');
    instantes.value = (await r.json()).cierres || [];
  } catch (e) {
    fallo.value = true;
    instantes.value = [];
  } finally {
    cargando.value = false;
  }
}

function cambiarPeriodo(n) {
  if (dias.value === n) return;
  dias.value = n;
  cargar();
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  cargar();
});
// La configuracion puede llegar despues de montar.
watch(config, (cfg, antes) => {
  if (cfg && !antes) cargar();
});
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la pieza es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    v-if="config"
    class="flex flex-row flex-wrap max-w-full"
    data-turuta="cierres-heatmap"
  >
    <MetricCard>
      <template #header>
        <div class="flex items-center gap-2">
          <h5 class="mb-0 text-lg font-medium text-n-slate-12">Cierres</h5>
          <span
            class="px-2 py-0.5 text-xs rounded bg-n-teal-3 text-n-teal-11 tabular-nums"
          >
            {{ total }} en {{ dias }} días
          </span>
        </div>
        <div class="flex flex-row items-center justify-end gap-1">
          <button
            v-for="n in PERIODOS_DEL_MAPA"
            :key="n"
            type="button"
            class="px-2.5 py-1 text-xs rounded-md transition-colors"
            :class="
              n === dias
                ? 'bg-n-alpha-2 text-n-slate-12 font-medium'
                : 'text-n-slate-11 hover:bg-n-alpha-1'
            "
            @click="cambiarPeriodo(n)"
          >
            {{ n }} días
          </button>
        </div>
      </template>
      <div class="flex flex-col w-full gap-3">
        <BaseHeatmap
          :heatmap-data="datos"
          :number-of-rows="dias"
          :is-loading="cargando"
          color-scheme="green"
          aria-label="Cierres por día y hora"
          :format-value="textoDeCelda"
        />
        <p class="mb-0 text-xs text-n-slate-10">
          <template v-if="fallo">
            No se pudieron cargar los cierres. Recarga la página.
          </template>
          <template v-else>
            Leads que llegaron a la etapa de Cierre, por día y hora. El detalle
            por asesor está en el Embudo.
          </template>
        </p>
      </div>
    </MetricCard>
  </div>
</template>
