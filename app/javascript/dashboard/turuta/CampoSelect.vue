<script setup>
// [turuta] Un selector a lo ancho, con etiqueta y ayuda, con los mismos
// estilos que Input.vue de Chatwoot. El Select.vue de Chatwoot es w-fit y no
// lleva etiqueta; este es para formularios.
import Icon from 'dashboard/components-next/icon/Icon.vue';

defineProps({
  options: {
    type: Array,
    default: () => [],
    validator: options =>
      options.every(o => typeof o === 'object' && 'value' in o && 'label' in o),
  },
  label: { type: String, default: '' },
  ayuda: { type: String, default: '' },
  compacto: { type: Boolean, default: false },
});

const modelo = defineModel({ type: [String, Number], default: '' });
</script>

<template>
  <label class="flex flex-col min-w-0 gap-1 mb-0">
    <span v-if="label" class="mb-0.5 text-heading-3 text-n-slate-12">
      {{ label }}
    </span>
    <span class="relative block">
      <select
        v-model="modelo"
        class="block w-full !mb-0 bg-none appearance-none rounded-lg border-0 outline outline-1 -outline-offset-1 outline-n-weak hover:outline-n-slate-6 focus:outline-n-brand bg-n-alpha-black2 text-n-slate-12 transition-all duration-200 ltr:pr-9 rtl:pl-9"
        :class="compacto ? 'h-8 px-2.5 text-xs' : 'h-10 px-3 text-sm'"
      >
        <option v-for="o in options" :key="o.value" :value="o.value">
          {{ o.label }}
        </option>
      </select>
      <Icon
        icon="i-lucide-chevron-down"
        class="absolute -translate-y-1/2 pointer-events-none top-1/2 ltr:right-3 rtl:left-3 size-4 text-n-slate-10"
      />
    </span>
    <span v-if="ayuda" class="text-xs text-n-slate-10">{{ ayuda }}</span>
  </label>
</template>
