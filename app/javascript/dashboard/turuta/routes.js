// [turuta] Rutas nuestras dentro del dashboard de Chatwoot. Se registran en
// routes/dashboard/dashboard.routes.js con dos lineas marcadas [turuta].
import { frontendURL } from 'dashboard/helper/URLHelper';
import EmbudoPage from './EmbudoPage.vue';

export const routes = [
  {
    path: frontendURL('accounts/:accountId/turuta/embudo'),
    name: 'turuta_embudo',
    component: EmbudoPage,
    meta: { permissions: ['administrator', 'agent'] },
  },
];
