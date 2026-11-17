<script setup>
// [turuta] Ajustes -> Colores de etapa (solo administradores; 16/11,
// MadHouse): el color con que se tinen en la lista de chats los de cada etapa
// y su intensidad (17/11), para todo el equipo. Cada persona puede cambiarlos
// solo para ella en su perfil (MisColoresDeEtapa.vue). La API comprueba que
// quien guarda es administrador: la pantalla manda el token del propio
// usuario.
import { computed, ref, watch } from 'vue';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import EditorDeColores from './EditorDeColores.vue';
import {
  cambiosDeIntensidad,
  cambiosDelEquipo,
  coloresDelEquipo,
  intensidadesDelEquipo,
  useColoresDeEtapa,
} from './coloresDeEtapa';

const { etapas, cargarEtapas, guardarEquipo } = useColoresDeEtapa();

const guardado = computed(() => coloresDelEquipo(etapas.value));
const intensidadesGuardadas = computed(() =>
  intensidadesDelEquipo(etapas.value)
);

const borrador = ref({});
const borradorIntensidades = ref({});
const guardando = ref(false);

const cambios = computed(() =>
  cambiosDelEquipo(borrador.value, guardado.value)
);
const cambiosIntensidad = computed(() =>
  cambiosDeIntensidad(borradorIntensidades.value, intensidadesGuardadas.value)
);
const hayCambios = computed(
  () =>
    Object.keys(cambios.value).length > 0 ||
    Object.keys(cambiosIntensidad.value).length > 0
);

const descartar = () => {
  borrador.value = { ...guardado.value };
  borradorIntensidades.value = { ...intensidadesGuardadas.value };
};

// Lo guardado se refresca al volver a la pestana: si no hay nada sin guardar,
// la pantalla lo sigue; si lo hay, no se pisa.
watch(
  [guardado, intensidadesGuardadas],
  () => {
    if (!hayCambios.value) descartar();
  },
  { immediate: true }
);

cargarEtapas();

async function guardar() {
  guardando.value = true;
  try {
    await guardarEquipo({
      colores: cambios.value,
      intensidades: cambiosIntensidad.value,
    });
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
        header-description="El color con que se pinta en la lista cada chat, según la etapa de su lead, y su intensidad. Vale para todo el equipo; cada persona puede cambiarlo solo para sí en su perfil."
      />

      <!-- Arriba y fija al bajar: la primera vez no se veia al final. -->
      <div
        class="sticky top-0 z-10 flex flex-wrap items-center gap-3 py-3 mb-4 bg-n-surface-1"
      >
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
        <span class="text-sm text-n-slate-11">
          {{ hayCambios ? 'Hay cambios sin guardar' : 'Todo guardado' }}
        </span>
      </div>

      <section :class="TARJETA">
        <p v-if="!etapas.length" class="m-0 text-sm text-n-slate-11">
          Cargando las etapas…
        </p>
        <EditorDeColores
          v-else
          v-model="borrador"
          v-model:intensidades="borradorIntensidades"
          :etapas="etapas"
        />
      </section>
    </div>
  </div>
</template>
