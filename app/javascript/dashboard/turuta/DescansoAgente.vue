<script setup>
// [turuta] Boton "Descanso" de cada fila de Ajustes > Agentes. Pone al asesor
// en descanso un rato, el resto del dia o sin hora de vuelta: mientras dura,
// NUESTRA API no le reparte leads nuevos. Los que ya tiene los sigue viendo y
// atendiendo. Solo para agentes: los administradores no entran en el reparto.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';
import { leadAppConfig } from './leadApp';
import { OPCIONES_DESCANSO, textoDescanso, useDescansos } from './descanso';

const props = defineProps({
  agent: { type: Object, required: true },
});

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const config = computed(() => leadAppConfig(apps.value));
const { descansos, cargar, poner, quitar } = useDescansos();

const abierto = ref(false);
const guardando = ref(false);

const esAsesor = computed(() => props.agent.role === 'agent');
const descanso = computed(() => descansos.value[props.agent.id]);
const texto = computed(() => textoDescanso(descanso.value));

const opciones = computed(() => [
  ...OPCIONES_DESCANSO.map(o => ({
    label: o.texto,
    value: o.minutos,
    action: 'poner',
  })),
  { label: 'Resto del día', value: 'hoy', action: 'poner' },
  { label: 'Hasta que lo reactive', value: 'indefinido', action: 'poner' },
  ...(texto.value
    ? [{ label: 'Terminar el descanso', value: 'fin', action: 'quitar' }]
    : []),
]);

function intentarCargar() {
  if (!config.value || !esAsesor.value) return;
  // Si falla no se avisa: la fila se queda sin pastilla y el boton sigue ahi.
  cargar(config.value, route.params.accountId).catch(() => {});
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  intentarCargar();
});
// La configuracion puede llegar despues de montar.
watch(config, (cfg, antes) => {
  if (cfg && !antes) intentarCargar();
});

async function elegir(item) {
  abierto.value = false;
  if (guardando.value) return;
  guardando.value = true;
  try {
    if (item.action === 'quitar') {
      await quitar(config.value, route.params.accountId, props.agent.id);
      useAlert(`${props.agent.name} vuelve a recibir leads`);
    } else {
      await poner(
        config.value,
        route.params.accountId,
        props.agent.id,
        item.value
      );
      useAlert(`${props.agent.name} no recibirá leads nuevos`);
    }
  } catch (e) {
    useAlert(
      e.message === 'sin-asesor'
        ? 'Ese agente todavía no figura como asesor en el CRM. Si lo acabas de crear, espera cinco minutos.'
        : 'No se pudo guardar el descanso. Inténtalo de nuevo.'
    );
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en espanol a proposito: la pieza es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    v-if="config && esAsesor"
    v-on-clickaway="() => (abierto = false)"
    class="relative flex items-center gap-2"
    data-turuta="descanso"
  >
    <span
      v-if="texto"
      class="px-2 py-0.5 text-xs rounded-full bg-n-amber-3 text-n-amber-11 whitespace-nowrap"
    >
      {{ texto }}
    </span>
    <Button
      v-tooltip.top="'Descanso: dejar de recibir leads nuevos'"
      icon="i-lucide-coffee"
      slate
      sm
      :is-loading="guardando"
      @click="abierto = !abierto"
    />
    <DropdownMenu
      v-if="abierto"
      :menu-items="opciones"
      class="w-56 mt-2 top-full ltr:right-0 rtl:left-0"
      @action="elegir($event)"
    />
  </div>
</template>
