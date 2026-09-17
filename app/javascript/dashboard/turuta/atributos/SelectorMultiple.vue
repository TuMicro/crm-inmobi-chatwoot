<script setup>
// [turuta] Editor de un atributo de lista con seleccion multiple: una pastilla
// por opcion, se marca y se desmarca con un clic y se guarda al momento.
// Sin boton de guardar a proposito: igual que el resto de atributos del panel.
import { computed } from 'vue';
import { aLista, alternar } from './multiple';

const props = defineProps({
  opciones: { type: Array, default: () => [] },
  valor: { type: [Array, String, Number, Boolean], default: () => [] },
});

// update: la lista nueva. delete: se desmarco la ultima, y el atributo se quita
// en vez de guardar un array vacio, para que "esta presente" siga significando algo.
const emit = defineEmits(['update', 'delete']);

const elegidas = computed(() => aLista(props.valor));

// Opciones que el contacto tiene guardadas y un admin ya borro de la lista: se
// siguen viendo, para poder quitarlas.
const visibles = computed(() => [
  ...props.opciones,
  ...elegidas.value.filter(v => !props.opciones.includes(v)),
]);

function pulsar(opcion) {
  const nueva = alternar(elegidas.value, opcion, props.opciones);
  if (nueva.length) emit('update', nueva);
  else emit('delete');
}
</script>

<template>
  <div class="flex flex-wrap gap-1.5 py-1" data-turuta="atributo-multiple">
    <button
      v-for="opcion in visibles"
      :key="opcion"
      type="button"
      class="px-2 py-0.5 text-xs border rounded-full transition-colors"
      :class="
        elegidas.includes(opcion)
          ? 'bg-n-brand/10 border-n-brand text-n-blue-11'
          : 'border-n-weak text-n-slate-11 hover:bg-n-alpha-1'
      "
      :aria-pressed="elegidas.includes(opcion)"
      @click="pulsar(opcion)"
    >
      {{ opcion }}
    </button>
  </div>
</template>
