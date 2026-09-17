<script setup>
// [turuta] Lista de requisitos de la contrasena, SIEMPRE a la vista debajo del
// campo y marcandose segun se escribe. La de Chatwoot (PasswordRequirements)
// es un globo flotante pensado para su pantalla de registro; aqui va en linea.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import { LARGO_MINIMO, requisitos } from './contrasena';

const props = defineProps({
  contrasena: { type: String, default: '' },
});

const { t } = useI18n();

const filas = computed(() =>
  requisitos(props.contrasena).map(r => ({
    ...r,
    etiqueta: t(r.texto, { min: LARGO_MINIMO }),
  }))
);
</script>

<template>
  <div
    class="px-3 py-2 text-xs rounded-lg bg-n-alpha-1 text-n-slate-11"
    data-turuta="requisitos-contrasena"
  >
    <p class="mb-1.5 font-medium text-n-slate-12">
      {{ t('TURUTA.CONTRASENA.TITULO') }}
    </p>
    <ul role="list" class="mb-0 space-y-1 list-none ltr:ml-0 rtl:mr-0">
      <li v-for="fila in filas" :key="fila.id" class="flex items-start gap-1.5">
        <Icon
          class="flex-none w-3 mt-0.5"
          :icon="fila.cumple ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
          :class="fila.cumple ? 'text-n-teal-10' : 'text-n-slate-10'"
        />
        <span :class="fila.cumple ? 'text-n-slate-12' : 'text-n-slate-10'">
          {{ fila.etiqueta }}
        </span>
      </li>
    </ul>
  </div>
</template>
