import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import VigilaChatAjeno from './VigilaChatAjeno.vue';

const chat = ref({});
const rol = ref('agent');
const push = vi.fn();
const alerta = vi.fn();

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: nombre =>
    ({
      getSelectedChat: chat,
      getCurrentRole: rol,
      getCurrentUserID: ref(7),
    })[nombre],
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: 1 } }),
  useRouter: () => ({ push }),
}));
vi.mock('dashboard/composables', () => ({
  useAlert: (...args) => alerta(...args),
}));

describe('VigilaChatAjeno', () => {
  beforeEach(() => {
    push.mockClear();
    alerta.mockClear();
    rol.value = 'agent';
    chat.value = { id: 45, meta: { assignee: { id: 7, name: 'Yo' } } };
    delete window.globalConfig;
  });

  it('con un chat propio abierto no hace nada', async () => {
    mount(VigilaChatAjeno);
    await nextTick();
    expect(push).not.toHaveBeenCalled();
  });

  it('si el chat abierto pasa a otro asesor, avisa y vuelve a la lista', async () => {
    mount(VigilaChatAjeno);
    chat.value = { id: 45, meta: { assignee: { id: 8, name: 'Isaac' } } };
    await nextTick();
    expect(alerta).toHaveBeenCalledWith('Este chat ahora lo atiende Isaac.');
    expect(push).toHaveBeenCalledWith({
      name: 'home',
      params: { accountId: 1 },
    });
  });

  it('si lo sueltan al pozo comun sigue pudiendo verlo', async () => {
    mount(VigilaChatAjeno);
    chat.value = { id: 45, meta: { assignee: null } };
    await nextTick();
    expect(push).not.toHaveBeenCalled();
  });

  it('a un administrador no le afecta', async () => {
    rol.value = 'administrator';
    mount(VigilaChatAjeno);
    chat.value = { id: 45, meta: { assignee: { id: 8, name: 'Isaac' } } };
    await nextTick();
    expect(push).not.toHaveBeenCalled();
  });
});
