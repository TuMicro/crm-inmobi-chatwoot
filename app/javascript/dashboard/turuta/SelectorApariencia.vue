<script setup>
// [turuta] Las tres opciones de apariencia y nada mas: sin el buscador ni la
// fila de atajos de la paleta de comandos de Chatwoot. Ver turuta/apariencia.js.
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import { temaActual, ponerTema } from './apariencia';

const { t } = useI18n();
const dialogo = ref(null);
const actual = ref(temaActual());

// Los textos son los de Chatwoot: ya estan traducidos.
const opciones = computed(() => [
  {
    id: 'light',
    texto: t('COMMAND_BAR.COMMANDS.LIGHT_MODE'),
    icono: 'i-lucide-sun',
  },
  {
    id: 'dark',
    texto: t('COMMAND_BAR.COMMANDS.DARK_MODE'),
    icono: 'i-lucide-moon',
  },
  {
    id: 'auto',
    texto: t('COMMAND_BAR.COMMANDS.SYSTEM_MODE'),
    icono: 'i-lucide-monitor',
  },
]);

function abrir() {
  actual.value = temaActual();
  dialogo.value?.open();
}

function elegir(id) {
  ponerTema(id);
  actual.value = id;
  dialogo.value?.close();
}

defineExpose({ abrir });
</script>

<template>
  <Dialog
    ref="dialogo"
    width="sm"
    :title="t('COMMAND_BAR.SECTIONS.APPEARANCE')"
    :show-cancel-button="false"
    :show-confirm-button="false"
  >
    <ul class="flex flex-col gap-1 p-0 m-0 list-none" data-turuta="apariencia">
      <li v-for="opcion in opciones" :key="opcion.id">
        <button
          type="button"
          class="flex items-center w-full gap-3 px-3 py-2.5 text-sm rounded-lg text-n-slate-12 hover:bg-n-alpha-2"
          :class="{ 'bg-n-alpha-2': opcion.id === actual }"
          :aria-pressed="opcion.id === actual"
          @click="elegir(opcion.id)"
        >
          <span :class="opcion.icono" class="size-4 text-n-slate-11" />
          <span class="flex-1 text-start">{{ opcion.texto }}</span>
          <span
            v-if="opcion.id === actual"
            class="i-lucide-check size-4 text-n-blue-11"
          />
        </button>
      </li>
    </ul>
  </Dialog>
</template>
