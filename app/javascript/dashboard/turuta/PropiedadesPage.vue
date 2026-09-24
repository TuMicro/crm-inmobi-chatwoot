<script setup>
// [turuta] Pagina "Propiedades": lo que la IA manda y sabe de cada propiedad.
// La lista sale de las webs del cliente (nuestra API la lee de Supabase) y por
// cada una el equipo guarda la ficha de WhatsApp, el video, la ubicacion, el
// horario de visitas, si esta vendida, si el precio se negocia, las
// condiciones y los datos que la IA confirmo con el equipo.
//
// Misma envoltura que la pagina Embudo: cabecera de informe y tarjetas con los
// tokens de color de Chatwoot, para que el tema oscuro salga solo. Los
// calculos viven en propiedades.js.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import ReportHeader from 'dashboard/routes/dashboard/settings/reports/components/ReportHeader.vue';
import { leadAppConfig, textoError } from './leadApp';
import {
  ESTADOS,
  NEGOCIABLES,
  avisoDelVideo,
  cuerpoDe,
  filtrar,
  formularioDe,
  hayCambios,
  ordenar,
  origen,
  pendientes,
  precioTexto,
  resumen,
  subtitulo,
} from './propiedades';

const route = useRoute();
const store = useStore();
const apps = useMapGetter('dashboardApps/getRecords');
const currentUser = useMapGetter('getCurrentUser');
const config = computed(() => leadAppConfig(apps.value));

const datos = ref(null);
const cargando = ref(false);
const error = ref(null);
const guardando = ref(false);

const busqueda = ref('');
const web = ref('');
const estado = ref('');
const elegidaId = ref(null);
const form = ref(null);

async function pedir(path, init = {}) {
  const cfg = config.value;
  if (!cfg) throw new Error('config');
  const r = await fetch(cfg.api + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (r.status === 401) throw new Error('auth');
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.message || 'network');
  return cuerpo;
}

const propiedades = computed(() => datos.value?.propiedades || []);
const sitios = computed(() => datos.value?.sitios || []);
const cifras = computed(() => resumen(propiedades.value));
const lista = computed(() =>
  ordenar(
    filtrar(propiedades.value, {
      texto: busqueda.value,
      site: web.value,
      estado: estado.value,
    })
  )
);
const elegida = computed(
  () => propiedades.value.find(p => p.id === elegidaId.value) || null
);
const sinGuardar = computed(() => hayCambios(form.value, elegida.value));
const avisoVideo = computed(() => avisoDelVideo(form.value?.videoUrl));

function abrir(p) {
  if (!p) return;
  elegidaId.value = p.id;
  form.value = formularioDe(p);
}

async function cargar() {
  if (!config.value) {
    error.value = 'config';
    return;
  }
  cargando.value = true;
  error.value = null;
  try {
    datos.value = await pedir(
      `/dashboard-app/properties?accountId=${route.params.accountId}`
    );
    // La propiedad abierta se mantiene, con lo recien guardado; si ya no esta
    // en la lista (se despublico en la web), se cierra.
    const sigue = propiedades.value.find(p => p.id === elegidaId.value);
    if (elegidaId.value && !sigue) {
      elegidaId.value = null;
      form.value = null;
    } else if (sigue) {
      abrir(sigue);
    }
  } catch (e) {
    error.value = ['auth', 'config'].includes(e.message)
      ? e.message
      : 'network';
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  if (!(apps.value || []).length) store.dispatch('dashboardApps/get');
  cargar();
});

watch(config, (cfg, prev) => {
  if (cfg && !prev) cargar();
});

function cerrar() {
  elegidaId.value = null;
  form.value = null;
}

function anadirDato() {
  form.value.datos.push({ clave: '', valor: '' });
}

function quitarDato(i) {
  form.value.datos.splice(i, 1);
}

async function guardar() {
  if (!elegida.value || guardando.value) return;
  guardando.value = true;
  try {
    await pedir('/dashboard-app/properties/playbook', {
      method: 'PUT',
      body: JSON.stringify(
        cuerpoDe(
          form.value,
          elegida.value,
          route.params.accountId,
          currentUser.value?.name
        )
      ),
    });
    await cargar();
    useAlert('Guardado. La IA lo usa desde el próximo mensaje.');
  } catch (e) {
    useAlert(
      e.message === 'auth'
        ? 'No se pudo autenticar contra el CRM'
        : `No se pudo guardar: ${e.message}`
    );
  } finally {
    guardando.value = false;
  }
}

const COLOR_ESTADO = {
  disponible: 'bg-n-teal-3 text-n-teal-11',
  reservado: 'bg-n-amber-3 text-n-amber-11',
  vendido: 'bg-n-slate-3 text-n-slate-11',
};

