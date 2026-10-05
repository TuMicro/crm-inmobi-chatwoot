<script setup>
// [turuta] Ajustes → "Reiniciar un lead" (solo administradores): borrar a una
// persona de esta cuenta para volver a probar como si escribiera por primera
// vez. Lo mismo que infra/reset-lead.sh en la maquina, contra nuestra API
// (dashboard-app/leads/reinicio). Primero se ve lo que se borraria; borrar
// pide escribir BORRAR. Se busca por telefono, por el usuario de WhatsApp
// (@usuario) o por el numero del chat (#63): quien escribe con un nombre de
// usuario de Meta llega sin telefono (05/10).
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import { leadAppConfig } from './leadApp';

const CONFIRMACION = 'BORRAR';

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const currentUser = useMapGetter('getCurrentUser');
const config = computed(() => leadAppConfig(apps.value));

const busqueda = ref('');
const confirmacion = ref('');
const vista = ref(null);
const buscando = ref(false);
const borrando = ref(false);
const errorBusqueda = ref('');

const hayAlgo = computed(
  () =>
    !!vista.value && (vista.value.contactos.length || vista.value.leads.length)
);
const puedeBorrar = computed(
  () => hayAlgo.value && confirmacion.value.trim() === CONFIRMACION
);

async function pedir(path, init = {}) {
  const cfg = config.value;
  if (!cfg) throw new Error('No se pudo leer la configuración del CRM.');
  const r = await fetch(cfg.api + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.message || 'No se pudo completar.');
  return cuerpo;
}

async function buscar() {
  if (!busqueda.value.trim() || buscando.value) return;
  buscando.value = true;
  errorBusqueda.value = '';
  vista.value = null;
  confirmacion.value = '';
  try {
    const q = new URLSearchParams({
      accountId: String(route.params.accountId),
      q: busqueda.value,
    });
    vista.value = await pedir(`/dashboard-app/leads/reinicio?${q}`);
  } catch (e) {
    errorBusqueda.value = e.message;
  } finally {
    buscando.value = false;
  }
}

async function borrar() {
  if (!puedeBorrar.value || borrando.value) return;
  borrando.value = true;
  try {
    const r = await pedir('/dashboard-app/leads/reinicio', {
      method: 'POST',
      body: JSON.stringify({
        accountId: Number(route.params.accountId),
        q: vista.value.q,
        confirmacion: confirmacion.value.trim(),
        updatedBy: currentUser.value?.name || '',
      }),
    });
    useAlert(
      `Listo: el siguiente mensaje de ${r.etiqueta || r.phone} entra como lead nuevo.`
    );
    vista.value = null;
    confirmacion.value = '';
  } catch (e) {
    useAlert(`No se pudo borrar: ${e.message}`);
  } finally {
    borrando.value = false;
  }
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
});

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    class="w-full px-6 overflow-auto bg-n-surface-1"
    data-turuta="reiniciar-lead"
  >
    <div class="max-w-3xl pb-24 mx-auto">
      <ReportHeader
        header-title="Reiniciar un lead"
        header-description="Para volver a probar con un número como si escribiera por primera vez."
      />

      <section class="flex flex-col gap-5" :class="TARJETA">
        <div
          class="flex gap-3 px-4 py-3 text-sm rounded-lg bg-n-ruby-2 text-n-ruby-11"
        >
          <Icon
            icon="i-lucide-triangle-alert"
            class="flex-none mt-0.5 size-4"
          />
          <div>
            <p class="mb-1 font-medium">Borra a esa persona de esta cuenta</p>
            <p class="mb-0">
              Su contacto, con todos sus chats y mensajes, y su lead, con la
              etapa, el asesor, el historial, las visitas y lo que hizo la IA.
              No toca asesores, etiquetas, propiedades ni a nadie más.
              <span class="font-medium">No se puede deshacer.</span> Es para
              números de prueba: el siguiente mensaje desde ese número entra
              como un lead nuevo.
            </p>
          </div>
        </div>

        <form class="flex flex-wrap items-end gap-3" @submit.prevent="buscar">
          <div class="grow basis-64">
            <Input
              v-model="busqueda"
              label="Número, usuario de WhatsApp o número del chat"
              placeholder="+51 966 723 347 · @usuario · #63"
              message="El número con el código de país (un celular de Perú de 9 dígitos también vale). Si escribe sin mostrar su número, su usuario de WhatsApp (@…) o el número del chat (#63, arriba del chat)."
            />
          </div>
          <Button
            type="submit"
            label="Buscar"
            icon="i-lucide-search"
            variant="faded"
            color="slate"
            :is-loading="buscando"
            :disabled="!busqueda.trim()"
          />
        </form>

        <p v-if="errorBusqueda" class="mb-0 text-sm text-n-ruby-11">
          {{ errorBusqueda }}
        </p>

        <div v-if="vista" class="flex flex-col gap-4">
          <div class="p-4 rounded-lg bg-n-alpha-1">
            <p class="mb-2 text-sm font-medium text-n-slate-12">
              Esto es lo que hay de {{ vista.etiqueta || vista.phone }}
            </p>
            <ul
              v-if="hayAlgo"
              class="flex flex-col gap-1 mb-0 text-sm list-disc ltr:pl-5 rtl:pr-5 text-n-slate-11"
            >
              <li v-for="c in vista.contactos" :key="`c${c.id}`">
                Contacto «{{ c.nombre }}», con
                {{ c.chats === 1 ? '1 chat' : `${c.chats} chats` }}
              </li>
              <li v-for="l in vista.leads" :key="`l${l.id}`">
                Lead «{{ l.nombre }}» en {{ l.etapa }}, asesor
                {{ l.asesor || 'ninguno' }}, {{ l.ia }}
              </li>
            </ul>
            <p v-else class="mb-0 text-sm text-n-slate-10">
              Ningún contacto ni lead con eso en esta cuenta: no hay nada que
              borrar.
            </p>
          </div>

          <form
            v-if="hayAlgo"
            class="flex flex-wrap items-end gap-3"
            @submit.prevent="borrar"
          >
            <div class="grow basis-64">
              <Input
                v-model="confirmacion"
                :label="`Escribe ${CONFIRMACION} para borrarlo`"
                :placeholder="CONFIRMACION"
              />
            </div>
            <Button
              type="submit"
              label="Borrar"
              icon="i-lucide-trash-2"
              color="ruby"
              :is-loading="borrando"
              :disabled="!puedeBorrar"
            />
          </form>
        </div>
      </section>
    </div>
  </div>
</template>
