<script setup>
// [turuta] Seccion "Historial del lead" del acordeon del panel de contacto.
// Se consulta, pero no a cada rato: por eso va dentro del acordeon, la ultima
// y cerrada de entrada. Como el acordeon es reordenable, quien la quiera mas
// arriba se la sube.
//
// Transferir a otro asesor NO esta aqui a proposito: se hace con el selector
// "Agente asignado" de Chatwoot, que nuestra API ya recoge por webhook como
// reasignacion manual. Tener dos controles para lo mismo confundia.
import { computed } from 'vue';
import { useLead } from './useLead';
import { cuando } from './leadApp';

const props = defineProps({
  conversationId: {
    type: [Number, String],
    required: true,
  },
});

const { state } = useLead(computed(() => props.conversationId));
const lead = computed(() => (state.lead?.found ? state.lead : null));

const icono = tipo => {
  if (tipo === 'etapa') return 'i-lucide-flag';
  if (tipo === 'liberacion') return 'i-lucide-arrow-left-right';
  return 'i-lucide-user-round';
};
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en espanol a proposito: la ficha es nuestra y no pasa por el i18n de Chatwoot -->
  <div class="px-4 py-3" data-turuta="lead-details">
    <p v-if="!lead" class="text-xs text-n-slate-11">
      {{ state.loading ? 'Cargando...' : 'Sin lead para esta conversacion.' }}
    </p>
    <p v-else-if="!lead.historial.length" class="text-xs text-n-slate-11">
      Todavia no hay movimientos.
    </p>
    <ol v-else class="flex flex-col gap-2">
      <li v-for="(ev, i) in lead.historial" :key="i" class="flex gap-2">
        <span
          class="flex-shrink-0 size-3.5 mt-0.5 text-n-slate-10"
          :class="icono(ev.tipo)"
        />
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 text-sm text-n-slate-12">
            <span class="truncate">{{ ev.texto }}</span>
            <span
              v-if="ev.vigente"
              class="px-1 text-[10px] rounded bg-n-teal-3 text-n-teal-11"
            >
              actual
            </span>
          </div>
          <div class="text-xs text-n-slate-11">
            {{ ev.detalle }} · {{ cuando(ev.cuando) }}
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>
