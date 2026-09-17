<script setup>
/* global axios */
// [turuta] Notas del contacto en el panel de conversacion. Como las de
// Chatwoot, pero se pueden EDITAR y todo esta en espanol: la suya deja textos
// en ingles y la fecha relativa sin traducir. La sustituye con una sola linea
// cambiada en ContactPanel.vue (el import).
//
// Crear y borrar van por el store de Chatwoot. Editar va directo a su API, que
// lo admite (PATCH .../notes/:id) aunque su interfaz no lo ofrezca.
import { computed, ref, watch } from 'vue';
import { formatDistanceToNow, fromUnixTime } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAlert } from 'dashboard/composables';
import { useMessageFormatter } from 'shared/composables/useMessageFormatter';
import Editor from 'dashboard/components-next/Editor/Editor.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';

const props = defineProps({
  contactId: { type: [String, Number], required: true },
});

const store = useStore();
const { accountId } = useAccount();
const { formatMessage } = useMessageFormatter();
const currentUser = useMapGetter('getCurrentUser');
const uiFlags = useMapGetter('contactNotes/getUIFlags');
const notesByContact = useMapGetter('contactNotes/getAllNotesByContactId');

const cargando = computed(() => uiFlags.value.isFetching);
const notas = computed(() =>
  props.contactId ? notesByContact.value(props.contactId) || [] : []
);

const modal = ref(false);
const editando = ref(null); // la nota que se edita, o null si es nueva
const texto = ref('');
const guardando = ref(false);

const quien = nota => {
  if (nota?.user?.id === currentUser.value?.id) return 'Tu';
  return nota?.user?.name || 'Bot';
};

const hace = nota =>
  nota?.createdAt
    ? formatDistanceToNow(fromUnixTime(nota.createdAt), {
        addSuffix: true,
        locale: es,
      })
    : '';

function abrir(nota = null) {
  if (!props.contactId) return;
  editando.value = nota;
  texto.value = nota ? nota.content || '' : '';
  modal.value = true;
}

function cerrar() {
  modal.value = false;
  editando.value = null;
  texto.value = '';
}

async function guardar() {
  if (!props.contactId || !texto.value.trim() || guardando.value) return;
  guardando.value = true;
  try {
    if (editando.value) {
      await axios.patch(
        `/api/v1/accounts/${accountId.value}/contacts/${props.contactId}/notes/${editando.value.id}`,
        { note: { content: texto.value } }
      );
      await store.dispatch('contactNotes/get', { contactId: props.contactId });
    } else {
      await store.dispatch('contactNotes/create', {
        content: texto.value,
        contactId: props.contactId,
      });
    }
    cerrar();
  } catch (e) {
    useAlert('No se pudo guardar la nota');
  } finally {
    guardando.value = false;
  }
}

function borrar(nota) {
  if (!props.contactId || !nota?.id) return;
  store.dispatch('contactNotes/delete', {
    noteId: nota.id,
    contactId: props.contactId,
  });
}

watch(
  () => props.contactId,
  id => {
    cerrar();
    if (id) store.dispatch('contactNotes/get', { contactId: id });
  },
  { immediate: true }
);
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
  <!-- [turuta] Textos en espanol a proposito: esta pieza es nuestra y no pasa por el i18n de Chatwoot -->
  <div data-turuta="contact-notes">
    <div class="px-4 pt-3 pb-2">
      <Button
        label="Anadir nota"
        icon="i-lucide-plus"
        variant="ghost"
        color="blue"
        size="xs"
        :disabled="!contactId || cargando"
        @click="abrir()"
      />
    </div>

    <div
      v-if="cargando"
      class="flex items-center justify-center py-8 text-n-slate-11"
    >
      <Spinner />
    </div>

    <ul
      v-else-if="notas.length"
      class="flex flex-col m-0 overflow-y-auto list-none max-h-[300px]"
    >
      <li
        v-for="nota in notas"
        :key="nota.id"
        class="px-4 py-3 border-b border-n-weak last:border-b-0 group/nota"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="min-w-0 text-xs truncate text-n-slate-11">
            <span class="font-medium text-n-slate-12">{{ quien(nota) }}</span>
            · {{ hace(nota) }}
          </span>
          <span
            class="flex flex-shrink-0 gap-1 transition-opacity opacity-0 group-hover/nota:opacity-100"
          >
            <Button
              icon="i-lucide-pencil"
              variant="faded"
              color="slate"
              size="xs"
              @click="abrir(nota)"
            />
            <Button
              icon="i-lucide-trash"
              variant="faded"
              color="ruby"
              size="xs"
              @click="borrar(nota)"
            />
          </span>
        </div>
        <p
          v-dompurify-html="formatMessage(nota.content || '')"
          class="mt-1 mb-0 prose-sm prose-p:text-sm prose-p:leading-relaxed prose-p:mb-1 prose-p:mt-0 prose-ul:mb-1 prose-ul:mt-0 text-n-slate-12"
        />
      </li>
    </ul>

    <p v-else class="px-6 py-6 text-sm leading-6 text-center text-n-slate-11">
      Todavia no hay notas de este contacto.
    </p>

    <woot-modal
      v-model:show="modal"
      :on-close="cerrar"
      :close-on-backdrop-click="false"
      class="!items-start [&>div]:!top-12 [&>div]:sticky"
    >
      <div class="flex flex-col w-full gap-6 px-6 py-6">
        <h3 class="text-lg font-semibold text-n-slate-12">
          {{ editando ? 'Editar nota' : 'Anadir nota' }}
        </h3>
        <Editor
          v-model="texto"
          focus-on-mount
          placeholder="Escribe la nota"
          class="[&>div]:!border-transparent [&>div]:px-4 [&>div]:py-4"
        />
        <div class="flex items-center justify-end gap-3">
          <Button
            label="Cancelar"
            variant="ghost"
            color="slate"
            @click="cerrar"
          />
          <Button
            label="Guardar nota"
            variant="solid"
            color="blue"
            :is-loading="guardando"
            :disabled="!texto.trim() || guardando"
            @click="guardar"
          />
        </div>
      </div>
    </woot-modal>
  </div>
</template>
