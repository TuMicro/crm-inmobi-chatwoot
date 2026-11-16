import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EditorDeColores from './EditorDeColores.vue';
import { NINGUNO } from './coloresDeEtapa';

const etapas = [
  { codigo: 'nurturing', nombre: 'En seguimiento', color: '#F2C230' },
  { codigo: 'cierre', nombre: 'Cierre', color: null },
];

const BotonFalso = {
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="boton" @click="$emit(\'click\')">{{ label }}</button>',
};

const montar = props =>
  mount(EditorDeColores, {
    props: { etapas, modelValue: {}, ...props },
    global: { stubs: { Button: BotonFalso, ColorPicker: true } },
  });

const fila = (w, i) => w.findAll('li')[i];
const ultimo = w => w.emitted('update:modelValue').at(-1)[0];

describe('EditorDeColores, colores del equipo', () => {
  it('una fila por etapa, con la muestra pintada si tiene color', () => {
    const w = montar({ modelValue: { nurturing: '#F2C230', cierre: null } });
    expect(w.findAll('li')).toHaveLength(2);
    expect(fila(w, 0).find('.turuta-tinte').exists()).toBe(true);
    expect(fila(w, 0).text()).toContain('Amarillo');
    expect(fila(w, 1).find('.turuta-tinte').exists()).toBe(false);
    expect(fila(w, 1).text()).toContain('Sin color');
  });

  it('elegir un color de la paleta lo pone en esa etapa', async () => {
    const w = montar({ modelValue: { nurturing: '#F2C230', cierre: null } });
    await fila(w, 1)
      .find('button[aria-label="Cierre: Verde intenso"]')
      .trigger('click');
    expect(ultimo(w)).toEqual({ nurturing: '#F2C230', cierre: '#16883F' });
  });

  it('"Sin color" lo deja en null', async () => {
    const w = montar({ modelValue: { nurturing: '#F2C230', cierre: null } });
    await fila(w, 0).find('.boton').trigger('click');
    expect(ultimo(w)).toEqual({ nurturing: null, cierre: null });
  });
});

describe('EditorDeColores, colores propios', () => {
  it('sin propios, cada etapa dice que va con el del equipo', () => {
    const w = montar({ personal: true });
    expect(fila(w, 0).text()).toContain('Amarillo, el del equipo');
    expect(fila(w, 1).text()).toContain('Sin color, como el equipo');
    expect(fila(w, 0).text()).not.toContain('Volver al del equipo');
  });

  it('"Sin color" se guarda como "ninguno", solo para esa persona', async () => {
    const w = montar({ personal: true });
    await fila(w, 0).find('.boton').trigger('click');
    expect(ultimo(w)).toEqual({ nurturing: NINGUNO });
  });

  it('un color propio se puede devolver al del equipo', async () => {
    const w = montar({ personal: true, modelValue: { nurturing: '#3B82F6' } });
    expect(fila(w, 0).text()).toContain('Azul, solo para ti');
    const volver = fila(w, 0)
      .findAll('.boton')
      .find(b => b.text() === 'Volver al del equipo');
    await volver.trigger('click');
    expect(ultimo(w)).toEqual({});
  });
});
