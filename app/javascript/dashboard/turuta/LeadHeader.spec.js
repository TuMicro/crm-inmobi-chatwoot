import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import LeadHeader from './LeadHeader.vue';

// La visita y Google Calendar en la ficha (docs/18 del repo crm-inmobi).
const state = reactive({ lead: null, busy: false, conversationId: 63 });
const miId = ref(9);
const agendarVisita = vi.fn(async () => true);
const cambiarEtapa = vi.fn(async () => true);

vi.mock('./useLead', () => ({
  useLead: () => ({
    state,
    miId,
    cambiarEtapa,
    agendarVisita,
    quitarVisita: vi.fn(),
    cambiarIa: vi.fn(),
  }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: 1 } }),
}));

const EN_UNA_SEMANA = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
const AGENDADA = {
  code: 'visita_agendada',
  name: 'Visita agendada',
  requiereVisita: true,
};

const lead = (extra = {}) => ({
  found: true,
  id: 'L1',
  etapa: { code: 'contactado', name: 'Contactado', terminal: false },
  asesor: 'Ana Cerradora',
  ia: null,
  perdida: null,
  ventana24h: true,
  siguiente: AGENDADA,
  siguientes: [AGENDADA],
  motivosPerdida: [],
  calendario: { conectados: [7], asesorAgentId: 7 },
  visita: null,
  ...extra,
});

const visita = (extra = {}) => ({
  scheduledAt: EN_UNA_SEMANA,
  address: 'Av. Larco 1234',
  status: 'SCHEDULED',
  reminderStatus: 'PENDING',
  guests: ['ana@x.com'],
  calendario: { estado: 'ok', de: 'Ana Cerradora', error: null },
  ...extra,
});

const montar = () =>
  mount(LeadHeader, {
    props: { conversationId: 63 },
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
      directives: { tooltip: {} },
    },
  });

const boton = (w, texto) =>
  w.findAll('button').find(b => b.text().includes(texto));
const invitados = w => w.find('[data-turuta="visita-invitados"]');
// Dentro de una semana: hoy a esa hora puede haber pasado ya.
const ponerHora = async w => {
  await w.find('input[type="date"]').setValue(EN_UNA_SEMANA.slice(0, 10));
  await w.find('input[type="time"]').setValue('10:30');
};

describe('LeadHeader: la visita y Google Calendar', () => {
  beforeEach(() => {
    state.lead = lead();
    state.busy = false;
    miId.value = 9;
    agendarVisita.mockClear();
    cambiarEtapa.mockClear();
  });

  it('al agendar pregunta a quien mas invitar y manda los correos limpios', async () => {
    const w = montar();
    await boton(w, 'Mover a Visita agendada').trigger('click');
    expect(w.text()).toContain('Invitar a otros correos');
    expect(w.text()).toContain(
      'Se pone también en el Google Calendar de Ana Cerradora.'
    );
    await ponerHora(w);
    await invitados(w).setValue('Luis@Y.pe, eva@z.org');
    await boton(w, 'Agendar').trigger('click');
    await flushPromises();
    expect(cambiarEtapa).toHaveBeenCalledWith(
      'visita_agendada',
      expect.objectContaining({ visitGuests: ['luis@y.pe', 'eva@z.org'] })
    );
  });

  it('un correo mal escrito se dice y no deja agendar', async () => {
    const w = montar();
    await boton(w, 'Mover a Visita agendada').trigger('click');
    await ponerHora(w);
    await invitados(w).setValue('luis@y.pe, pepe');
    expect(w.text()).toContain('No parece un correo: pepe');
    await boton(w, 'Agendar').trigger('click');
    await flushPromises();
    expect(cambiarEtapa).not.toHaveBeenCalled();
  });

  it('dice a quien se copia siempre; y si nadie lo tiene conectado, va al de quien recibe la copia', async () => {
    state.lead = lead({
      calendario: {
        conectados: [1],
        asesorAgentId: 7,
        respaldo: 'Jefe',
        copia: ['jefe@x.com'],
      },
    });
    const w = montar();
    await boton(w, 'Mover a Visita agendada').trigger('click');
    expect(invitados(w).exists()).toBe(true);
    expect(w.text()).toContain(
      'Se pone también en el Google Calendar de Jefe, que recibe copia de todas.'
    );
    expect(w.text()).toContain('Copia de todas las visitas: jefe@x.com.');
  });

  it('nadie con el calendario conectado: en vez del campo, el enlace para conectarlo', async () => {
    state.lead = lead({ calendario: { conectados: [], asesorAgentId: 7 } });
    const w = montar();
    await boton(w, 'Mover a Visita agendada').trigger('click');
    expect(invitados(w).exists()).toBe(false);
    expect(w.text()).toContain('conecta tu calendario');
  });

  it('sin configurar en el servidor, la ficha no dice nada del calendario', async () => {
    state.lead = lead({
      calendario: null,
      visita: visita({ calendario: null, guests: [] }),
    });
    const w = montar();
    expect(w.text()).not.toContain('Google Calendar');
    await boton(w, 'Cambiar').trigger('click');
    expect(invitados(w).exists()).toBe(false);
    expect(w.text()).not.toContain('conecta tu calendario');
  });

  it('la visita agendada dice en que calendario esta y a quien se invito', () => {
    state.lead = lead({ visita: visita() });
    const w = montar();
    expect(w.text()).toContain('En el Google Calendar de Ana Cerradora.');
    expect(w.text()).toContain('Invitados: ana@x.com');
  });

  it('las horas del recordatorio van con la visita, y se dice cuando le llega', async () => {
    const w = montar();
    await boton(w, 'Mover a Visita agendada').trigger('click');
    await ponerHora(w);
    expect(w.find('[data-turuta="visita-horas"]').element.value).toBe('2');
    expect(w.find('[data-turuta="visita-horas-aviso"]').text()).toContain(
      'Le llegará'
    );
    await w.find('[data-turuta="visita-horas"]').setValue('6');
    await boton(w, 'Agendar').trigger('click');
    await flushPromises();
    expect(cambiarEtapa).toHaveBeenCalledWith(
      'visita_agendada',
      expect.objectContaining({ visitReminderHours: 6 })
    );
  });

  it('el dia anterior sin la plantilla aprobada no deja agendar', async () => {
    state.lead = lead({
      recordatorio: { zonaHoraria: 'America/Lima', plantillaDelDia: false },
    });
    const w = montar();
    await boton(w, 'Mover a Visita agendada').trigger('click');
    await ponerHora(w);
    await w.find('[data-turuta="visita-horas"]').setValue('48');
    expect(w.find('[data-turuta="visita-horas-aviso"]').text()).toContain(
      'saldría el día anterior'
    );
    await boton(w, 'Agendar').trigger('click');
    await flushPromises();
    expect(cambiarEtapa).not.toHaveBeenCalled();
  });

  it('cambiar la visita trae los invitados que tenia', async () => {
    state.lead = lead({ visita: visita() });
    const w = montar();
    await boton(w, 'Cambiar').trigger('click');
    expect(invitados(w).element.value).toBe('ana@x.com');
    await boton(w, 'Guardar').trigger('click');
    await flushPromises();
    expect(agendarVisita).toHaveBeenCalledWith(
      expect.any(String),
      'Av. Larco 1234',
      ['ana@x.com'],
      2
    );
  });
});
