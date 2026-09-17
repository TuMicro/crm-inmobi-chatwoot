<script setup>
// [turuta] Si el chat que el agente tiene ABIERTO pasa a otro asesor, ya no es
// suyo: el servidor le negaria cualquier cosa que intentara. Se le avisa y se le
// devuelve a su lista. No pinta nada. Ver turuta/chatsPropios.js.
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import { puedeVerChat } from './chatsPropios';

const route = useRoute();
const router = useRouter();
const chat = useMapGetter('getSelectedChat');
const rol = useMapGetter('getCurrentRole');
const miId = useMapGetter('getCurrentUserID');

const ajeno = computed(
  () => !!chat.value?.id && !puedeVerChat(chat.value, rol.value, miId.value)
);

watch(ajeno, (ahora, antes) => {
  if (!ahora || antes) return;
  const asesor = chat.value?.meta?.assignee?.name;
  useAlert(
    asesor
      ? `Este chat ahora lo atiende ${asesor}.`
      : 'Este chat ya no esta asignado a ti.'
  );
  router.push({ name: 'home', params: { accountId: route.params.accountId } });
});
</script>

<template>
  <span class="hidden" data-turuta="vigila-chat-ajeno" />
</template>
