import { shallowMount } from '@vue/test-utils';
import { withFullI18n } from 'test-i18n';
import MacroProperties from '../MacroProperties.vue';

withFullI18n();

const mountComponent = props =>
  shallowMount(MacroProperties, {
    props: {
      macroName: 'Close conversation',
      macroVisibility: 'personal',
      ...props,
    },
    global: {
      provide: {
        v$: {
          macro: {
            name: {
              $error: false,
            },
          },
        },
      },
      stubs: {
        WootInput: true,
        NextButton: true,
        Icon: true,
      },
    },
  });

describe('MacroProperties.vue', () => {
  it('allows administrators to select public visibility', async () => {
    const wrapper = mountComponent({ canManagePublicMacros: true });
    const publicButton = wrapper.findAll('button')[0];

    await publicButton.trigger('click');

    expect(publicButton.attributes('disabled')).toBeUndefined();
    expect(wrapper.emitted('update:visibility')?.[0]).toEqual(['global']);
  });

  it('disables public visibility for agents with helper copy', async () => {
    const wrapper = mountComponent({ canManagePublicMacros: false });
    const publicButton = wrapper.findAll('button')[0];

    await publicButton.trigger('click');

    expect(publicButton.attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('update:visibility')).toBeUndefined();
    expect(wrapper.text()).toContain(
      'Only administrators can create public macros.'
    );
  });

  it('keeps existing public macros visibly selected when public is disabled', () => {
    const wrapper = mountComponent({
      canManagePublicMacros: false,
      macroVisibility: 'global',
    });

    expect(wrapper.findComponent({ name: 'Icon' }).exists()).toBe(true);
  });

  it('shows existing public macros as read-only for agents', async () => {
    const wrapper = mountComponent({
      canManagePublicMacros: false,
      macroVisibility: 'global',
      readOnly: true,
    });
    const [publicButton, privateButton] = wrapper.findAll('button');

    await privateButton.trigger('click');

    expect(publicButton.attributes('disabled')).toBeDefined();
    expect(privateButton.attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('update:visibility')).toBeUndefined();
    expect(wrapper.text()).toContain(
      'Only administrators can edit public macros.'
    );
  });

  // [turuta] La macro de una propiedad: un solo boton (22/10).
  describe('la macro de una propiedad', () => {
    const propiedad = {
      nombre: 'JR-001 · Dúplex',
      site: 'joserojas',
      propertyId: 'p-1',
    };
    const botones = wrapper => wrapper.findAll('next-button-stub');

    it('solo el boton que guarda y actualiza la ficha de la propiedad', () => {
      const wrapper = mountComponent({ propiedad });
      expect(botones(wrapper)).toHaveLength(1);
      expect(botones(wrapper)[0].attributes('label')).toBe(
        'Guardar y actualizar también la ficha de la propiedad'
      );
      expect(
        wrapper.find('[data-turuta="macro-de-propiedad"]').text()
      ).toContain('JR-001 · Dúplex');
    });

    it('sin propiedad, el de siempre', () => {
      const wrapper = mountComponent();
      expect(botones(wrapper)).toHaveLength(1);
      expect(wrapper.find('[data-turuta="guardar-y-propiedad"]').exists()).toBe(
        false
      );
    });
  });
});
