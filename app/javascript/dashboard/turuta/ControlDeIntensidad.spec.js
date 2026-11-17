import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ControlDeIntensidad from './ControlDeIntensidad.vue';

const BotonFalso = {
  props: ['label'],
  emits: ['click'],
  template:
    '<button class="boton" @click="$emit(\'click\')">{{ label }}</button>',
};

const montar = props =>
  mount(ControlDeIntensidad, {
    props: { id: 'prueba', ...props },
    global: { stubs: { Button: BotonFalso } },
  });

const ultimo = w => w.emitted('update:modelValue').at(-1)[0];

describe('ControlDeIntensidad', () => {
  it('sin elegir, enseña la de por defecto', () => {
    const w = montar({ modelValue: null });
    expect(w.text()).toContain('100 %');
    expect(w.text()).toContain('· por defecto');
    expect(w.find('.boton').exists()).toBe(false);
  });

  it('mover la barra elige esa intensidad', async () => {
    const w = montar({ modelValue: null });
    await w.find('input[type="range"]').setValue('1.5');
    expect(ultimo(w)).toBe(1.5);
  });

  it('volver al valor de por defecto es no elegir ninguna', async () => {
    const w = montar({ modelValue: 1.5 });
    await w.find('input[type="range"]').setValue('1');
    expect(ultimo(w)).toBeNull();
  });

  it('el boton vuelve a la de por defecto', async () => {
    const w = montar({ modelValue: 0.5 });
    expect(w.text()).toContain('50 %');
    await w.find('.boton').trigger('click');
    expect(ultimo(w)).toBeNull();
  });

  it('en el perfil, sin elegir, vale la del equipo', () => {
    const w = montar({
      modelValue: null,
      porDefecto: 1.5,
      etiquetaPorDefecto: 'la del equipo',
    });
    expect(w.text()).toContain('150 %');
    expect(w.text()).toContain('la del equipo');
  });

  it('al final de la barra el valor dice Sólido', () => {
    // «Sólido» ya esta siempre en el extremo de la barra: se cuenta el del valor.
    const veces = w => (w.text().match(/Sólido/g) || []).length;
    expect(veces(montar({ modelValue: 2 }))).toBe(2);
    expect(veces(montar({ modelValue: 1.75 }))).toBe(1);
    expect(montar({ modelValue: 1.75 }).text()).toContain('175 %');
  });
});
