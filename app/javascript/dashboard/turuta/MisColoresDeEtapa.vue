<script setup>
// [turuta] Perfil -> Mis colores de etapa (16/11, MadHouse): cada persona,
// administrador o asesor, cambia el color de una etapa solo para ella, o se
// lo quita. Se guarda en sus ui_settings de Chatwoot, que van con su cuenta:
// lo ve igual en cualquier computadora o celular. Lo que no cambie sigue con
// el color del equipo (ColoresDeEtapaPage.vue).
import { computed, ref, watch } from 'vue';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import EditorDeColores from './EditorDeColores.vue';
import {
  mismosPropios,
  propiosParaGuardar,
  useColoresDeEtapa,
} from './coloresDeEtapa';

const { etapas, personales, cargarEtapas, guardarPersonales } =
  useColoresDeEtapa();

const borrador = ref({});
const guardando = ref(false);

const hayCambios = computed(
  () => !mismosPropios(borrador.value, personales.value)
);
const tienePropios = computed(
  () => Object.keys(propiosParaGuardar(borrador.value)).length > 0
);

const descartar = () => {
  borrador.value = { ...personales.value };
};

watch(
  personales,
  () => {
    if (!hayCambios.value) descartar();
  },
  { immediate: true }
);

cargarEtapas();

const volverTodosAlEquipo = () => {
  borrador.value = {};
};

async function guardar() {
  guardando.value = true;
  try {
    await guardarPersonales(propiosParaGuardar(borrador.value));
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
  <div class="flex flex-col gap-4">
    <p v-if="!etapas.length" class="m-0 text-sm text-n-slate-11">
      Cargando las etapas…
    </p>
    <EditorDeColores v-else v-model="borrador" :etapas="etapas" personal />
    <div class="flex flex-wrap items-center gap-3">
      <Button
        label="Guardar mis colores"
        :disabled="!hayCambios || guardando"
        :is-loading="guardando"
        @click="guardar"
      />
      <Button
        v-if="tienePropios"
        label="Volver todos a los del equipo"
        variant="faded"
        color="slate"
        :disabled="guardando"
        @click="volverTodosAlEquipo"
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
  </div>
</template>
