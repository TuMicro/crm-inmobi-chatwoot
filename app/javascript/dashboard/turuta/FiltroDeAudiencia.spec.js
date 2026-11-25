import { describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';
import FiltroDeAudiencia from './FiltroDeAudiencia.vue';
import { consultaDeFiltros, textoDeFiltros } from './mensajesMasivos';

// Con las filas y los filtros DE VERDAD de Chatwoot (ConditionRow y su
// provider): lo que se prueba es que encajan fuera del dialogo de filtros.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: clave => clave }),
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: nombre =>
    ({
      'attributes/getConversationAttributes': ref([
        {
          attributeKey: 'crm_stage_name',
          attributeDisplayName: 'Etapa del lead',
          attributeDisplayType: 'list',
          attributeValues: ['Nuevo', 'Seguimiento', 'Cierre'],
          attributeModel: 'conversation_attribute',
        },
      ]),
      'attributes/getContactAttributes': ref([
        {
          attributeKey: 'distrito',
          attributeDisplayName: 'Distrito',
          attributeDisplayType: 'text',
          attributeModel: 'contact_attribute',
        },
      ]),
      'labels/getLabels': ref([{ id: 1, title: 'surco', color: '#f00' }]),
      'agents/getAgents': ref([{ id: 7, name: 'Eva' }]),
      'inboxes/getInboxes': ref([]),
      'teams/getTeams': ref([]),
      'campaigns/getAllCampaigns': ref([]),
    })[nombre],
}));

const montar = async filas => {
  const modelo = ref(filas);
  const w = mount(FiltroDeAudiencia, {
    props: {
      modelValue: modelo.value,
      'onUpdate:modelValue': v => {
        modelo.value = v;
        w.setProps({ modelValue: v });
      },
    },
    global: {
      mocks: { $t: clave => clave },
    },
  });
  await flushPromises();
  return { w, modelo };
};

describe('FiltroDeAudiencia', () => {
  it('la fila que propone es la etapa del lead, sin valor', async () => {
    const { w } = await montar([]);
    expect(w.vm.filaNueva()).toEqual({
      attributeKey: 'crm_stage_name',
      filterOperator: 'equal_to',
      values: {},
      queryOperator: 'and',
    });
  });

  it('ofrece los filtros de la lista de chats, con los de contacto', async () => {
    const { w } = await montar([]);
    const claves = w.vm.tipos.map(t => t.attributeKey);
    expect(claves).toEqual(
      expect.arrayContaining([
        'crm_stage_name',
        'labels',
        'assignee_id',
        'status',
        'contact_attribute:distrito',
      ])
    );
    // Los que el CRM no usa siguen fuera.
    expect(claves).not.toContain('priority');
    expect(claves).not.toContain('team_id');
  });

  it('una fila sin valor no vale; con valor, si', async () => {
    const { w } = await montar([]);
    const { modelo } = await montar([]);
    expect(modelo.value).toEqual([]);

    const vacia = await montar([w.vm.filaNueva()]);
    expect(vacia.w.vm.validar()).toBe(false);

    const llena = await montar([
      {
        ...w.vm.filaNueva(),
        values: { id: 'Seguimiento', name: 'Seguimiento' },
      },
    ]);
    expect(llena.w.vm.validar()).toBe(true);
  });

  it('valida todas las filas, no solo la primera', async () => {
    const { w } = await montar([]);
    const etapa = {
      ...w.vm.filaNueva(),
      values: { id: 'Seguimiento', name: 'Seguimiento' },
    };
    const dos = await montar([etapa, w.vm.filaNueva()]);
    expect(dos.w.findAll('li')).toHaveLength(2);
    expect(dos.w.vm.validar()).toBe(false);
  });

  it('lo que sale del filtro se convierte en la consulta y en su frase', async () => {
    const { w } = await montar([]);
    const filas = [
      {
        ...w.vm.filaNueva(),
        values: { id: 'Seguimiento', name: 'Seguimiento' },
      },
      {
        attributeKey: 'labels',
        filterOperator: 'equal_to',
        values: [{ id: 'surco', name: 'surco' }],
        queryOperator: 'and',
      },
    ];
    expect(consultaDeFiltros(filas).payload.map(c => c.values)).toEqual([
      ['Seguimiento'],
      ['surco'],
    ]);
    expect(textoDeFiltros(filas, w.vm.tipos)).toContain('surco');
    await nextTick();
  });
});
