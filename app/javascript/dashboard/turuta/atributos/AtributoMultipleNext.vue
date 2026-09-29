<script setup>
// [turuta] El selector multiple con la forma que espera la pagina de Contactos
// (components-next/Contacts/ContactsSidebar/ContactCustomAttributeItem.vue):
// recibe el atributo entero y emite update. Desmarcar la ultima deja la
// lista vacia: el atributo no se borra del contacto, siempre esta a la vista.
import SelectorMultiple from './SelectorMultiple.vue';

defineProps({
  attribute: { type: Object, required: true },
  // La pagina lo pasa a todos sus editores; aqui no cambia nada.
  // eslint-disable-next-line vue/no-unused-properties
  isEditingView: { type: Boolean, default: false },
});

const emit = defineEmits(['update']);
</script>

<template>
  <SelectorMultiple
    :opciones="attribute.attributeValues || []"
    :valor="attribute.value"
    @update="emit('update', $event)"
    @delete="emit('update', [])"
  />
</template>
