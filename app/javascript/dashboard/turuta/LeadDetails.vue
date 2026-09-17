<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<script setup>
// [turuta] Seccion "Lead" del acordeon del panel de contacto: transferir a otro
// asesor y el historial. Se consultan, pero no se usan a cada minuto, por eso
// van dentro del acordeon y no en la zona fija (LeadHeader). Como el acordeon
// es reordenable, quien quiera el historial siempre a la vista se lo sube.
import { computed, ref, watch } from 'vue';
import Button from 'dashboard/components-next/button/Button.vue';
import { useLead } from './useLead';
import { cuando } from './leadApp';

const props = defineProps({
  conversationId: {
    type: [Number, String],
    required: true,
  },
});

const { state, transferir } = useLead(computed(() => props.conversationId));
const lead = computed(() => (state.lead?.found ? state.lead : null));

const candidato = ref(null); // asesor elegido, a falta de confirmar

watch(
  () => state.conversationId,
  () => {
    candidato.value = null;
  }
);

async function confirmar() {
  if (!candidato.value || state.busy) return;
  const ok = await transferir(candidato.value.id);
  if (ok) candidato.value = null;
}

const icono = tipo => {
  if (tipo === 'etapa') return 'i-lucide-flag';
  if (tipo === 'liberacion') return 'i-lucide-arrow-left-right';
  return 'i-lucide-user-round';
};
</script>

<template>
  <div class="flex flex-col gap-4 px-4 py-3" data-turuta="lead-details">
    <p v-if="!lead" class="text-xs text-n-slate-11">
      {{ state.loading ? 'Cargando...' : 'Sin lead para esta conversacion.' }}
    </p>

    <template v-else>
      <section v-if="lead.asesores.length">
        <h4
          class="mb-1.5 text-xs font-medium tracking-wide uppercase text-n-slate-10"
        >
          Transferir a
        </h4>
        <div
          v-if="candidato"
          class="p-2 border rounded-lg border-n-weak bg-n-alpha-1"
        >
          <div class="text-sm text-n-slate-12">
            Pasara a <b>{{ candidato.nombre }}</b>, que recibira un aviso.
          </div>
          <div class="flex justify-end gap-2 mt-2">
            <Button
              label="Cancelar"
              variant="ghost"
              color="slate"
              size="sm"
              @click="candidato = null"
            />
            <Button
              label="Transferir"
              variant="solid"
              color="blue"
              size="sm"
              :disabled="state.busy"
              :is-loading="state.busy"
              @click="confirmar"
            />
          </div>
        </div>
        <div v-else class="flex flex-col gap-1">
          <button
            v-for="a in lead.asesores"
            :key="a.id"
            type="button"
            class="flex items-center justify-between w-full px-2 py-1.5 text-sm text-left rounded-md text-n-slate-12 hover:bg-n-alpha-2"
            :disabled="state.busy"
            @click="candidato = a"
          >
            <span class="truncate">{{ a.nombre }}</span>
            <span class="flex-shrink-0 i-lucide-arrow-right size-3.5 text-n-slate-10" />
          </button>
        </div>
      </section>

      <section v-if="lead.historial.length">
        <h4
          class="mb-1.5 text-xs font-medium tracking-wide uppercase text-n-slate-10"
        >
          Historial
        </h4>
        <ol class="flex flex-col gap-2">
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
      </section>

      <p v-if="state.aviso" class="text-xs text-n-ruby-11">
        {{ state.aviso }}
      </p>
    </template>
  </div>
</template>
