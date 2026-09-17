// [turuta] El icono del menu lateral (components-next/icon/Logo.vue) con y sin
// icono para fondo oscuro.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ref({ logoThumbnail: '/brand-assets/azul.png' }),
}));

const montar = async () => {
  vi.resetModules();
  const { default: Logo } = await import('next/icon/Logo.vue');
  return mount(Logo, { attrs: { class: 'size-4' } });
};

describe('icono del menu', () => {
  afterEach(() => {
    delete window.globalConfig;
  });

  it('sin icono oscuro pinta solo el de siempre, como Chatwoot', async () => {
    window.globalConfig = {};
    const imagenes = (await montar()).findAll('img');
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0].attributes('src')).toBe('/brand-assets/azul.png');
    expect(imagenes[0].classes()).not.toContain('dark:hidden');
  });

  it('con icono oscuro pinta los dos y el tema elige cual se ve', async () => {
    window.globalConfig = { LOGO_THUMBNAIL_DARK: '/brand-assets/blanco.png' };
    const imagenes = (await montar()).findAll('img');
    expect(imagenes).toHaveLength(2);

    const [oscuro, claro] = imagenes;
    expect(oscuro.attributes('src')).toBe('/brand-assets/blanco.png');
    expect(oscuro.classes()).toEqual(
      expect.arrayContaining(['size-4', 'hidden', 'dark:block'])
    );
    expect(claro.attributes('src')).toBe('/brand-assets/azul.png');
    expect(claro.classes()).toEqual(
      expect.arrayContaining(['size-4', 'dark:hidden'])
    );
  });
});
