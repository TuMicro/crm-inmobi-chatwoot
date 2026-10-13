<script setup>
// [turuta] Ajustes → "Calendario" (cada persona del equipo, no solo el
// administrador): conectar SU cuenta de Google para que sus visitas se pongan
// tambien en su Google Calendar (docs/18 del repo crm-inmobi).
//
// Conectar es salir a la pantalla de Google y volver: nuestra API da la
// direccion, Google devuelve a nuestra API y ella a esta pagina con
// ?calendario=conectado (o =error). El CRM crea un calendario propio,
// "Visitas · <empresa>", y solo puede tocar ese.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import { leadAppConfig } from './leadApp';
import { avisoDeVuelta } from './calendario';

const route = useRoute();
const router = useRouter();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const currentUser = useMapGetter('getCurrentUser');
const config = computed(() => leadAppConfig(apps.value));

const estado = ref(null); // respuesta de /dashboard-app/calendar
const error = ref('');
const ocupado = ref(false); // saliendo a Google o desconectando
const confirmando = ref(false); // "Desconectar" pide un segundo clic

const quien = computed(() =>
  new URLSearchParams({
    accountId: String(route.params.accountId),
    userId: String(currentUser.value?.id || ''),
  }).toString()
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

async function cargar() {
  if (!config.value || !currentUser.value?.id) return;
  try {
    estado.value = await pedir(`/dashboard-app/calendar?${quien.value}`);
    error.value = '';
  } catch (e) {
    error.value = e.message;
  }
}

async function conectar() {
  if (ocupado.value) return;
  ocupado.value = true;
  try {
    const r = await pedir('/dashboard-app/calendar/connect', {
      method: 'POST',
      body: JSON.stringify({
        accountId: Number(route.params.accountId),
        userId: currentUser.value?.id,
        userName: currentUser.value?.name || '',
      }),
    });
    // Se sale de la pagina: Google devuelve aqui mismo al terminar.
    window.location.assign(r.url);
  } catch (e) {
    useAlert(`No se pudo abrir Google: ${e.message}`);
    ocupado.value = false;
  }
}

async function desconectar() {
  if (ocupado.value) return;
  ocupado.value = true;
  try {
    await pedir(`/dashboard-app/calendar?${quien.value}`, { method: 'DELETE' });
    useAlert('Tu Google Calendar quedó desconectado.');
    confirmando.value = false;
    await cargar();
  } catch (e) {
    useAlert(`No se pudo desconectar: ${e.message}`);
  } finally {
    ocupado.value = false;
  }
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  // La vuelta de Google: se dice que paso y se limpia la direccion, para que
  // recargar la pagina no repita el aviso.
  const aviso = avisoDeVuelta(route.query);
  if (aviso) {
    useAlert(aviso.texto);
    router.replace({ query: {} });
  }
  cargar();
});

// La configuracion (la Dashboard App) y el usuario pueden llegar despues de
// montar la pagina, si se entra por la direccion.
watch([config, () => currentUser.value?.id], () => {
  if (!estado.value) cargar();
});

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    class="w-full px-6 overflow-auto bg-n-surface-1"
    data-turuta="calendario"
  >
    <div class="max-w-3xl pb-24 mx-auto">
      <ReportHeader
        header-title="Calendario"
        header-description="Tus visitas, también en tu Google Calendar."
      />

      <section class="flex flex-col gap-5" :class="TARJETA">
        <p v-if="error" class="mb-0 text-sm text-n-ruby-11">{{ error }}</p>

        <div v-else-if="!estado" class="flex flex-col gap-2 animate-pulse">
          <div class="w-1/2 h-4 rounded bg-n-alpha-2" />
          <div class="w-2/3 h-4 rounded bg-n-alpha-2" />
        </div>

        <p v-else-if="!estado.configurado" class="mb-0 text-sm text-n-slate-11">
          Todavía no está disponible en esta instalación: falta activar la
          conexión con Google en el servidor.
        </p>

        <template v-else-if="estado.conectado">
          <div
            v-if="estado.roto"
            class="flex gap-3 px-4 py-3 text-sm rounded-lg bg-n-amber-2 text-n-amber-11"
          >
            <Icon
              icon="i-lucide-triangle-alert"
              class="flex-none mt-0.5 size-4"
            />
            <div>
              <p class="mb-1 font-medium">Google dejó de aceptar la conexión</p>
              <p class="mb-0">
                {{ estado.error || 'Se revocó o caducó.' }} Tus visitas no se
                están poniendo en tu calendario. Vuelve a conectar la cuenta.
              </p>
            </div>
          </div>
          <div v-else class="flex items-start gap-3">
            <Icon
              icon="i-lucide-calendar-check"
              class="flex-none mt-0.5 size-5 text-n-teal-10"
            />
            <div class="min-w-0">
              <p class="mb-1 text-sm font-medium text-n-slate-12">
                Conectado con {{ estado.correo }}
              </p>
              <p class="mb-0 text-sm text-n-slate-11">
                Tus visitas están en el calendario «{{ estado.calendario }}» de
                esa cuenta.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <Button
              v-if="estado.roto"
              label="Volver a conectar"
              icon="i-lucide-refresh-cw"
              :is-loading="ocupado"
              @click="conectar"
            />
            <template v-if="confirmando">
              <span class="text-sm text-n-slate-11">
                Las visitas que ya están en tu calendario se quedan, pero dejan
                de actualizarse.
              </span>
              <Button
                label="Sí, desconectar"
                color="ruby"
                size="sm"
                :is-loading="ocupado"
                @click="desconectar"
              />
              <Button
                label="Cancelar"
                variant="ghost"
                color="slate"
                size="sm"
                @click="confirmando = false"
              />
            </template>
            <Button
              v-else
              label="Desconectar"
              icon="i-lucide-unplug"
              variant="faded"
              color="slate"
              :disabled="ocupado"
              @click="confirmando = true"
            />
          </div>
        </template>

        <template v-else>
          <p class="mb-0 text-sm text-n-slate-11">
            Conecta tu cuenta de Google y cada visita que agendes, o que te
            toque como asesor, aparece también en tu Google Calendar, con el
            aviso en el celular.
          </p>
          <div>
            <Button
              label="Conectar con Google"
              icon="i-lucide-calendar-plus"
              :is-loading="ocupado"
              @click="conectar"
            />
          </div>
        </template>
      </section>

      <section
        v-if="estado && estado.configurado"
        class="mt-6 text-sm text-n-slate-11"
        :class="TARJETA"
      >
        <p class="mb-2 font-medium text-n-slate-12">Cómo funciona</p>
        <ul class="flex flex-col gap-1.5 mb-0 list-disc ltr:pl-5 rtl:pr-5">
          <li>
            Cada persona conecta su propia cuenta. La visita va al calendario
            del asesor asignado al lead; si él no lo tiene conectado, al de
            quien la agenda.
          </li>
          <li>
            Dura siempre una hora, con la dirección, los datos del lead y el
            enlace a su chat.
          </li>
          <li>
            Al agendar puedes invitar a otros correos: les llega la invitación
            de Google, y también el cambio de hora o la cancelación.
          </li>
          <li>
            Si la visita cambia, se quita o el lead pasa a otro asesor, el
            calendario se pone al día solo.
          </li>
          <li>
            Va en un solo sentido: lo que muevas o borres en Google Calendar no
            cambia la visita en el CRM.
          </li>
          <li>
            El CRM crea un calendario aparte y solo puede ver ese: no lee el
            resto de tu agenda ni tu correo.
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
