<script setup>
// [turuta] La lista de etapas con su color y su intensidad, para Ajustes ->
// Colores de etapa (los del equipo) y para el Perfil (los propios). Cada fila
// trae un chat de muestra pintado como va a quedar, para verlo antes de
// guardar, y avisa si con esa intensidad el texto se lee peor.
import { computed } from 'vue';
import Button from 'dashboard/components-next/button/Button.vue';
import ColorPicker from 'dashboard/components-next/colorpicker/ColorPicker.vue';
import StageBadge from './StageBadge.vue';
import ControlDeIntensidad from './ControlDeIntensidad.vue';
import {
  NINGUNO,
  PALETA,
  esSolido,
  intensidadPropia,
  legibleCon,
  normalizarColor,
  normalizarIntensidad,
  tinte,
} from './coloresDeEtapa';

const props = defineProps({
  /** [{ codigo, nombre, color, intensidad }]: lo del equipo. */
  etapas: { type: Array, default: () => [] },
  /**
   * Del equipo: { codigo: "#RRGGBB" | null }.
   * Propios: { codigo: "#RRGGBB" | NINGUNO }; sin la clave, el del equipo.
   */
  modelValue: { type: Object, default: () => ({}) },
  /**
   * Del equipo: { codigo: intensidad | null } (null, la de por defecto).
   * Propias: { codigo: intensidad }; sin la clave, la del equipo.
   */
  intensidades: { type: Object, default: () => ({}) },
  personal: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'update:intensidades']);

const nombreDe = color => PALETA.find(p => p.color === color)?.nombre || color;

/** El color de la fila y como decirlo. */
function colorDe(etapa) {
  const delEquipo = normalizarColor(etapa.color) || null;
  const elegido = props.modelValue[etapa.codigo];
  if (!props.personal) {
    const color =
      elegido === undefined ? delEquipo : normalizarColor(elegido) || null;
    return { color, texto: color ? nombreDe(color) : 'Sin color' };
  }
  if (elegido === NINGUNO) {
    return { color: null, propio: true, texto: 'Sin color, solo para ti' };
  }
  const propio = normalizarColor(elegido);
  if (propio) {
    return {
      color: propio,
      propio: true,
      texto: `${nombreDe(propio)}, solo para ti`,
    };
  }
  return {
    color: delEquipo,
    propio: false,
    texto: delEquipo
      ? `${nombreDe(delEquipo)}, el del equipo`
      : 'Sin color, como el equipo',
  };
}

/** La intensidad de la fila: la elegida (o null) y la que se ve. */
function intensidadDe(etapa) {
  const delEquipo = normalizarIntensidad(etapa.intensidad) ?? 1;
  if (!props.personal) {
    const elegida = normalizarIntensidad(props.intensidades[etapa.codigo]);
    return { elegida: elegida ?? null, vale: elegida ?? 1, porDefecto: 1 };
  }
  const propia = intensidadPropia(props.intensidades[etapa.codigo]);
  return {
    elegida: propia ?? null,
    vale: propia ?? delEquipo,
    porDefecto: delEquipo,
  };
}

const filas = computed(() =>
  props.etapas.map(etapa => {
    const c = colorDe(etapa);
    const i = intensidadDe(etapa);
    let aviso = '';
    if (c.color && esSolido(i.vale)) {
      aviso = 'Sin transparencia: sobre este color el texto puede no leerse.';
    } else if (c.color && !legibleCon(c.color, i.vale)) {
      aviso = 'Con esta intensidad, el texto se lee peor sobre este color.';
    }
    return { ...etapa, ...c, intensidad: i, aviso };
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

/** null es "la de por defecto" (o "la del equipo", en el perfil). */
function ponerIntensidad(codigo, valor) {
  const siguiente = { ...props.intensidades };
  if (props.personal && valor === null) delete siguiente[codigo];
  else siguiente[codigo] = valor;
  emit('update:intensidades', siguiente);
}
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
        :style="fila.color ? tinte(fila.color, fila.intensidad.vale) : {}"
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
        <ControlDeIntensidad
          v-if="fila.color"
          :id="`turuta-intensidad-${fila.codigo}`"
          :model-value="fila.intensidad.elegida"
          :por-defecto="fila.intensidad.porDefecto"
          :texto-por-defecto="personal ? 'Usar la del equipo' : 'Por defecto'"
          :etiqueta-por-defecto="personal ? 'la del equipo' : 'por defecto'"
          @update:model-value="valor => ponerIntensidad(fila.codigo, valor)"
        />
        <p v-if="fila.aviso" class="m-0 text-xs text-n-amber-11">
          {{ fila.aviso }}
        </p>
      </div>
    </li>
  </ul>
</template>
