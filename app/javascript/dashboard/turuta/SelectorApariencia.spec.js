import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import SelectorApariencia from './SelectorApariencia.vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: clave => clave }) }));

// El dialogo de Chatwoot usa <dialog>.showModal(), que jsdom no tiene. Aqui solo
// importa lo que va DENTRO.
const cerrar = vi.fn();
const DialogFalso = defineComponent({
  props: { title: { type: String, default: '' } },
  setup(props, { slots, expose }) {
    expose({ open: vi.fn(), close: cerrar });
    return () =>
      h('section', { 'data-titulo': props.title }, slots.default?.());
  },
});

const montar = () =>
  mount(SelectorApariencia, {
    global: { stubs: { Dialog: DialogFalso } },
  });

describe('SelectorApariencia', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.classList.remove('dark');
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    cerrar.mockClear();
  });

  it('solo tiene las tres opciones: ni buscador ni fila de atajos', () => {
    const w = montar();
    expect(w.findAll('button')).toHaveLength(3);
    expect(w.find('input').exists()).toBe(false);
    expect(w.text()).not.toMatch(/to select|to navigate|esc/i);
  });

  it('marca la que esta puesta', () => {
    const w = montar();
    const pulsadas = w
      .findAll('button')
      .filter(b => b.attributes('aria-pressed') === 'true');
    expect(pulsadas).toHaveLength(1);
    expect(pulsadas[0].text()).toContain('SYSTEM_MODE');
  });

  it('elegir oscuro lo aplica y cierra', async () => {
    const w = montar();
    await w.findAll('button')[1].trigger('click');
    expect(document.body.classList.contains('dark')).toBe(true);
    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(w.findAll('button')[1].attributes('aria-pressed')).toBe('true');
  });
});
