<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<script setup>
// [turuta] Zona fija del panel de contacto, pegada a ContactInfo: la etapa, el
// asesor, la ventana de 24 h y el selector de etapa. Fuera del acordeon a
// proposito: mover de etapa es lo que mas veces al dia hace un asesor, y si
// estuviera dentro de una seccion el primer clic se gastaria en abrirla.
//
// Selector "B" (docs/10-plan-fork-ui.md): un boton para la etapa siguiente del
// embudo, que es el movimiento normal, y un desplegable para el resto.
import { computed, ref, watch } from 'vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { useLead } from './useLead';
import { textoError } from './leadApp';

const props = defineProps({
  conversationId: {
    type: [Number, String],
    required: true,
  },
  contact: {
    type: Object,
    default: () => ({}),
  },
});

const { state, cambiarEtapa } = useLead(
  computed(() => props.conversationId),
  computed(() => props.contact)
);

const lead = computed(() => (state.lead?.found ? state.lead : null));
const siguiente = computed(() => lead.value?.siguiente || null);
const otras = computed(() =>
  (lead.value?.siguientes || []).filter(
    s => s.code !== siguiente.value?.code
  )
);

const abierto = ref(false); // el desplegable "Mover a otra etapa"
const motivoPara = ref(null); // etapa que pide motivo, mientras se elige
const motivo = ref(null);
const nota = ref('');

watch(
  () => state.conversationId,
  () => {
    abierto.value = false;
    motivoPara.value = null;
  }
);

function elegir(etapa) {
  abierto.value = false;
  if (etapa.requiereMotivo) {
    motivoPara.value = etapa;
    motivo.value = null;
    nota.value = '';
    return;
  }
  cambiarEtapa(etapa.code);
}

const faltaNota = computed(
  () => !!motivo.value?.requiresNote && !nota.value.trim()
);
const puedeConfirmar = computed(
  () => !!motivo.value && !faltaNota.value && !state.busy
);

async function confirmarMotivo() {
  if (!puedeConfirmar.value) return;
  const extra = { reason: motivo.value.code };
  if (motivo.value.requiresNote) extra.reasonNote = nota.value.trim();
  const ok = await cambiarEtapa(motivoPara.value.code, extra);
  if (ok) motivoPara.value = null;
}

const claseEtapa = computed(() => {
  if (!lead.value?.etapa?.terminal) return 'bg-n-blue-3 text-n-blue-11';
  return lead.value.perdida
    ? 'bg-n-ruby-3 text-n-ruby-11'
    : 'bg-n-teal-3 text-n-teal-11';
});
</script>

