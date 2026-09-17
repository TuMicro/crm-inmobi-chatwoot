<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<script setup>
// [turuta] Pagina "Embudo": leads por etapa y por asesor, desde nuestra API.
// Es una ruta nuestra dentro del dashboard de Chatwoot (turuta/routes.js).
// La configuracion (API y token) sale de la Dashboard App, igual que la ficha.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import Button from 'dashboard/components-next/button/Button.vue';
import { leadAppConfig, textoError } from './leadApp';

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const config = computed(() => leadAppConfig(apps.value));

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
    const url = `${config.value.api}/dashboard-app/funnel?accountId=${route.params.accountId}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${config.value.token}` },
    });
    if (r.status === 401) throw new Error('auth');
    if (!r.ok) throw new Error('network');
    const body = await r.json();
    if (!body.found) throw new Error('config');
    datos.value = body;
  } catch (e) {
    error.value = ['auth', 'config'].includes(e.message) ? e.message : 'network';
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

const etapas = computed(() => datos.value?.etapas || []);
const asesores = computed(() => datos.value?.asesores || []);
const maxEtapa = computed(() =>
  Math.max(1, ...etapas.value.map(e => e.total))
);
const cerrados = computed(() =>
  etapas.value
    .filter(e => e.terminal && !e.requiereMotivo)
    .reduce((n, e) => n + e.total, 0)
);
const perdidos = computed(() =>
  etapas.value.filter(e => e.requiereMotivo).reduce((n, e) => n + e.total, 0)
);
</script>

<template>
  <div
    class="flex flex-col w-full h-full min-h-0 overflow-auto bg-n-background"
    data-turuta="embudo"
  >
    <header
      class="flex items-center justify-between gap-4 px-6 py-4 border-b border-n-weak"
    >
      <div>
        <h1 class="text-xl font-medium text-n-slate-12">Embudo</h1>
        <p class="text-sm text-n-slate-11">
          Leads por etapa y por asesor. Se actualiza al abrir la pagina.
        </p>
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
    </header>

    <p v-if="error" class="px-6 py-4 text-sm text-n-slate-11">
      {{ textoError(error) }}
    </p>
    <p v-else-if="!datos" class="px-6 py-4 text-sm text-n-slate-11">
      Cargando...
    </p>

    <template v-else>
      <section class="grid max-w-3xl grid-cols-3 gap-3 px-6 py-4">
        <div class="p-3 border rounded-lg border-n-weak">
          <div class="text-xs text-n-slate-11">Leads activos</div>
          <div class="text-2xl font-medium text-n-slate-12">
            {{ datos.activos }}
          </div>
        </div>
        <div class="p-3 border rounded-lg border-n-weak">
          <div class="text-xs text-n-slate-11">Cerrados</div>
          <div class="text-2xl font-medium text-n-teal-11">{{ cerrados }}</div>
        </div>
        <div class="p-3 border rounded-lg border-n-weak">
          <div class="text-xs text-n-slate-11">Perdidos</div>
          <div class="text-2xl font-medium text-n-slate-11">{{ perdidos }}</div>
        </div>
      </section>

      <section class="px-6 pb-4">
        <h2
          class="mb-2 text-xs font-medium tracking-wide uppercase text-n-slate-10"
        >
          Por etapa
        </h2>
        <ol class="flex flex-col max-w-3xl gap-1.5">
          <li
            v-for="e in etapas"
            :key="e.code"
            class="flex items-center gap-3 text-sm"
          >
            <span class="truncate w-44 text-n-slate-12">{{ e.name }}</span>
            <div class="flex-1 h-4 rounded bg-n-alpha-1">
              <div
                class="h-4 rounded bg-n-brand"
                :style="{ width: `${(e.total / maxEtapa) * 100}%` }"
              />
            </div>
            <span class="w-8 text-right tabular-nums text-n-slate-12">
              {{ e.total }}
            </span>
          </li>
        </ol>
      </section>

      <section class="px-6 pb-6 overflow-x-auto">
        <h2
          class="mb-2 text-xs font-medium tracking-wide uppercase text-n-slate-10"
        >
          Por asesor
        </h2>
        <table class="text-sm border-collapse">
          <thead>
            <tr>
              <th class="px-2 py-1 font-medium text-left text-n-slate-11">
                Asesor
              </th>
              <th
                v-for="e in etapas"
                :key="e.code"
                class="px-2 py-1 font-medium text-right text-n-slate-11 whitespace-nowrap"
              >
                {{ e.name }}
              </th>
              <th class="px-2 py-1 font-medium text-right text-n-slate-11">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="a in asesores"
              :key="a.id || 'sin-asesor'"
              class="border-t border-n-weak"
            >
              <td class="px-2 py-1 text-n-slate-12 whitespace-nowrap">
                {{ a.nombre }}
              </td>
              <td
                v-for="e in etapas"
                :key="e.code"
                class="px-2 py-1 text-right tabular-nums"
                :class="a.porEtapa[e.code] ? 'text-n-slate-12' : 'text-n-slate-9'"
              >
                {{ a.porEtapa[e.code] }}
              </td>
              <td
                class="px-2 py-1 font-medium text-right tabular-nums text-n-slate-12"
              >
                {{ a.total }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-n-strong">
              <td class="px-2 py-1 font-medium text-n-slate-12">Total</td>
              <td
                v-for="e in etapas"
                :key="e.code"
                class="px-2 py-1 font-medium text-right tabular-nums text-n-slate-12"
              >
                {{ e.total }}
              </td>
              <td
                class="px-2 py-1 font-medium text-right tabular-nums text-n-slate-12"
              >
                {{ datos.total }}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section v-if="datos.perdidos.length" class="px-6 pb-8">
        <h2
          class="mb-2 text-xs font-medium tracking-wide uppercase text-n-slate-10"
        >
          Perdidos por motivo
        </h2>
        <ul class="flex flex-col max-w-md gap-1 text-sm">
          <li
            v-for="p in datos.perdidos"
            :key="p.code"
            class="flex justify-between gap-4"
          >
            <span class="text-n-slate-12">{{ p.name }}</span>
            <span class="tabular-nums text-n-slate-11">{{ p.total }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
