<script setup>
// [turuta] Perfil -> Mis colores de etapa (16/11, MadHouse): cada persona,
// administrador o asesor, cambia el color de una etapa solo para ella, o se
// lo quita, y la intensidad (17/11). Se guarda en sus ui_settings de
// Chatwoot, que van con su cuenta: lo ve igual en cualquier computadora o
// celular. Lo que no cambie sigue con lo del equipo (ColoresDeEtapaPage.vue).
import { computed, ref, watch } from 'vue';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import EditorDeColores from './EditorDeColores.vue';
import ControlDeIntensidad from './ControlDeIntensidad.vue';
import {
  intensidadEfectiva,
  mismosPropios,
  propiosParaGuardar,
  useColoresDeEtapa,
} from './coloresDeEtapa';

const {
  etapas,
  personales,
  intensidadEquipo,
  intensidadPersonal,
  cargarEtapas,
  guardarPersonales,
} = useColoresDeEtapa();

const borrador = ref({});
/** La intensidad propia; null, la del equipo. */
const borradorIntensidad = ref(null);
const guardando = ref(false);

const hayCambios = computed(
  () =>
    !mismosPropios(borrador.value, personales.value) ||
    borradorIntensidad.value !== intensidadPersonal.value
);
const tienePropios = computed(
  () =>
    Object.keys(propiosParaGuardar(borrador.value)).length > 0 ||
    borradorIntensidad.value !== null
);

const descartar = () => {
  borrador.value = { ...personales.value };
  borradorIntensidad.value = intensidadPersonal.value;
};

watch(
  [personales, intensidadPersonal],
  () => {
    if (!hayCambios.value) descartar();
  },
  { immediate: true }
);

cargarEtapas();

const volverTodoAlEquipo = () => {
  borrador.value = {};
  borradorIntensidad.value = null;
};

async function guardar() {
  guardando.value = true;
  try {
    await guardarPersonales(
      propiosParaGuardar(borrador.value),
      borradorIntensidad.value
    );
    useAlert('Tus colores de etapa se guardaron');
  } catch (e) {
    useAlert('No se pudieron guardar tus colores');
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la sección es nuestra y no pasa por el i18n de Chatwoot -->
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center gap-3">
      <Button
        label="Guardar mis colores"
        :disabled="!hayCambios || guardando"
        :is-loading="guardando"
        @click="guardar"
      />
      <Button
        v-if="tienePropios"
        label="Volver todo a lo del equipo"
        variant="faded"
        color="slate"
        :disabled="guardando"
        @click="volverTodoAlEquipo"
      />
      <Button
        v-if="hayCambios"
        label="Descartar"
        variant="link"
        color="slate"
        :disabled="guardando"
        @click="descartar"
      />
    </div>
    <ControlDeIntensidad
      v-model="borradorIntensidad"
      :por-defecto="intensidadEquipo"
      texto-por-defecto="Usar la del equipo"
      etiqueta-por-defecto="la del equipo"
    />
    <p v-if="!etapas.length" class="m-0 text-sm text-n-slate-11">
      Cargando las etapas…
    </p>
    <EditorDeColores
      v-else
      v-model="borrador"
      :etapas="etapas"
      :intensidad="intensidadEfectiva(borradorIntensidad, intensidadEquipo)"
      personal
    />
  </div>
</template>
