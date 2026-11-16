<script setup>
// [turuta] Ajustes -> Colores de etapa (solo administradores; 16/11,
// MadHouse): el color con que se tinen en la lista de chats los de cada
// etapa, para todo el equipo. Cada persona puede cambiarlo solo para ella en
// su perfil (MisColoresDeEtapa.vue). La API comprueba que quien guarda es
// administrador: la pantalla manda el token del propio usuario.
import { computed, ref, watch } from 'vue';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import EditorDeColores from './EditorDeColores.vue';
import {
  cambiosDelEquipo,
  coloresDelEquipo,
  useColoresDeEtapa,
} from './coloresDeEtapa';

const { etapas, cargarEtapas, guardarEquipo } = useColoresDeEtapa();

const guardado = computed(() => coloresDelEquipo(etapas.value));
const borrador = ref({});
const guardando = ref(false);

const cambios = computed(() =>
  cambiosDelEquipo(borrador.value, guardado.value)
);
const hayCambios = computed(() => Object.keys(cambios.value).length > 0);

const descartar = () => {
  borrador.value = { ...guardado.value };
};

// Lo guardado se refresca al volver a la pestana: si no hay nada sin guardar,
// la pantalla lo sigue; si lo hay, no se pisa.
watch(
  guardado,
  () => {
    if (!hayCambios.value) descartar();
  },
  { immediate: true }
);

cargarEtapas();

async function guardar() {
  guardando.value = true;
  try {
    await guardarEquipo(cambios.value);
    descartar();
    useAlert('Colores del equipo guardados');
  } catch (e) {
    useAlert(e.message || 'No se pudieron guardar los colores');
  } finally {
    guardando.value = false;
  }
}

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    class="w-full px-6 overflow-auto bg-n-surface-1"
    data-turuta="colores-etapa"
  >
    <div class="max-w-3xl pb-24 mx-auto">
      <ReportHeader
        header-title="Colores de etapa"
        header-description="El color con que se pinta en la lista cada chat, según la etapa de su lead. Vale para todo el equipo; cada persona puede cambiarlo solo para sí en su perfil."
      />

      <section :class="TARJETA">
        <p v-if="!etapas.length" class="m-0 text-sm text-n-slate-11">
          Cargando las etapas…
        </p>
        <EditorDeColores v-else v-model="borrador" :etapas="etapas" />
      </section>

      <div class="flex flex-wrap items-center gap-3 mt-5">
        <Button
          label="Guardar cambios"
          :disabled="!hayCambios || guardando"
          :is-loading="guardando"
          @click="guardar"
        />
        <Button
          v-if="hayCambios"
          label="Descartar"
          variant="faded"
          color="slate"
          :disabled="guardando"
          @click="descartar"
        />
        <span v-if="hayCambios" class="text-sm text-n-slate-11">
          Hay cambios sin guardar
        </span>
      </div>
    </div>
  </div>
</template>
