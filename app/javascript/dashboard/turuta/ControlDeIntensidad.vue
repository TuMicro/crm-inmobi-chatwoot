<script setup>
// [turuta] La intensidad del color de etapa (17/11): una barra de mas suave a
// mas fuerte. 100 % es la de por defecto, la que deja leer el texto. En el
// perfil, sin tocarla, vale la del equipo.
import { computed } from 'vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { INTENSIDAD, normalizarIntensidad } from './coloresDeEtapa';

const props = defineProps({
  /** La elegida; null, la de por defecto (o la del equipo, en el perfil). */
  modelValue: { type: Number, default: null },
  /** La que vale cuando no se elige ninguna: 1, o la del equipo. */
  porDefecto: { type: Number, default: 1 },
  /** El texto del boton para volver a la de por defecto. */
  textoPorDefecto: { type: String, default: 'Volver a la de por defecto' },
  /** Lo que se dice junto al porcentaje cuando no se eligio ninguna. */
  etiquetaPorDefecto: { type: String, default: 'por defecto' },
});

const emit = defineEmits(['update:modelValue']);

const valor = computed(() => props.modelValue ?? props.porDefecto);
const porcentaje = computed(() => `${Math.round(valor.value * 100)} %`);

const cambiar = e => {
  const n = Number(e.target.value);
  // 1 es la de por defecto: se guarda como "ninguna elegida". En el perfil,
  // elegir la del equipo es lo mismo que no elegir.
  if (n === props.porDefecto) emit('update:modelValue', null);
  else emit('update:modelValue', normalizarIntensidad(n) ?? 1);
};
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: el control es nuestro y no pasa por el i18n de Chatwoot -->
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <label
        for="turuta-intensidad"
        class="text-sm font-semibold text-n-slate-12"
      >
        Intensidad del color
      </label>
      <span class="text-sm tabular-nums text-n-slate-11">
        {{ porcentaje }}
        <template v-if="modelValue === null">
          · {{ etiquetaPorDefecto }}
        </template>
      </span>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs text-n-slate-11">Más suave</span>
      <input
        id="turuta-intensidad"
        type="range"
        class="flex-1 accent-n-brand"
        :min="INTENSIDAD.minima"
        :max="INTENSIDAD.maxima"
        :step="INTENSIDAD.paso"
        :value="valor"
        @input="cambiar"
      />
      <span class="text-xs text-n-slate-11">Más fuerte</span>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Button
        v-if="modelValue !== null"
        size="xs"
        variant="link"
        color="blue"
        :label="textoPorDefecto"
        @click="emit('update:modelValue', null)"
      />
      <span v-if="valor > 1" class="text-xs text-n-amber-11">
        Por encima de 100 %, con algunos colores el texto se lee peor.
      </span>
    </div>
  </div>
</template>
