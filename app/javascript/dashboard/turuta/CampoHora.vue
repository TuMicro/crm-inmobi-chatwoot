<script setup>
// [turuta] El campo de hora de la visita, con desplegable propio (17/11). El
// de <input type="time"> es del navegador y no se deja gobernar: vacio abria
// en el minuto actual, y habia que pulsar fuera para cerrarlo.
//
// Este abre con los minutos en 00, y se cierra solo al pulsar a. m. o p. m.,
// que es lo ultimo que se elige. El valor es el mismo "HH:mm" de antes.
//
// Tres bloques con su titulo (hora, minutos, a. m. / p. m.): sin separarlos,
// las dos rejillas de numeros se confundian. Los minutos, :00 o :30, y un
// campo para escribir cualquier otro.
import { computed, ref, watch } from 'vue';
import { onClickOutside } from '@vueuse/core';
import {
  HORAS,
  MINUTOS,
  dosDigitos,
  esPmPorDefecto,
  horaDesdePartes,
  minutoValido,
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

// Los minutos escritos a mano. Una hora que llega con un minuto que no es de
// los botones (10:37) lo trae escrito.
const escrito = ref('');
watch(
  () => partes.value?.minuto,
  m => {
    if (m === undefined || MINUTOS.includes(m)) return;
    if (minutoValido(escrito.value) !== m) escrito.value = String(m);
  },
  { immediate: true }
);
const errorMinuto = computed(
  () => escrito.value !== '' && minutoValido(escrito.value) === null
);

function elegirHora(hora) {
  adivinado.value = adivinado.value || pm.value === null;
  modelo.value = horaDesdePartes({
    hora,
    minuto: minuto.value,
    pm: adivinado.value ? esPmPorDefecto(hora) : pm.value,
  });
}

function ponerMinuto(valor) {
  minutoSuelto.value = valor;
  if (partes.value) {
    modelo.value = horaDesdePartes({ ...partes.value, minuto: valor });
  }
}

function elegirMinuto(valor) {
  escrito.value = '';
  ponerMinuto(valor);
}

// Lo que no es un minuto (60, letras) se dice y no cambia la hora.
function escribirMinuto(texto) {
  escrito.value = texto.trim();
  const valor = minutoValido(escrito.value);
  if (valor !== null) ponerMinuto(valor);
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

// El campo de "otro": en rojo si no vale, y marcado si es el minuto puesto.
const claseEscrito = computed(() => {
  if (errorMinuto.value) return 'border-n-ruby-9';
  return escrito.value !== ''
    ? 'border-n-brand'
    : 'border-n-weak hover:border-n-slate-6 focus:border-n-strong';
});
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
      <div class="p-2 rounded-lg bg-n-alpha-1" data-turuta="hora-bloque-hora">
        <div class="font-semibold text-n-slate-12">Hora</div>
        <div class="grid grid-cols-6 gap-1 mt-1.5">
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
      </div>
      <div
        class="p-2 mt-2 rounded-lg bg-n-alpha-1"
        data-turuta="hora-bloque-minutos"
      >
        <div class="font-semibold text-n-slate-12">Minutos</div>
        <div class="grid items-center grid-cols-3 gap-1 mt-1.5">
          <button
            v-for="m in MINUTOS"
            :key="m"
            type="button"
            class="py-1 text-sm border rounded-md border-n-weak"
            :class="claseOpcion(minuto === m)"
            :data-turuta="`minuto-${m}`"
            @click="elegirMinuto(m)"
          >
            :{{ dosDigitos(m) }}
          </button>
          <input
            :value="escrito"
            type="text"
            inputmode="numeric"
            maxlength="2"
            autocomplete="off"
            placeholder="Otro"
            aria-label="Otros minutos"
            class="block w-full h-[30px] px-2 !mb-0 text-sm font-normal text-center rounded-md border bg-n-alpha-black2 text-n-slate-12 outline-none"
            :class="claseEscrito"
            data-turuta="minuto-otro"
            @input="escribirMinuto($event.target.value)"
          />
        </div>
        <div
          v-if="errorMinuto"
          class="mt-1 text-n-ruby-11"
          data-turuta="minuto-error"
        >
          Los minutos van de 0 a 59.
        </div>
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
