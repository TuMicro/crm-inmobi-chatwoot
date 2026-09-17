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
import {
  textoError,
  cuandoVisita,
  textoVisita,
  fechaInput,
  horaInput,
  isoDesdeInputs,
} from './leadApp';

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

const { state, cambiarEtapa, agendarVisita, quitarVisita } = useLead(
  computed(() => props.conversationId),
  computed(() => props.contact)
);

const lead = computed(() => (state.lead?.found ? state.lead : null));
const siguiente = computed(() => lead.value?.siguiente || null);
const otras = computed(() =>
  (lead.value?.siguientes || []).filter(s => s.code !== siguiente.value?.code)
);

const abierto = ref(false); // el desplegable "Mover a otra etapa"
const motivoPara = ref(null); // etapa que pide motivo, mientras se elige
const motivo = ref(null);
const nota = ref('');

// La visita: fecha, hora y direccion. Se pide al entrar en una etapa que la
// exige (Visita agendada) y se puede cambiar despues desde la ficha. Dos horas
// antes le llega al lead un recordatorio por WhatsApp (lo manda nuestra API).
const visitaPara = ref(null); // etapa que pide visita, mientras se rellena
const editandoVisita = ref(false); // cambiar la visita vigente
const vFecha = ref('');
const vHora = ref('');
const vDireccion = ref('');
const formularioVisita = computed(
  () => !!visitaPara.value || editandoVisita.value
);

function abrirVisita(etapa) {
  const actual = lead.value?.visita;
  visitaPara.value = etapa;
  editandoVisita.value = !etapa;
  vFecha.value = fechaInput(actual ? actual.scheduledAt : new Date());
  vHora.value = actual ? horaInput(actual.scheduledAt) : '';
  vDireccion.value = actual ? actual.address : '';
  abierto.value = false;
}

// Que cualquier clic en el campo abra el selector de fecha u hora, no solo
// el icono de la derecha. showPicker solo existe en navegadores modernos y
// solo funciona dentro de un gesto del usuario; si no, el navegador hace lo
// suyo.
function abrirSelector(event) {
  const input = event.target;
  if (typeof input.showPicker !== 'function') return;
  try {
    input.showPicker();
  } catch (e) {
    // sin gesto de usuario o ya abierto: no pasa nada
  }
}

function cerrarVisita() {
  visitaPara.value = null;
  editandoVisita.value = false;
}

const visitaIso = computed(() => isoDesdeInputs(vFecha.value, vHora.value));
const puedeGuardarVisita = computed(
  () =>
    !!visitaIso.value && new Date(visitaIso.value) > new Date() && !state.busy
);

async function guardarVisita() {
  if (!puedeGuardarVisita.value) return;
  const direccion = vDireccion.value.trim();
  const ok = visitaPara.value
    ? await cambiarEtapa(visitaPara.value.code, {
        visitAt: visitaIso.value,
        visitAddress: direccion,
      })
    : await agendarVisita(visitaIso.value, direccion);
  if (ok) cerrarVisita();
}

watch(
  () => state.conversationId,
  () => {
    abierto.value = false;
    motivoPara.value = null;
    cerrarVisita();
  }
);

