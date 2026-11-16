<script setup>
// [turuta] La lista de etapas con su color, para Ajustes -> Colores de etapa
// (los del equipo) y para el Perfil (los propios). Cada fila trae un chat de
// muestra pintado como va a quedar, para verlo antes de guardar.
import { computed } from 'vue';
import Button from 'dashboard/components-next/button/Button.vue';
import ColorPicker from 'dashboard/components-next/colorpicker/ColorPicker.vue';
import StageBadge from './StageBadge.vue';
import {
  NINGUNO,
  PALETA,
  legibleCon,
  normalizarColor,
  tinte,
} from './coloresDeEtapa';

const props = defineProps({
  /** [{ codigo, nombre, color }]: color es el del equipo. */
  etapas: { type: Array, default: () => [] },
  /**
   * Del equipo: { codigo: "#RRGGBB" | null }.
   * Propios: { codigo: "#RRGGBB" | NINGUNO }; sin la clave, el del equipo.
   */
  modelValue: { type: Object, default: () => ({}) },
  personal: { type: Boolean, default: false },
  /** La intensidad con que se pintan las muestras (1, la de por defecto). */
  intensidad: { type: Number, default: 1 },
});

const emit = defineEmits(['update:modelValue']);

const nombreDe = color => PALETA.find(p => p.color === color)?.nombre || color;

const filas = computed(() =>
  props.etapas.map(etapa => {
    const delEquipo = normalizarColor(etapa.color) || null;
    const elegido = props.modelValue[etapa.codigo];
    if (!props.personal) {
      const color =
        elegido === undefined ? delEquipo : normalizarColor(elegido) || null;
      return { ...etapa, color, texto: color ? nombreDe(color) : 'Sin color' };
    }
    if (elegido === NINGUNO) {
      return {
        ...etapa,
        color: null,
        propio: true,
        texto: 'Sin color, solo para ti',
      };
    }
    const propio = normalizarColor(elegido);
    if (propio) {
      return {
        ...etapa,
        color: propio,
        propio: true,
        texto: `${nombreDe(propio)}, solo para ti`,
      };
    }
    return {
      ...etapa,
      color: delEquipo,
      propio: false,
      texto: delEquipo
        ? `${nombreDe(delEquipo)}, el del equipo`
        : 'Sin color, como el equipo',
    };
  })
);

function poner(codigo, valor) {
  const siguiente = { ...props.modelValue };
  if (valor === undefined) delete siguiente[codigo];
  else siguiente[codigo] = valor;
  emit('update:modelValue', siguiente);
}

const ponerLibre = (codigo, valor) => {
  const color = normalizarColor(valor);
  if (color) poner(codigo, color);
};
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la pantalla es nuestra y no pasa por el i18n de Chatwoot -->
  <ul class="flex flex-col p-0 m-0 list-none">
    <li
      v-for="fila in filas"
      :key="fila.codigo"
      class="flex flex-col gap-3 py-4 border-b border-n-weak last:border-b-0 md:flex-row md:items-center md:gap-5"
    >
      <div
        class="flex items-start gap-2 px-3 py-2 border rounded-lg border-n-weak bg-n-surface-1 md:w-64 md:flex-none"
        :class="fila.color ? 'turuta-tinte' : ''"
        :style="fila.color ? tinte(fila.color, intensidad) : {}"
        aria-hidden="true"
      >
        <span
          class="grid flex-none mt-0.5 text-xs font-medium rounded-full size-7 place-items-center bg-n-slate-4 text-n-slate-12"
        >
          AB
        </span>
        <div class="min-w-0">
          <div
            class="flex flex-wrap items-center text-sm font-medium gap-y-1 text-n-slate-12"
          >
            <span>Ana Bravo</span>
            <StageBadge :name="fila.nombre" />
          </div>
          <div class="text-sm truncate text-n-slate-11">
            Hola, ¿sigue disponible?
          </div>
        </div>
      </div>

      <div class="flex flex-col min-w-0 gap-2">
        <div class="flex flex-col gap-0.5">
          <h3 class="m-0 text-base font-semibold text-n-slate-12">
            {{ fila.nombre }}
          </h3>
          <p class="m-0 text-sm text-n-slate-11">{{ fila.texto }}</p>
          <p
            v-if="fila.color && !legibleCon(fila.color, intensidad)"
            class="m-0 text-xs text-n-amber-11"
          >
            Con esta intensidad, el texto se lee peor sobre este color.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="p in PALETA"
            :key="p.color"
            type="button"
            class="rounded-full size-6 outline outline-1 outline-n-weak focus-visible:outline-2 focus-visible:outline-n-brand"
            :class="
              fila.color === p.color
                ? 'ring-2 ring-offset-2 ring-n-slate-12 ring-offset-n-solid-2'
                : ''
            "
            :style="{ backgroundColor: p.color }"
            :title="p.nombre"
            :aria-label="`${fila.nombre}: ${p.nombre}`"
            :aria-pressed="fila.color === p.color"
            @click="poner(fila.codigo, p.color)"
          />
          <ColorPicker
            :model-value="fila.color || '#FFFFFF'"
            @update:model-value="valor => ponerLibre(fila.codigo, valor)"
          />
          <Button
            size="xs"
            variant="faded"
            color="slate"
            label="Sin color"
            @click="poner(fila.codigo, personal ? NINGUNO : null)"
          />
          <Button
            v-if="personal && fila.propio"
            size="xs"
            variant="link"
            color="blue"
            label="Volver al del equipo"
            @click="poner(fila.codigo, undefined)"
          />
        </div>
      </div>
    </li>
  </ul>
</template>