<template>
  <div class="px-4 pb-3 border-b border-n-weak" data-turuta="lead-header">
    <p v-if="state.error" class="text-xs text-n-slate-11">
      {{ textoError(state.error) }}
    </p>

    <div
      v-else-if="state.loading && !lead"
      class="flex flex-col gap-2 animate-pulse"
    >
      <div class="h-4 rounded bg-n-alpha-2" />
      <div class="w-2/3 h-4 rounded bg-n-alpha-2" />
    </div>

    <p
      v-else-if="state.lead && !state.lead.found"
      class="text-xs text-n-slate-11"
    >
      Esta conversacion todavia no tiene un lead asociado.
    </p>

    <template v-else-if="lead">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs text-n-slate-11">Etapa</span>
        <span
          class="px-2 py-0.5 text-xs font-medium rounded-md"
          :class="claseEtapa"
        >
          {{ lead.etapa.name }}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2 mt-1">
        <span class="text-xs text-n-slate-11">Asesor</span>
        <span class="text-sm truncate text-n-slate-12">
          {{ lead.asesor || 'sin asignar' }}
        </span>
      </div>

      <div
        v-if="lead.perdida"
        class="px-2 py-1.5 mt-2 text-xs rounded-md bg-n-ruby-3 text-n-ruby-11"
      >
        <div class="font-medium">{{ lead.perdida.name }}</div>
        <div v-if="lead.perdida.nota">{{ lead.perdida.nota }}</div>
      </div>

      <div
        class="flex items-start gap-1.5 mt-2 text-xs"
        :class="lead.ventana24h ? 'text-n-teal-11' : 'text-n-amber-11'"
      >
        <span
          class="flex-shrink-0 size-3.5 mt-px"
          :class="lead.ventana24h ? 'i-lucide-clock' : 'i-lucide-alert-triangle'"
        />
        <span v-if="lead.ventana24h">
          <b>Dentro de la ventana de 24 h.</b> Responder es gratis.
        </span>
        <span v-else>
          <b>Fuera de la ventana de 24 h.</b> Solo se puede escribir con una
          plantilla aprobada, y tiene coste.
        </span>
      </div>

      <div
        v-if="motivoPara"
        class="p-2 mt-3 border rounded-lg border-n-weak bg-n-alpha-1"
      >
        <div class="text-sm font-medium text-n-slate-12">
          Marcar como {{ motivoPara.name.toLowerCase() }}
        </div>
        <div class="mt-0.5 text-xs text-n-slate-11">
          El motivo es obligatorio: sin el, los informes de perdida no valen
          nada.
        </div>
        <div class="flex flex-col gap-1 mt-2">
          <label
            v-for="m in lead.motivosPerdida"
            :key="m.code"
            class="flex items-center gap-2 text-sm cursor-pointer text-n-slate-12"
          >
            <input
              v-model="motivo"
              type="radio"
              name="turuta-motivo"
              :value="m"
            />
            <span>{{ m.name }}</span>
          </label>
        </div>
        <textarea
          v-if="motivo && motivo.requiresNote"
          v-model="nota"
          rows="2"
          placeholder="Cuenta que paso"
          class="w-full px-2 py-1 mt-2 text-sm border rounded-md border-n-weak bg-n-background text-n-slate-12"
        />
        <div class="flex justify-end gap-2 mt-2">
          <Button
            label="Cancelar"
            variant="ghost"
            color="slate"
            size="sm"
            @click="motivoPara = null"
          />
          <Button
            :label="`Marcar como ${motivoPara.name.toLowerCase()}`"
            variant="solid"
            color="ruby"
            size="sm"
            :disabled="!puedeConfirmar"
            :is-loading="state.busy"
            @click="confirmarMotivo"
          />
        </div>
      </div>

      <div
        v-else-if="lead.siguientes.length"
        class="flex flex-col gap-1.5 mt-3"
      >
        <Button
          v-if="siguiente"
          :label="siguiente.name"
          icon="i-lucide-arrow-right"
          variant="solid"
          color="blue"
          size="sm"
          class="w-full"
          :disabled="state.busy"
          :is-loading="state.busy"
          @click="elegir(siguiente)"
        />
        <Button
          v-if="otras.length"
          :label="abierto ? 'Cerrar' : 'Mover a otra etapa'"
          :icon="abierto ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          trailing-icon
          variant="faded"
          color="slate"
          size="sm"
          class="w-full"
          :disabled="state.busy"
          @click="abierto = !abierto"
        />
        <div
          v-if="abierto"
          class="flex flex-col gap-1 p-1 border rounded-lg border-n-weak bg-n-alpha-1"
        >
          <button
            v-for="s in otras"
            :key="s.code"
            type="button"
            class="flex items-center justify-between w-full px-2 py-1.5 text-sm text-left rounded-md hover:bg-n-alpha-2"
            :class="s.requiereMotivo ? 'text-n-ruby-11' : 'text-n-slate-12'"
            :disabled="state.busy"
            @click="elegir(s)"
          >
            <span>{{ s.name }}</span>
            <span v-if="s.requiereMotivo" class="text-xs text-n-slate-10">
              pide motivo
            </span>
          </button>
        </div>
      </div>

      <p v-if="state.aviso" class="mt-2 text-xs text-n-ruby-11">
        {{ state.aviso }}
      </p>
    </template>
  </div>
</template>