function elegir(etapa) {
  abierto.value = false;
  if (etapa.requiereVisita) {
    abrirVisita(etapa);
    return;
  }
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

// Perdido va en gris, no en rojo: en rojo llamaba demasiado la atencion en
// un panel que el asesor mira todo el dia.
const claseEtapa = computed(() => {
  if (!lead.value?.etapa?.terminal) return 'bg-n-blue-3 text-n-blue-11';
  return lead.value.perdida
    ? 'bg-n-slate-3 text-n-slate-11'
    : 'bg-n-teal-3 text-n-teal-11';
});
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en espanol a proposito: la ficha es nuestra y no pasa por el i18n de Chatwoot -->
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
        class="px-2 py-1.5 mt-2 text-xs rounded-md bg-n-alpha-2 text-n-slate-11"
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
          :class="
            lead.ventana24h ? 'i-lucide-clock' : 'i-lucide-alert-triangle'
          "
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
        v-if="lead.visita && !formularioVisita"
        class="px-2 py-1.5 mt-2 text-xs rounded-md bg-n-alpha-2 text-n-slate-12"
      >
        <div class="flex items-center gap-1.5">
          <span
            class="flex-shrink-0 i-lucide-calendar-check size-3.5 text-n-slate-10"
          />
          <span class="font-medium">Visita</span>
          <span class="truncate">{{
            cuandoVisita(lead.visita.scheduledAt)
          }}</span>
        </div>
        <div v-if="lead.visita.address" class="truncate text-n-slate-11">
          {{ lead.visita.address }}
        </div>
        <div class="text-n-slate-11">{{ textoVisita(lead.visita) }}</div>
        <div class="flex gap-3 mt-1">
          <button
            type="button"
            class="text-n-blue-11 hover:underline"
            :disabled="state.busy"
            @click="abrirVisita(null)"
          >
            Cambiar
          </button>
          <button
            type="button"
            class="text-n-slate-11 hover:underline"
            :disabled="state.busy"
            @click="quitarVisita()"
          >
            Quitar
          </button>
        </div>
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
            color="blue"
            size="sm"
            :disabled="!puedeConfirmar"
            :is-loading="state.busy"
            @click="confirmarMotivo"
          />
        </div>
      </div>

      <div
        v-else-if="formularioVisita"
        class="p-3 mt-3 border rounded-xl border-n-weak bg-n-solid-1"
      >
        <div class="text-sm font-medium text-n-slate-12">
          {{ visitaPara ? 'Agendar la visita' : 'Cambiar la visita' }}
        </div>
        <p class="mt-0.5 text-xs text-n-slate-11">
          Dos horas antes le llega al lead un recordatorio por WhatsApp.
        </p>
        <label class="block mt-3 text-xs font-medium text-n-slate-11">
          Fecha
          <input
            v-model="vFecha"
            type="date"
            :min="fechaInput(new Date())"
            class="turuta-input"
            @click="abrirSelector"
          />
        </label>
        <label class="block mt-2 text-xs font-medium text-n-slate-11">
          Hora
          <input
            v-model="vHora"
            type="time"
            class="turuta-input"
            @click="abrirSelector"
          />
        </label>
        <label class="block mt-2 text-xs font-medium text-n-slate-11">
          Direccion
          <span class="font-normal text-n-slate-10">(opcional)</span>
          <input
            v-model="vDireccion"
            type="text"
            placeholder="Av. Larco 1234, Miraflores"
            class="turuta-input"
          />
        </label>
        <div class="flex justify-end gap-2 mt-3">
          <Button
            label="Cancelar"
            variant="ghost"
            color="slate"
            size="sm"
            @click="cerrarVisita"
          />
          <Button
            :label="visitaPara ? 'Agendar' : 'Guardar'"
            variant="solid"
            color="blue"
            size="sm"
            :disabled="!puedeGuardarVisita"
            :is-loading="state.busy"
            @click="guardarVisita"
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
            class="flex items-center justify-between w-full px-2 py-1.5 text-sm text-left rounded-md text-n-slate-12 hover:bg-n-alpha-2"
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

<style scoped>
/* [turuta] Campos del formulario de visita, con los mismos tokens que los
   inputs de Chatwoot. */
.turuta-input {
  @apply block w-full h-9 px-3 mt-1 text-sm font-normal rounded-lg border border-n-weak bg-n-alpha-black2 text-n-slate-12 outline-none hover:border-n-slate-6 focus:border-n-strong;
}
input[type='date'].turuta-input::-webkit-calendar-picker-indicator,
input[type='time'].turuta-input::-webkit-calendar-picker-indicator {
  @apply opacity-60 cursor-pointer;
}
</style>
