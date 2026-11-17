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

describe('EditorDeColores, la etapa y la intensidad por etapa (17/11)', () => {
  const ultimaIntensidad = w => w.emitted('update:intensidades').at(-1)[0];

  it('el nombre de la etapa va como titulo de cada fila', () => {
    const w = montar({ modelValue: { nurturing: '#F2C230', cierre: null } });
    expect(fila(w, 0).find('h3').text()).toBe('En seguimiento');
  });

  it('cada etapa con color tiene su barra de intensidad; sin color, no', () => {
    const w = montar({ modelValue: { nurturing: '#F2C230', cierre: null } });
    expect(fila(w, 0).find('input[type="range"]').exists()).toBe(true);
    expect(fila(w, 1).find('input[type="range"]').exists()).toBe(false);
  });

  it('mover la barra de una etapa cambia solo esa', async () => {
    const w = montar({
      modelValue: { nurturing: '#F2C230', cierre: '#16883F' },
      intensidades: { nurturing: null, cierre: null },
    });
    await fila(w, 1).find('input[type="range"]').setValue('1.5');
    expect(ultimaIntensidad(w)).toEqual({ nurturing: null, cierre: 1.5 });
  });

  it('solida: avisa de que el texto puede no leerse', () => {
    const w = montar({
      modelValue: { nurturing: '#F2C230', cierre: null },
      intensidades: { nurturing: 2 },
    });
    expect(fila(w, 0).text()).toContain('Sin transparencia');
    expect(fila(w, 0).text()).toContain('Sólido');
  });

  it('con mas intensidad avisa donde el texto se lee peor', () => {
    const w = montar({
      modelValue: { nurturing: '#16883F', cierre: null },
      intensidades: { nurturing: 1.75 },
    });
    expect(fila(w, 0).text()).toContain('el texto se lee peor');
  });

  it('con la de por defecto no avisa', () => {
    const w = montar({ modelValue: { nurturing: '#16883F', cierre: null } });
    expect(fila(w, 0).text()).not.toContain('se lee peor');
    expect(fila(w, 0).text()).not.toContain('Sin transparencia');
  });

  it('en el perfil, la del equipo vale hasta que se elige otra', async () => {
    const conIntensidad = [
      {
        codigo: 'nurturing',
        nombre: 'En seguimiento',
        color: '#F2C230',
        intensidad: 1.5,
      },
    ];
    const w = mount(EditorDeColores, {
      props: { etapas: conIntensidad, personal: true },
      global: { stubs: { Button: BotonFalso, ColorPicker: true } },
    });
    expect(fila(w, 0).text()).toContain('150 %');
    expect(fila(w, 0).text()).toContain('la del equipo');
    await fila(w, 0).find('input[type="range"]').setValue('1');
    expect(ultimaIntensidad(w)).toEqual({ nurturing: 1 });
  });
});
