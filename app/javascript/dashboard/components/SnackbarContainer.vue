<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import WootSnackbar from './Snackbar.vue';
import { emitter } from 'shared/helpers/mitt';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  duration: {
    type: Number,
    default: 2500,
  },
});

const { t } = useI18n();

const snackMessages = ref([]);
const snackbarContainer = ref(null);

const showPopover = () => {
  try {
    const el = snackbarContainer.value;
    if (el?.matches(':popover-open')) {
      el.hidePopover();
    }
    el?.showPopover();
  } catch (e) {
    // ignore
  }
};

// [turuta] Los avisos se quitan por su clave, no "el primero de la cola": con
// un aviso largo delante, el temporizador de uno corto se llevaba el largo.
// turutaCerrarToast cierra antes de tiempo un aviso que se abrio con clave
// (turuta/macroEnCurso.js).
const quitarToast = clave => {
  snackMessages.value = snackMessages.value.filter(m => m.key !== clave);
};

const onNewToastMessage = ({ message: originalMessage, action }) => {
  const message = action?.usei18n ? t(originalMessage) : originalMessage;
  const duration = action?.duration || props.duration;
  const clave = action?.turutaClave || Date.now();

  snackMessages.value.push({
    key: clave,
    message,
    action,
  });

  nextTick(showPopover);

  setTimeout(() => {
    quitarToast(clave);
  }, duration);
};

onMounted(() => {
  emitter.on('newToastMessage', onNewToastMessage);
  emitter.on('turutaCerrarToast', quitarToast);
});

onUnmounted(() => {
  emitter.off('newToastMessage', onNewToastMessage);
  emitter.off('turutaCerrarToast', quitarToast);
});
</script>

<template>
  <!-- [turuta] Avisos abajo, no arriba. -->
  <div
    ref="snackbarContainer"
    popover="manual"
    class="fixed top-auto bottom-6 left-1/2 -translate-x-1/2 max-w-[25rem] w-[calc(100%-2rem)] text-center bg-transparent border-0 p-0 m-0 outline-none overflow-visible"
  >
    <transition-group name="toast-fade" tag="div">
      <WootSnackbar
        v-for="snackMessage in snackMessages"
        :key="snackMessage.key"
        :message="snackMessage.message"
        :action="snackMessage.action"
      />
    </transition-group>
  </div>
</template>
