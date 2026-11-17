<script setup>
// [turuta] La intensidad del color de una etapa (17/11): una barra de mas
// suave a solido. 100 % es la de por defecto, la que deja leer el texto; al
// final de la barra, sin transparencia. En el perfil, sin tocarla, vale la del
// equipo. Los avisos de legibilidad los pone la fila (EditorDeColores.vue).
import { computed } from 'vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { INTENSIDAD, esSolido, normalizarIntensidad } from './coloresDeEtapa';

const props = defineProps({
  /** Para que cada fila tenga su barra con su etiqueta. */
  id: { type: String, required: true },
  /** La elegida; null, la de por defecto (o la del equipo, en el perfil). */
  modelValue: { type: Number, default: null },
  /** La que vale cuando no se elige ninguna: 1, o la del equipo. */
  porDefecto: { type: Number, default: 1 },
  /** El texto del boton para volver a la de por defecto. */
  textoPorDefecto: { type: String, default: 'Por defecto' },
  /** Lo que se dice junto al valor cuando no se eligio ninguna. */
  etiquetaPorDefecto: { type: String, default: 'por defecto' },
});

const emit = defineEmits(['update:modelValue']);

const valor = computed(() => props.modelValue ?? props.porDefecto);
const texto = computed(() =>
  esSolido(valor.value) ? 'Sólido' : `${Math.round(valor.value * 100)} %`
);

const cambiar = e => {
  const n = Number(e.target.value);
  // Volver al valor que vale sin elegir es lo mismo que no elegir.
  if (n === props.porDefecto) emit('update:modelValue', null);
  else emit('update:modelValue', normalizarIntensidad(n) ?? 1);
};
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: el control es nuestro y no pasa por el i18n de Chatwoot -->
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <label :for="id" class="text-xs font-medium text-n-slate-11">
      Intensidad
    </label>
    <span class="text-xs text-n-slate-11">Suave</span>
    <input
      :id="id"
      type="range"
      class="w-40 accent-n-brand"
      :min="INTENSIDAD.minima"
      :max="INTENSIDAD.maxima"
      :step="INTENSIDAD.paso"
      :value="valor"
      @input="cambiar"
    />
    <span class="text-xs text-n-slate-11">Sólido</span>
    <span class="text-xs font-medium tabular-nums text-n-slate-12">
      {{ texto }}
      <template v-if="modelValue === null">
        · {{ etiquetaPorDefecto }}
      </template>
    </span>
    <Button
      v-if="modelValue !== null"
      size="xs"
      variant="link"
      color="blue"
      :label="textoPorDefecto"
      @click="emit('update:modelValue', null)"
    />
  </div>
</template>
