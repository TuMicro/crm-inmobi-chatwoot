<script setup>
// [turuta] La etapa del lead como etiqueta pequena, para ponerla junto al
// nombre en la lista de chats y en la cabecera de la conversacion. El dato es
// el atributo crm_stage_name que nuestra API escribe en cada conversacion.
defineProps({
  name: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <span
    v-if="name"
    class="inline-block px-1.5 py-px text-[11px] font-medium leading-4 normal-case align-middle rounded-md ms-1.5 bg-n-blue-3 text-n-blue-11 whitespace-nowrap"
  >
    {{ name }}
  </span>
</template>
