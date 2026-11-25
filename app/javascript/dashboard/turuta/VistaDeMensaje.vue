<script setup>
// [turuta] El mensaje de una plantilla de WhatsApp tal como le llega a la
// persona: cabecera, cuerpo, pie y botones, con lo escrito en sus campos. El
// parser de Chatwoot solo ensena el cuerpo; quien manda un mensaje masivo
// necesita ver tambien los botones (25/11).
import { computed } from 'vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import { vistaDeMensaje } from './mensajesMasivos';

const props = defineProps({
  /** Los `components` de la plantilla, como los copia Chatwoot de Meta. */
  componentes: { type: Array, default: () => [] },
  /** `processed_params`: lo escrito en los campos. */
  params: { type: Object, default: () => ({}) },
  /** { nombre, completo } de una persona, para ver {nombre} ya cambiado. */
  persona: { type: Object, default: null },
});

const mensaje = computed(() =>
  vistaDeMensaje(props.componentes, props.params, props.persona)
);

const ICONO = {
  QUICK_REPLY: 'i-lucide-reply',
  URL: 'i-lucide-external-link',
  PHONE_NUMBER: 'i-lucide-phone',
  COPY_CODE: 'i-lucide-copy',
};
const ADJUNTO = {
  IMAGE: { icono: 'i-lucide-image', texto: 'Imagen' },
  VIDEO: { icono: 'i-lucide-video', texto: 'Video' },
  DOCUMENT: { icono: 'i-lucide-file-text', texto: 'Documento' },
  LOCATION: { icono: 'i-lucide-map-pin', texto: 'Ubicación' },
};
</script>

<template>
  <div
    class="max-w-sm overflow-hidden text-sm rounded-xl outline outline-1 outline-n-weak bg-n-solid-1 text-n-slate-12"
    data-turuta="vista-de-mensaje"
  >
    <div class="flex flex-col gap-1.5 px-3 py-2.5">
      <template v-if="mensaje.cabecera">
        <img
          v-if="mensaje.cabecera.tipo === 'IMAGE' && mensaje.cabecera.url"
          :src="mensaje.cabecera.url"
          alt=""
          class="object-cover w-full rounded-lg max-h-48"
        />
        <p
          v-else-if="ADJUNTO[mensaje.cabecera.tipo]"
          class="flex items-center justify-center gap-2 py-6 mb-0 rounded-lg bg-n-alpha-2 text-n-slate-10"
        >
          <Icon :icon="ADJUNTO[mensaje.cabecera.tipo].icono" class="size-4" />
          {{ ADJUNTO[mensaje.cabecera.tipo].texto }}
        </p>
        <p
          v-else-if="mensaje.cabecera.texto"
          class="mb-0 font-semibold whitespace-pre-wrap"
        >
          {{ mensaje.cabecera.texto }}
        </p>
      </template>
      <p class="mb-0 whitespace-pre-wrap" data-turuta="vista-cuerpo">
        {{ mensaje.cuerpo }}
      </p>
      <p v-if="mensaje.pie" class="mb-0 text-xs text-n-slate-10">
        {{ mensaje.pie }}
      </p>
    </div>
    <p
      v-for="(boton, i) in mensaje.botones"
      :key="i"
      class="flex items-center justify-center gap-1.5 px-3 py-2 mb-0 font-medium border-t border-n-weak text-n-blue-11"
      data-turuta="vista-boton"
    >
      <Icon :icon="ICONO[boton.tipo] || 'i-lucide-reply'" class="size-4" />
      {{ boton.texto }}
    </p>
  </div>
</template>
