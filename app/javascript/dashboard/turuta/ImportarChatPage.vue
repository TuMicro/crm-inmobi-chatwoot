<script setup>
/* global axios */
// [turuta] Ajustes → "Importar un chat" (solo administradores): subir un chat
// exportado de WhatsApp ("Exportar chat" en el celular, .txt o el .zip del
// iPhone) para que su historial quede en el CRM. Pedido el 03/11/2026: los
// numeros de MadHouse pasan al CRM y, al borrar la cuenta de WhatsApp
// Business, sus chats se pierden del celular (docs/25 en crm-inmobi).
//
// Dos pasos. Chatwoot crea el contacto y la conversacion con los mensajes y
// sus fechas, sin enviar nada (turuta_importaciones del fork). Despues
// nuestra API le da su lead, con el asesor y la etapa elegidos
// (dashboard-app/importaciones): asi, cuando ese cliente vuelva a escribir, su
// chat va a su asesor y no a la IA. Repetir con el mismo fichero no duplica.
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import { frontendURL } from 'dashboard/helper/URLHelper';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import CampoSelect from './CampoSelect.vue';
import { leadAppConfig } from './leadApp';
import {
  analizarChat,
  contactoDelArchivo,
  mensajesParaImportar,
  negocioProbable,
  telefonoE164,
  textoDelZip,
} from './importarChat';

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const currentUser = useMapGetter('getCurrentUser');
const config = computed(() => leadAppConfig(apps.value));
const cuenta = computed(() => Number(route.params.accountId));

const opciones = ref(null);
const errorOpciones = ref('');

const archivo = ref(null);
const leyendo = ref(false);
const errorArchivo = ref('');
const analisis = ref(null);
const huella = ref('');

const negocio = ref('');
const telefono = ref('');
const nombre = ref('');
const bandeja = ref('');
const asesor = ref('');
const etapa = ref('');

const importando = ref(false);
const hecho = ref(null);

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

async function cargarOpciones() {
  if (!config.value || opciones.value) return;
  try {
    opciones.value = await pedir(
      `/dashboard-app/importaciones/opciones?accountId=${cuenta.value}`
    );
    const o = opciones.value;
    bandeja.value =
      (o.bandejas.find(b => !b.prueba) || o.bandejas[0])?.inboxId ?? '';
    asesor.value = o.asesores[0]?.chatwootAgentId ?? '';
    etapa.value = o.etapaPorDefecto ?? o.etapas[0]?.id ?? '';
  } catch (e) {
    errorOpciones.value = e.message;
  }
}

watch(config, cargarOpciones);
onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  cargarOpciones();
});

const opcionesBandeja = computed(() =>
  (opciones.value?.bandejas || []).map(b => ({
    value: b.inboxId,
    label: `${b.nombre}${b.telefono ? ` · ${b.telefono}` : ''}`,
  }))
);
const opcionesAsesor = computed(() =>
  (opciones.value?.asesores || []).map(a => ({
    value: a.chatwootAgentId,
    label: a.nombre,
  }))
);
const opcionesEtapa = computed(() =>
  (opciones.value?.etapas || []).map(e => ({ value: e.id, label: e.nombre }))
);
const opcionesNegocio = computed(() =>
  (analisis.value?.remitentes || []).map(r => ({
    value: r.nombre,
    label: `${r.nombre} (${r.cuantos} ${r.cuantos === 1 ? 'mensaje' : 'mensajes'})`,
  }))
);

const telefonoNormalizado = computed(() => telefonoE164(telefono.value));
const muestra = computed(() => {
  const m = analisis.value?.mensajes || [];
  return m.length > 4 ? [...m.slice(0, 3), m[m.length - 1]] : m;
});
const puedeImportar = computed(
  () =>
    !!analisis.value &&
    !!negocio.value &&
    !!telefonoNormalizado.value &&
    !!bandeja.value &&
    !!asesor.value &&
    !!etapa.value &&
    !importando.value
);

const fechaCorta = f => {
  const [d, h] = String(f || '').split(' ');
  const [a, m, dia] = (d || '').split('-');
  return d ? `${dia}/${m}/${a} ${(h || '').slice(0, 5)}` : '';
};

