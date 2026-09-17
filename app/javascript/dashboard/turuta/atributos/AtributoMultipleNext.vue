<script setup>
// [turuta] El selector multiple con la forma que espera la pagina de Contactos
// (components-next/Contacts/ContactsSidebar/ContactCustomAttributeItem.vue):
// recibe el atributo entero y emite update / delete.
import SelectorMultiple from './SelectorMultiple.vue';

defineProps({
  attribute: { type: Object, required: true },
  // La pagina lo pasa a todos sus editores; aqui no cambia nada.
  isEditingView: { type: Boolean, default: false },
});

const emit = defineEmits(['update', 'delete']);
</script>

<template>
  <SelectorMultiple
    :opciones="attribute.attributeValues || []"
    :valor="attribute.value"
    @update="emit('update', $event)"
    @delete="emit('delete')"
  />
</template>
