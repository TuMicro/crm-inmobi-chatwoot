// [turuta] Rutas nuestras dentro del dashboard de Chatwoot. Se registran en
// routes/dashboard/dashboard.routes.js con dos lineas marcadas [turuta].
import { frontendURL } from 'dashboard/helper/URLHelper';
import EmbudoPage from './EmbudoPage.vue';
import PropiedadesPage from './PropiedadesPage.vue';

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
];
