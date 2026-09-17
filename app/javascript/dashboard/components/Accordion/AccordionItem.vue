<script setup>
import EmojiOrIcon from 'shared/components/EmojiOrIcon.vue';

defineProps({
  title: {
    type: String,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: '',
  },
  emoji: {
    type: String,
    default: '',
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['toggle']);

const onToggle = () => {
  emit('toggle');
};
</script>

<template>
  <!-- [turuta] Estilo de tarjeta: borde suave, esquinas redondas y una flecha
       que gira, en vez de la caja gris con + y -. Solo lo usa el panel de
       contacto. Sin overflow-hidden: los desplegables de dentro se cortarian. -->
  <div class="text-sm border rounded-xl border-n-weak bg-n-solid-1">
    <button
      class="flex items-center justify-between w-full px-4 py-2.5 m-0 select-none cursor-grab drag-handle hover:bg-n-alpha-1"
      :class="isOpen ? 'rounded-t-xl' : 'rounded-xl'"
      @click.stop="onToggle"
    >
      <div class="flex items-center min-w-0">
        <EmojiOrIcon class="inline-block w-5" :icon="icon" :emoji="emoji" />
        <h5
          class="py-0 pl-0 pr-2 mb-0 text-sm font-medium truncate text-n-slate-12"
        >
          {{ title }}
        </h5>
      </div>
      <div class="flex flex-row items-center gap-1">
        <slot name="button" />
        <span
          class="transition-transform i-lucide-chevron-down size-4 text-n-slate-10"
          :class="{ 'rotate-180': isOpen }"
        />
      </div>
    </button>
    <div
      v-if="isOpen"
      class="border-t border-n-weak"
      :class="compact ? 'p-0' : 'px-2 py-4'"
    >
      <slot />
    </div>
  </div>
</template>