async function sha256(texto) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(texto)
  );
  return [...new Uint8Array(bytes)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function limpiar() {
  analisis.value = null;
  huella.value = '';
  negocio.value = '';
  telefono.value = '';
  nombre.value = '';
  errorArchivo.value = '';
  hecho.value = null;
}

async function elegirArchivo(evento) {
  limpiar();
  const f = evento.target.files?.[0];
  archivo.value = f || null;
  if (!f) return;
  leyendo.value = true;
  try {
    const texto = /\.zip$/i.test(f.name)
      ? await textoDelZip(await f.arrayBuffer())
      : await f.text();
    const r = analizarChat(texto);
    if (!r.mensajes.length) {
      throw new Error(
        'No parece un chat exportado de WhatsApp: no se encontró ningún mensaje.'
      );
    }
    analisis.value = r;
    huella.value = await sha256(texto);
    const contacto = contactoDelArchivo(f.name);
    negocio.value =
      negocioProbable(r.remitentes, contacto) ||
      (r.remitentes.length === 2 ? r.remitentes[1].nombre : '');
    const cliente = r.remitentes.find(x => x.nombre !== negocio.value);
    nombre.value = contacto || cliente?.nombre || '';
    const tel = telefonoE164(cliente?.nombre) || telefonoE164(contacto);
    if (tel) telefono.value = tel;
  } catch (e) {
    errorArchivo.value = e.message;
  } finally {
    leyendo.value = false;
  }
}

watch(negocio, nuevo => {
  // Si cambia quien es la inmobiliaria, el nombre del cliente es el otro.
  const cliente = (analisis.value?.remitentes || []).find(
    x => x.nombre !== nuevo
  );
  if (cliente && !contactoDelArchivo(archivo.value?.name)) {
    nombre.value = cliente.nombre;
  }
});

async function importar() {
  if (!puedeImportar.value) return;
  importando.value = true;
  try {
    const { data: cw } = await axios.post(
      `/api/v1/accounts/${cuenta.value}/turuta_importaciones`,
      {
        inbox_id: bandeja.value,
        telefono: telefonoNormalizado.value,
        nombre: nombre.value.trim(),
        assignee_id: asesor.value,
        zona: opciones.value?.zona,
        huella: huella.value,
        mensajes: mensajesParaImportar(analisis.value.mensajes, negocio.value),
      }
    );
    const lead = await pedir('/dashboard-app/importaciones', {
      method: 'POST',
      body: JSON.stringify({
        accountId: cuenta.value,
        conversationId: cw.conversation_id,
        contactId: cw.contact_id,
        inboxId: bandeja.value,
        telefono: telefonoNormalizado.value,
        nombre: nombre.value.trim(),
        chatwootAgentId: asesor.value,
        stageId: etapa.value,
        ultimaEntrada: cw.ultima_entrada,
        updatedBy: currentUser.value?.name || '',
      }),
    });
    hecho.value = {
      mensajes: cw.mensajes,
      duplicado: cw.duplicado,
      nuevo: lead.nuevo,
      etapa: lead.etapa,
      asesor: lead.asesor,
      enlace: frontendURL(
        `accounts/${cuenta.value}/conversations/${cw.display_id}`
      ),
    };
  } catch (e) {
    const msg = e?.response?.data?.message || e.message;
    useAlert(`No se pudo importar: ${msg}`);
  } finally {
    importando.value = false;
  }
}

function otro() {
  limpiar();
  archivo.value = null;
}

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    class="w-full px-6 overflow-auto bg-n-surface-1"
    data-turuta="importar-chat"
  >
    <div class="max-w-3xl pb-24 mx-auto">
      <ReportHeader
        header-title="Importar un chat"
        header-description="El historial de un chat exportado de WhatsApp, para tenerlo en el CRM con su lead."
      />

      <p v-if="errorOpciones" class="text-sm text-n-ruby-11">
        {{ errorOpciones }}
      </p>

      <section v-if="hecho" class="flex flex-col gap-4" :class="TARJETA">
        <div
          class="flex gap-3 px-4 py-3 text-sm rounded-lg bg-n-teal-2 text-n-teal-11"
        >
          <Icon icon="i-lucide-circle-check" class="flex-none mt-0.5 size-4" />
          <div>
            <p class="mb-1 font-medium">
              {{
                hecho.duplicado
                  ? 'Este chat ya estaba importado: no se ha duplicado nada.'
                  : `Importado: ${hecho.mensajes} mensajes.`
              }}
            </p>
            <p class="mb-0">
              {{
                hecho.nuevo
                  ? `Lead nuevo en ${hecho.etapa}, con ${hecho.asesor}.`
                  : `Ya era lead (${hecho.etapa}, con ${hecho.asesor || 'nadie'}): el chat se suma a su historial.`
              }}
              Cuando vuelva a escribir, su chat irá a ese asesor.
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-3">
          <router-link :to="hecho.enlace" class="no-underline">
            <Button label="Ver el chat" icon="i-lucide-message-circle" />
          </router-link>
          <Button
            label="Importar otro"
            icon="i-lucide-upload"
            variant="faded"
            color="slate"
            @click="otro"
          />
        </div>
      </section>

      <section v-else class="flex flex-col gap-5" :class="TARJETA">
        <div class="flex gap-3 px-4 py-3 text-sm rounded-lg bg-n-alpha-1">
          <Icon icon="i-lucide-info" class="flex-none mt-0.5 size-4" />
          <div class="text-n-slate-11">
            <p class="mb-1 font-medium text-n-slate-12">Cómo se exporta</p>
            <p class="mb-0">
              En el celular, dentro del chat: ⋮ → Más → Exportar chat → Sin
              archivos. Sale un .txt (Android) o un .zip (iPhone): súbelo tal
              cual. Los mensajes quedan con su fecha, no se envía nada al
              cliente, y el chat queda resuelto en el historial.
            </p>
          </div>
        </div>

        <label class="flex flex-col gap-1 mb-0">
          <span class="text-heading-3 text-n-slate-12">Chat exportado</span>
          <input
            type="file"
            accept=".txt,.zip,text/plain,application/zip"
            class="text-sm text-n-slate-11"
            @change="elegirArchivo"
          />
        </label>
        <p v-if="leyendo" class="mb-0 text-sm text-n-slate-10">Leyendo…</p>
        <p v-if="errorArchivo" class="mb-0 text-sm text-n-ruby-11">
          {{ errorArchivo }}
        </p>

        <template v-if="analisis">
          <div class="p-4 rounded-lg bg-n-alpha-1">
            <p class="mb-2 text-sm font-medium text-n-slate-12">
              {{ analisis.mensajes.length }} mensajes, del
              {{ fechaCorta(analisis.desde) }} al
              {{ fechaCorta(analisis.hasta) }}
            </p>
            <ul class="flex flex-col gap-1 mb-0 text-sm text-n-slate-11">
              <li v-for="(m, i) in muestra" :key="i" class="truncate">
                <span class="text-n-slate-10">{{ fechaCorta(m.fecha) }}</span>
                <span
                  class="font-medium"
                  :class="m.remitente === negocio ? 'text-n-blue-11' : ''"
                >
                  {{ m.remitente }}:
                </span>
                {{ m.texto }}
              </li>
            </ul>
            <p
              v-if="analisis.sinEntender"
              class="mt-2 mb-0 text-xs text-n-amber-11"
            >
              {{ analisis.sinEntender }} líneas con una fecha que no se
              entendió: no se importan.
            </p>
          </div>

          <CampoSelect
            v-model="negocio"
            label="¿Quién es la inmobiliaria?"
            ayuda="Sus mensajes salen como enviados por el asesor; los del otro, como del cliente."
            :options="opcionesNegocio"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <Input
              v-model="telefono"
              label="Teléfono del cliente"
              placeholder="+51 966 723 347"
              :message="
                telefonoNormalizado
                  ? `Se guarda como ${telefonoNormalizado}`
                  : 'Con el código de país. Si no sale en el chat, búscalo en el contacto del celular.'
              "
            />
            <Input v-model="nombre" label="Nombre del cliente" />
          </div>
          <CampoSelect
            v-model="bandeja"
            label="Número de WhatsApp de la inmobiliaria"
            ayuda="El número desde el que se habló con este cliente."
            :options="opcionesBandeja"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <CampoSelect
              v-model="asesor"
              label="Asesor"
              ayuda="Se queda con el lead: si el cliente vuelve a escribir, le llega a él."
              :options="opcionesAsesor"
            />
            <CampoSelect
              v-model="etapa"
              label="Etapa"
              ayuda="Si ya era lead, se queda en la suya."
              :options="opcionesEtapa"
            />
          </div>

          <div>
            <Button
              label="Importar"
              icon="i-lucide-upload"
              :is-loading="importando"
              :disabled="!puedeImportar"
              @click="importar"
            />
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
