<script setup>
// [turuta] El campo de hora de la visita, con desplegable propio (17/11). El
// de <input type="time"> es del navegador y no se deja gobernar: vacio abria
// en el minuto actual, y habia que pulsar fuera para cerrarlo.
//
// Este abre con los minutos en 00, y se cierra solo al pulsar a. m. o p. m.,
// que es lo ultimo que se elige. El valor es el mismo "HH:mm" de antes.
import { computed, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import {
  HORAS,
  dosDigitos,
  esPmPorDefecto,
  horaDesdePartes,
  minutosConEl,
  partesDeHora,
  textoHora,
} from './hora';

const modelo = defineModel({ type: String, default: '' });

const raiz = ref(null);
const abierto = ref(false);
onClickOutside(raiz, () => {
  abierto.value = false;
});

const partes = computed(() => partesDeHora(modelo.value));

// Sin hora elegida todavia no hay valor que guardar: los minutos y el
// a. m. / p. m. que se pulsen antes esperan aqui.
const minutoSuelto = ref(0);
const pmSuelto = ref(null);
// El a. m. / p. m. lo pusimos nosotros (esPmPorDefecto), no quien elige: si
// cambia de hora, se vuelve a calcular.
const adivinado = ref(false);

const minuto = computed(() => partes.value?.minuto ?? minutoSuelto.value);
const pm = computed(() => (partes.value ? partes.value.pm : pmSuelto.value));
const minutos = computed(() => minutosConEl(minuto.value));

function elegirHora(hora) {
  adivinado.value = adivinado.value || pm.value === null;
  modelo.value = horaDesdePartes({
    hora,
    minuto: minuto.value,
    pm: adivinado.value ? esPmPorDefecto(hora) : pm.value,
  });
}

function elegirMinuto(valor) {
  minutoSuelto.value = valor;
  if (partes.value) {
    modelo.value = horaDesdePartes({ ...partes.value, minuto: valor });
  }
}

// Lo ultimo que se elige: con la hora ya puesta, se cierra.
function elegirPm(valor) {
  adivinado.value = false;
  pmSuelto.value = valor;
  if (!partes.value) return;
  modelo.value = horaDesdePartes({ ...partes.value, pm: valor });
  abierto.value = false;
}

const claseOpcion = elegida =>
  elegida
    ? 'bg-n-brand text-white font-medium'
    : 'text-n-slate-12 hover:bg-n-alpha-2';
</script>

<!-- Los comentarios de la plantilla van dentro del div raiz: fuera, en
     desarrollo cuentan como nodos y las pruebas ya no dan con el campo. -->
<template>
  <div ref="raiz" class="relative" @keydown.esc="abierto = false">
    <!-- eslint-disable vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
    <!-- [turuta] Textos en espanol a proposito, como el resto de la ficha -->
    <button
      type="button"
      class="flex items-center justify-between w-full gap-2 px-3 text-sm font-normal border rounded-lg outline-none h-9 border-n-weak bg-n-alpha-black2 hover:border-n-slate-6 focus:border-n-strong"
      :class="modelo ? 'text-n-slate-12' : 'text-n-slate-10'"
      :aria-expanded="abierto"
      data-turuta="hora-campo"
      @click="abierto = !abierto"
    >
      <span class="truncate">{{ textoHora(modelo) || 'Elegir hora' }}</span>
      <span class="flex-shrink-0 i-lucide-clock size-4 text-n-slate-10" />
    </button>
    <div
      v-if="abierto"
      class="absolute z-20 w-60 p-2 mt-1 text-xs font-normal border rounded-xl shadow-lg ltr:right-0 rtl:left-0 border-n-weak bg-n-solid-1"
      data-turuta="hora-panel"
    >
      <div class="text-n-slate-10">Hora</div>
      <div class="grid grid-cols-6 gap-1 mt-1">
        <button
          v-for="h in HORAS"
          :key="h"
          type="button"
          class="py-1 text-sm rounded-md"
          :class="claseOpcion(partes && partes.hora === h)"
          :data-turuta="`hora-${h}`"
          @click="elegirHora(h)"
        >
          {{ h }}
        </button>
      </div>
      <div class="mt-2 text-n-slate-10">Minutos</div>
      <div class="grid grid-cols-6 gap-1 mt-1">
        <button
          v-for="m in minutos"
          :key="m"
          type="button"
          class="py-1 text-sm rounded-md"
          :class="claseOpcion(minuto === m)"
          :data-turuta="`minuto-${m}`"
          @click="elegirMinuto(m)"
        >
          {{ dosDigitos(m) }}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-1 mt-2">
        <button
          v-for="opcion in [
            { pm: false, texto: 'a. m.' },
            { pm: true, texto: 'p. m.' },
          ]"
          :key="opcion.texto"
          type="button"
          class="py-1.5 text-sm rounded-md border border-n-weak"
          :class="claseOpcion(pm === opcion.pm)"
          :data-turuta="opcion.pm ? 'hora-pm' : 'hora-am'"
          @click="elegirPm(opcion.pm)"
        >
          {{ opcion.texto }}
        </button>
      </div>
    </div>
  </div>
</template>
