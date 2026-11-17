import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CampoHora from './CampoHora.vue';

// El campo de hora de la visita, con desplegable propio (17/11).
const montar = (modelValue = '') =>
  mount(CampoHora, { props: { modelValue }, attachTo: document.body });

const campo = w => w.find('[data-turuta="hora-campo"]');
const panel = w => w.find('[data-turuta="hora-panel"]');
const pulsar = (w, que) => w.find(`[data-turuta="${que}"]`).trigger('click');
const ultimo = w => w.emitted('update:modelValue')?.at(-1)?.[0];
// Como el v-model de quien lo usa: lo que emite vuelve como valor.
const elegir = async (w, que) => {
  await pulsar(w, que);
  if (ultimo(w) !== undefined) await w.setProps({ modelValue: ultimo(w) });
};

describe('CampoHora: la hora de la visita', () => {
  it('vacio, abre con los minutos en 00 y sin hora elegida', async () => {
    const w = montar();
    expect(campo(w).text()).toContain('Elegir hora');
    expect(panel(w).exists()).toBe(false);
    await campo(w).trigger('click');
    expect(panel(w).exists()).toBe(true);
    expect(w.find('[data-turuta="minuto-0"]').classes()).toContain(
      'bg-n-brand'
    );
    expect(w.find('[data-turuta="minuto-5"]').classes()).not.toContain(
      'bg-n-brand'
    );
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });

  it('con elegir la hora ya hay hora: en punto, y de dia', async () => {
    const w = montar();
    await campo(w).trigger('click');
    await elegir(w, 'hora-4');
    expect(ultimo(w)).toBe('16:00');
    expect(campo(w).text()).toContain('4:00 p. m.');
    // Cambia de idea antes de decir a. m. o p. m.: se vuelve a calcular.
    await elegir(w, 'hora-10');
    expect(ultimo(w)).toBe('10:00');
    expect(panel(w).exists()).toBe(true);
  });

  it('al pulsar a. m. o p. m. se cierra solo, aunque ya fuera esa', async () => {
    const w = montar();
    await campo(w).trigger('click');
    await elegir(w, 'hora-4');
    await elegir(w, 'minuto-30');
    expect(panel(w).exists()).toBe(true);
    await elegir(w, 'hora-pm');
    expect(ultimo(w)).toBe('16:30');
    expect(panel(w).exists()).toBe(false);
  });

  it('dicho a. m. o p. m., cambiar la hora lo respeta', async () => {
    const w = montar('16:00');
    await campo(w).trigger('click');
    await elegir(w, 'hora-9');
    expect(ultimo(w)).toBe('21:00');
    await elegir(w, 'hora-am');
    expect(ultimo(w)).toBe('09:00');
    expect(panel(w).exists()).toBe(false);
  });

  it('los minutos y el a. m. / p. m. pulsados antes que la hora, esperan', async () => {
    const w = montar();
    await campo(w).trigger('click');
    await elegir(w, 'minuto-15');
    await elegir(w, 'hora-am');
    expect(w.emitted('update:modelValue')).toBeUndefined();
    expect(panel(w).exists()).toBe(true);
    await elegir(w, 'hora-5');
    expect(ultimo(w)).toBe('05:15');
  });

  it('una hora con minutos sueltos los conserva y los ofrece', async () => {
    const w = montar('10:37');
    expect(campo(w).text()).toContain('10:37 a. m.');
    await campo(w).trigger('click');
    expect(w.find('[data-turuta="minuto-37"]').classes()).toContain(
      'bg-n-brand'
    );
  });

  it('se cierra al pulsar fuera y con Escape', async () => {
    const w = montar('10:00');
    await campo(w).trigger('click');
    // onClickOutside deja pasar un clic por vuelta: el de abrir ya fue uno.
    await new Promise(r => {
      setTimeout(r, 0);
    });
    document.body.click();
    await w.vm.$nextTick();
    expect(panel(w).exists()).toBe(false);
    await campo(w).trigger('click');
    await campo(w).trigger('keydown', { key: 'Escape' });
    expect(panel(w).exists()).toBe(false);
  });
});
