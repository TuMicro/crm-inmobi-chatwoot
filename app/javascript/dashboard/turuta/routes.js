// [turuta] Rutas nuestras dentro del dashboard de Chatwoot. Se registran en
// routes/dashboard/dashboard.routes.js con dos lineas marcadas [turuta].
import { frontendURL } from 'dashboard/helper/URLHelper';
import EmbudoPage from './EmbudoPage.vue';
import PropiedadesPage from './PropiedadesPage.vue';
import IaPage from './IaPage.vue';
import ReiniciarLeadPage from './ReiniciarLeadPage.vue';
import ImportarChatPage from './ImportarChatPage.vue';
import CalendarioPage from './CalendarioPage.vue';
import ColoresDeEtapaPage from './ColoresDeEtapaPage.vue';
import MensajesMasivosPage from './MensajesMasivosPage.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/turuta/embudo'),
    name: 'turuta_embudo',
    component: EmbudoPage,
    // Solo administradores: el asesor trabaja con sus leads, no con los de
    // todos. El item del menu se esconde solo, porque mira estos permisos.
    meta: { permissions: ['administrator'] },
  },
  {
    path: frontendURL('accounts/:accountId/turuta/propiedades'),
    name: 'turuta_propiedades',
    component: PropiedadesPage,
    // Tambien los asesores: la ficha, el video y el horario de visitas los
    // llena el equipo, no solo el administrador.
    meta: { permissions: ['administrator', 'agent'] },
  },
  {
    path: frontendURL('accounts/:accountId/turuta/ia'),
    name: 'turuta_ia',
    component: IaPage,
    // Solo administradores: el interruptor y lo que la IA dice de la empresa
    // no son cosa de un asesor. El item del menu se esconde solo.
    meta: { permissions: ['administrator'] },
  },
  {
    path: frontendURL('accounts/:accountId/turuta/mensajes-masivos'),
    name: 'turuta_mensajes_masivos',
    component: MensajesMasivosPage,
    // Tambien los asesores (lo pidio el cliente el 25/11). A quien alcanza
    // cada uno lo decide la API con su token: un asesor, los chats que ve en
    // su lista; un administrador, todos.
    meta: { permissions: ['administrator', 'agent'] },
  },
  {
    path: frontendURL('accounts/:accountId/turuta/reiniciar-lead'),
    name: 'turuta_reiniciar_lead',
    component: ReiniciarLeadPage,
    // Solo administradores: borra a una persona de la cuenta. Va en Ajustes;
    // el item se esconde solo a los asesores.
    meta: { permissions: ['administrator'] },
  },
  {
    path: frontendURL('accounts/:accountId/turuta/importar-chat'),
    name: 'turuta_importar_chat',
    component: ImportarChatPage,
    // Solo administradores: crea contactos, chats y leads. El endpoint de
    // Chatwoot (turuta_importaciones) tambien lo comprueba.
    meta: { permissions: ['administrator'] },
  },
  {
    // Nuestra API devuelve aqui al volver de Google (vueltaAlCrm): si cambia
    // esta direccion, cambia alli tambien.
    path: frontendURL('accounts/:accountId/turuta/calendario'),
    name: 'turuta_calendario',
    component: CalendarioPage,
    // Todos: cada persona conecta su propio Google Calendar.
    meta: { permissions: ['administrator', 'agent'] },
  },
  {
    path: frontendURL('accounts/:accountId/turuta/colores-etapa'),
    name: 'turuta_colores_etapa',
    component: ColoresDeEtapaPage,
    // Solo administradores: son los colores de todo el equipo. Cada persona
    // cambia los suyos en el perfil. La API tambien lo comprueba.
    meta: { permissions: ['administrator'] },
  },
];
