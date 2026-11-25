<script setup>
// [turuta] El filtro de la lista de chats, sin el dialogo: las mismas filas
// (ConditionRow) y los mismos filtros (etapa, etiquetas, agente, atributos del
// contacto...), para elegir a quien le llega un mensaje masivo. No se usa
// ConversationFilter.vue porque al aplicar guarda el filtro en el almacen y
// la lista de chats quedaria filtrada al volver.
import { useTemplateRef } from 'vue';
import { useConversationFilterContext } from 'dashboard/components-next/filter/provider.js';
import ConditionRow from 'dashboard/components-next/filter/ConditionRow.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { filaDeEtapa } from './filtros';

const filas = defineModel({ type: Array, default: () => [] });

const { filterTypes, attributeFilterTypes } = useConversationFilterContext();

const ESTADO = {
  attributeKey: 'status',
  filterOperator: 'equal_to',
  values: [],
  queryOperator: 'and',
};

const filaNueva = () => filaDeEtapa(filterTypes.value) || { ...ESTADO };

const anadir = () => filas.value.push(filaNueva());

const quitar = indice => {
  if (filas.value.length === 1) filas.value = [filaNueva()];
  else filas.value.splice(indice, 1);
};

const filasRef = useTemplateRef('filasRef');

/** Marca en rojo las filas incompletas. True si todas valen. */
const validar = () =>
  (filasRef.value || []).map(f => f.validate()).every(Boolean);

defineExpose({ validar, tipos: filterTypes, filaNueva });
</script>

<template>
  <div class="flex flex-col gap-3">
    <ul class="grid gap-3 m-0 list-none">
      <template v-for="(fila, indice) in filas" :key="indice">
        <ConditionRow
          v-if="indice === 0"
          ref="filasRef"
          v-model:attribute-key="fila.attributeKey"
          v-model:filter-operator="fila.filterOperator"
          v-model:values="fila.values"
          :filter-types="attributeFilterTypes"
          :show-query-operator="false"
          @remove="quitar(indice)"
        />
        <ConditionRow
          v-else
          ref="filasRef"
          v-model:attribute-key="fila.attributeKey"
          v-model:filter-operator="fila.filterOperator"
          v-model:query-operator="filas[indice - 1].queryOperator"
          v-model:values="fila.values"
          show-query-operator
          :filter-types="attributeFilterTypes"
          @remove="quitar(indice)"
        />
      </template>
    </ul>
    <div>
      <!-- eslint-disable-next-line @intlify/vue-i18n/no-raw-text -->
      <Button sm ghost blue label="Añadir otro filtro" @click="anadir" />
    </div>
  </div>
</template>