const TARJETA =
  'px-6 py-5 rounded-xl shadow outline outline-1 outline-n-container bg-n-solid-2';
const CAMPO =
  'block w-full px-3 py-2 mt-1 text-sm rounded-lg border border-n-weak bg-n-alpha-black2 text-n-slate-12 outline-none hover:border-n-slate-6 focus:border-n-strong';
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en español a propósito: la página es nuestra y no pasa por el i18n de Chatwoot -->
  <div
    class="w-full px-6 overflow-auto bg-n-surface-1"
    data-turuta="propiedades"
  >
    <div class="max-w-6xl pb-24 mx-auto">
      <ReportHeader
        header-title="Propiedades"
        header-description="Lo que la IA manda y sabe de cada propiedad. La lista sale de las webs; aquí se guarda la ficha de WhatsApp, el video, el horario de visitas y lo demás."
      >
        <Button
          label="Actualizar"
          icon="i-lucide-refresh-cw"
          variant="faded"
          color="slate"
          size="sm"
          :is-loading="cargando"
          @click="cargar"
        />
      </ReportHeader>

      <p v-if="error" class="text-sm text-n-slate-11" :class="TARJETA">
        {{ textoError(error) }}
      </p>
      <p v-else-if="!datos" class="text-sm text-n-slate-11" :class="TARJETA">
        Cargando...
      </p>
      <p
        v-else-if="!datos.configurado"
        class="text-sm text-n-slate-11"
        :class="TARJETA"
      >
        El inventario no está conectado: faltan las claves de las webs en el
        servidor. Sin ellas la IA no ofrece propiedades.
      </p>
      <p
        v-else-if="!propiedades.length"
        class="text-sm text-n-slate-11"
        :class="TARJETA"
      >
        No hay propiedades publicadas en las webs del cliente
        <span v-if="sitios.length">({{ sitios.join(' y ') }})</span>.
      </p>

      <div v-else class="flex flex-col gap-4">
        <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article
            v-for="t in [
              {
                id: 'total',
                titulo: 'Propiedades',
                valor: cifras.total,
                nota: `${cifras.disponibles} disponibles`,
                icono: 'i-lucide-building-2',
                color: 'text-n-blue-11 bg-n-blue-3',
              },
              {
                id: 'ficha',
                titulo: 'Con ficha propia',
                valor: cifras.conFichaPropia,
                nota: 'el resto usa la generada',
                icono: 'i-lucide-file-text',
                color: 'text-n-teal-11 bg-n-teal-3',
              },
              {
                id: 'video',
                titulo: 'Con video',
                valor: cifras.conVideo,
                nota: 'se manda tras la ficha',
                icono: 'i-lucide-video',
                color: 'text-n-amber-11 bg-n-amber-3',
              },
              {
                id: 'vendidas',
                titulo: 'Vendidas o reservadas',
                valor: cifras.vendidas + cifras.reservadas,
                nota: 'la IA no las ofrece',
                icono: 'i-lucide-circle-slash',
                color: 'text-n-slate-11 bg-n-slate-3',
              },
            ]"
            :key="t.id"
            class="flex items-start gap-4"
            :class="TARJETA"
          >
            <span
              class="flex items-center justify-center flex-none rounded-lg size-10"
              :class="t.color"
            >
              <Icon :icon="t.icono" class="size-5" />
            </span>
            <div class="min-w-0">
              <p class="mb-1 text-sm text-n-slate-11">{{ t.titulo }}</p>
              <p
                class="mb-1 text-3xl font-medium leading-none tabular-nums text-n-slate-12"
              >
                {{ t.valor }}
              </p>
              <p class="mb-0 text-xs text-n-slate-10">{{ t.nota }}</p>
            </div>
          </article>
        </section>

        <div class="grid gap-4 lg:grid-cols-[22rem_1fr] items-start">
          <!-- Lista -->
          <section :class="TARJETA">
            <input
              v-model="busqueda"
              type="search"
              placeholder="Buscar por distrito, calle, código..."
              :class="CAMPO"
            />
            <div class="flex flex-wrap gap-1 mt-3">
              <button
                v-for="s in ['', ...sitios]"
                :key="s || 'todas'"
                type="button"
                class="px-2.5 py-1 text-xs rounded-md transition-colors"
                :class="
                  s === web
                    ? 'bg-n-brand text-white font-medium'
                    : 'bg-n-alpha-2 text-n-slate-11 hover:text-n-slate-12'
                "
                @click="web = s"
              >
                {{ s || 'Las dos webs' }}
              </button>
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
              <button
                v-for="e in ['', ...ESTADOS]"
                :key="e || 'cualquiera'"
                type="button"
                class="px-2.5 py-1 text-xs rounded-md transition-colors capitalize"
                :class="
                  e === estado
                    ? 'bg-n-alpha-3 text-n-slate-12 font-medium'
                    : 'text-n-slate-11 hover:text-n-slate-12'
                "
                @click="estado = e"
              >
                {{ e || 'Cualquier estado' }}
              </button>
            </div>

            <p class="mt-4 mb-2 text-xs text-n-slate-10">
              {{ lista.length }} de {{ cifras.total }}
            </p>
            <ul
              class="flex flex-col gap-1 mb-0 list-none max-h-[34rem] overflow-y-auto ltr:ml-0 rtl:mr-0"
            >
              <li v-for="p in lista" :key="p.id">
                <button
                  type="button"
                  class="w-full px-2 py-2 text-left rounded-lg transition-colors"
                  :class="
                    p.id === elegidaId ? 'bg-n-alpha-2' : 'hover:bg-n-alpha-1'
                  "
                  @click="abrir(p)"
                >
                  <div class="flex items-start gap-2">
                    <img
                      v-if="p.portada"
                      :src="p.portada"
                      alt=""
                      class="flex-none object-cover rounded-md size-10 bg-n-alpha-2"
                    />
                    <span
                      v-else
                      class="flex items-center justify-center flex-none rounded-md size-10 bg-n-alpha-2"
                    >
                      <Icon
                        icon="i-lucide-building-2"
                        class="size-4 text-n-slate-10"
                      />
                    </span>
                    <span class="min-w-0 grow">
                      <span
                        class="block text-sm truncate text-n-slate-12"
                        :title="p.titulo"
                      >
                        {{ p.titulo }}
                      </span>
                      <span class="block text-xs truncate text-n-slate-10">
                        {{ subtitulo(p) }}
                      </span>
                      <span class="block mt-1 text-xs text-n-slate-11">
                        {{ precioTexto(p) }}
                      </span>
                    </span>
                    <span
                      class="flex-none px-1.5 py-0.5 text-[10px] rounded capitalize"
                      :class="COLOR_ESTADO[p.disponibilidad]"
                    >
                      {{ p.disponibilidad }}
                    </span>
                  </div>
                  <div
                    v-if="pendientes(p).length"
                    class="flex flex-wrap gap-1 mt-1.5 ltr:pl-12 rtl:pr-12"
                  >
                    <span
                      v-for="falta in pendientes(p)"
                      :key="falta"
                      class="px-1.5 py-0.5 text-[10px] rounded bg-n-alpha-2 text-n-slate-10"
                    >
                      {{ falta }}
                    </span>
                  </div>
                </button>
              </li>
            </ul>
          </section>

          <!-- Editor -->
          <section v-if="!elegida" :class="TARJETA">
            <p class="mb-0 text-sm text-n-slate-11">
              Elige una propiedad de la lista para ver y editar lo que la IA
              manda de ella.
            </p>
          </section>

          <section v-else :class="TARJETA">
            <header class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="mb-1 text-lg font-medium truncate text-n-slate-12">
                  {{ elegida.titulo }}
                </h2>
                <p class="mb-0 text-sm text-n-slate-11">
                  {{ subtitulo(elegida) }} · {{ precioTexto(elegida) }}
                </p>
                <p class="mb-0 text-xs text-n-slate-10">
                  {{ origen(elegida) }}
                </p>
              </div>
              <Button
                label="Cerrar"
                icon="i-lucide-x"
                variant="ghost"
                color="slate"
                size="sm"
                @click="cerrar"
              />
            </header>

            <p
              v-if="elegida.fichaActualizadaPor"
              class="mt-2 mb-0 text-xs text-n-slate-10"
            >
              Lo último lo guardó {{ elegida.fichaActualizadaPor }}.
            </p>

            <div class="grid gap-4 mt-5 md:grid-cols-2">
              <label class="block text-xs font-medium text-n-slate-11">
                Estado
                <select v-model="form.availability" :class="CAMPO">
                  <option v-for="e in ESTADOS" :key="e" :value="e">
                    {{ e }}
                  </option>
                </select>
                <span class="block mt-1 font-normal text-n-slate-10">
                  Vendida o reservada: la IA lo dice y ofrece parecidas.
                </span>
              </label>

              <label class="block text-xs font-medium text-n-slate-11">
                ¿El precio se negocia?
                <select v-model="form.negotiable" :class="CAMPO">
                  <option
                    v-for="n in NEGOCIABLES"
                    :key="n.valor"
                    :value="n.valor"
                  >
                    {{ n.texto }}
                  </option>
                </select>
                <span class="block mt-1 font-normal text-n-slate-10">
                  La IA nunca negocia: solo responde esto.
                </span>
              </label>

              <label class="block text-xs font-medium text-n-slate-11">
                Video para WhatsApp
                <input
                  v-model="form.videoUrl"
                  type="url"
                  placeholder="https://.../video.mp4"
                  :class="CAMPO"
                />
                <span
                  class="block mt-1 font-normal"
                  :class="avisoVideo ? 'text-n-amber-11' : 'text-n-slate-10'"
                >
                  {{
                    avisoVideo ||
                    'Se manda justo después de la ficha. Enlace directo a un .mp4.'
                  }}
                </span>
              </label>

              <label class="block text-xs font-medium text-n-slate-11">
                Ubicación
                <input
                  v-model="form.mapsUrl"
                  type="url"
                  placeholder="https://maps.google.com/..."
                  :class="CAMPO"
                />
                <span class="block mt-1 font-normal text-n-slate-10">
                  Si se deja vacío, se arma con las coordenadas de la web.
                </span>
              </label>

              <label class="block text-xs font-medium text-n-slate-11">
                Horario de visitas
                <input
                  v-model="form.visitHours"
                  type="text"
                  placeholder="Lunes a sábado de 11:30 a 13:30"
                  :class="CAMPO"
                />
                <span class="block mt-1 font-normal text-n-slate-10">
                  La IA lo dice, pero nunca agenda: la visita la cierra un
                  asesor.
                </span>
              </label>

              <label class="block text-xs font-medium text-n-slate-11">
                Condiciones
                <input
                  v-model="form.conditions"
                  type="text"
                  placeholder="Solo al contado. No tiene cochera."
                  :class="CAMPO"
                />
                <span class="block mt-1 font-normal text-n-slate-10">
                  Se dicen tal cual están escritas aquí.
                </span>
              </label>
            </div>

            <label class="block mt-4 text-xs font-medium text-n-slate-11">
              Ficha de WhatsApp
              <textarea
                v-model="form.ficha"
                rows="12"
                :placeholder="elegida.ficha"
                :class="CAMPO"
                class="font-mono leading-relaxed"
              />
              <span class="block mt-1 font-normal text-n-slate-10">
                <template v-if="elegida.fichaPorDefecto">
                  Ahora se manda la ficha generada desde la web, la que se ve de
                  fondo. Escribe aquí para mandar la tuya.
                </template>
                <template v-else>
                  Se manda esta. Bórrala entera para volver a la generada desde
                  la web.
                </template>
              </span>
            </label>

            <label class="block mt-4 text-xs font-medium text-n-slate-11">
              Notas para la IA
              <textarea
                v-model="form.notes"
                rows="3"
                placeholder="Lo que conviene que sepa al hablar de esta propiedad."
                :class="CAMPO"
              />
              <span class="block mt-1 font-normal text-n-slate-10">
                El lead no las ve: la IA las usa para responder.
              </span>
            </label>

            <div class="mt-4">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-xs font-medium text-n-slate-11">
                  Datos confirmados
                </span>
                <button
                  type="button"
                  class="text-xs text-n-blue-11 hover:underline"
                  @click="anadirDato"
                >
                  Añadir dato
                </button>
              </div>
              <p class="mt-1 mb-2 text-xs text-n-slate-10">
                Lo que el equipo le confirmó a la IA en un chat (piso,
                mantenimiento, qué se queda). Vale para cualquier lead que
                pregunte por esta propiedad.
              </p>
              <div
                v-for="(d, i) in form.datos"
                :key="i"
                class="flex items-center gap-2 mt-2"
              >
                <input
                  v-model="d.clave"
                  type="text"
                  placeholder="piso"
                  class="w-40"
                  :class="CAMPO"
                />
                <input
                  v-model="d.valor"
                  type="text"
                  placeholder="7"
                  class="grow"
                  :class="CAMPO"
                />
                <button
                  type="button"
                  class="flex-none p-2 rounded-md text-n-slate-10 hover:text-n-ruby-11 hover:bg-n-alpha-2"
                  @click="quitarDato(i)"
                >
                  <Icon icon="i-lucide-trash-2" class="size-4" />
                </button>
              </div>
              <p
                v-if="!form.datos.length"
                class="mt-2 mb-0 text-xs text-n-slate-10"
              >
                Todavía no hay ninguno.
              </p>
            </div>

            <div class="flex items-center justify-end gap-3 mt-6">
              <span v-if="sinGuardar" class="text-xs text-n-amber-11">
                Hay cambios sin guardar
              </span>
              <Button
                label="Guardar"
                variant="solid"
                color="blue"
                size="sm"
                :disabled="!sinGuardar || guardando"
                :is-loading="guardando"
                @click="guardar"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
