// [turuta] Calculos de la pagina IA, sin Vue, para poder probarlos.
// Los datos salen de nuestra API (dashboard-app/ai); aqui solo se preparan
// para pintarlos. Que significa cada cosa: docs/16-manual-ia.md en crm-inmobi.

/** Por que la IA le paso el chat a una persona, en cristiano. */
export const TEXTO_MOTIVO = {
  calificado: 'Calificados',
  visita: 'Pidieron visita',
  pide_humano: 'Pidieron hablar con alguien',
  vendedor: 'Querían vender',
  servicio: 'Preguntaron por un servicio',
  fuera_de_alcance: 'Fuera de su alcance',
  sin_avance: 'Muchas vueltas sin avanzar',
  gestion: 'Pidieron una gestión',
  ia_apagada: 'Se apagó la IA',
  humano: 'Un asesor escribió en el chat',
  asignado: 'Un asesor se lo asignó',
  pausa: 'Un asesor la pausó',
};

export const textoMotivo = motivo =>
  TEXTO_MOTIVO[motivo] || motivo || 'Sin motivo';

/** Los motivos que dejan al lead con la IA todavía atendiendo. */
const SIGUEN = ['calificado', 'visita', 'gestion'];

/** Dinero con los decimales que hacen falta: centavos o milesimas. */
export function dinero(n) {
  const v = Number(n || 0);
  if (!v) return '$ 0';
  if (v < 1) return `$ ${v.toFixed(v < 0.01 ? 4 : 3)}`;
  return `$ ${v.toFixed(2)}`;
}

/** Las cifras de cabecera de la pagina. */
export function cifras(m) {
  const atendidos = m?.atendidos ?? 0;
  const calificados = m?.calificados ?? 0;
  return {
    atendidos,
    activos: m?.activos ?? 0,
    calificados,
    visitas: m?.visitas ?? 0,
    // Que parte de los leads que atendio acabaron calificados.
    tasa: atendidos ? Math.round((calificados / atendidos) * 100) : null,
    turnos: m?.turnos ?? 0,
    costeUsd: m?.costeUsd ?? 0,
    costePorLead: m?.costePorLead ?? 0,
    latenciaMs: m?.latenciaMs ?? 0,
  };
}

/** Por que se aparto, con la barra proporcional al motivo mas repetido. */
export function motivos(porMotivo) {
  const lista = (porMotivo || []).filter(m => m.motivo);
  const maximo = Math.max(1, ...lista.map(m => m.total || 0));
  return lista.map(m => ({
    motivo: m.motivo,
    texto: textoMotivo(m.motivo),
    total: m.total || 0,
    ancho: Math.round(((m.total || 0) / maximo) * 100),
    sigue: SIGUEN.includes(m.motivo),
  }));
}

/** "24 sep" a partir de "2026-09-24", sin tocar zonas horarias. */
export function etiquetaDeDia(dia) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dia || ''));
  if (!m) return String(dia || '');
  const meses = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'set',
    'oct',
    'nov',
    'dic',
  ];
  return `${Number(m[3])} ${meses[Number(m[2]) - 1]}`;
}

/** Las barras del grafico por dia, con su altura y su etiqueta. */
export function barrasPorDia(porDia) {
  const lista = porDia || [];
  const maximo = Math.max(1, ...lista.map(d => d.turnos || 0));
  return lista.map(d => ({
    dia: d.dia,
    turnos: d.turnos || 0,
    costeUsd: d.costeUsd || 0,
    // Un minimo visible para que un dia con turnos no parezca vacio.
    alto: d.turnos ? Math.max(6, Math.round((d.turnos / maximo) * 100)) : 0,
    etiqueta: etiquetaDeDia(d.dia),
  }));
}

/** Los campos de la configuracion, en el orden en que se enseñan. */
export const CAMPOS = [
  {
    clave: 'nombreEquipo',
    titulo: 'Cómo se presenta',
    ayuda: 'El nombre con el que la IA habla: "en nombre de MadHouse".',
    tipo: 'texto',
  },
  {
    clave: 'tono',
    titulo: 'Trato',
    ayuda: 'Cómo se dirige al lead.',
    tipo: 'opciones',
    opciones: [
      { valor: 'tu', texto: 'De tú' },
      { valor: 'usted', texto: 'De usted' },
    ],
  },
  {
    clave: 'horario',
    titulo: 'Horario de atención',
    ayuda: 'Lo dice si preguntan. Ejemplo: lunes a sábado de 9 a 19.',
    tipo: 'texto',
  },
  {
    clave: 'horarioVisitas',
    titulo: 'Horario de visitas por defecto',
    ayuda: 'Se usa cuando la propiedad no tiene uno propio.',
    tipo: 'texto',
  },
  {
    clave: 'reglas',
    titulo: 'Reglas de la empresa',
    ayuda: 'Qué se puede prometer y qué no, bancos, separaciones, visitas.',
    tipo: 'largo',
  },
  {
    clave: 'faq',
    titulo: 'Preguntas frecuentes',
    ayuda: 'Una pregunta y su respuesta por línea. La IA responde con esto.',
    tipo: 'largo',
  },
  {
    clave: 'maxTurnosSinAvance',
    titulo: 'Vueltas antes de pasar a un asesor',
    ayuda: 'Si el chat no avanza en tantas vueltas, lo pasa a una persona.',
    tipo: 'numero',
  },
];

/** El formulario de configuracion a partir de lo que devuelve la API. */
export function formularioDe(config) {
  const salida = {};
  CAMPOS.forEach(c => {
    const v = config?.[c.clave];
    salida[c.clave] = v === null || v === undefined ? '' : String(v);
  });
  return salida;
}

/** Solo lo que cambio, para no reescribir campos que nadie toco. */
export function cambiosDe(form, config) {
  const original = formularioDe(config);
  const salida = {};
  CAMPOS.forEach(c => {
    const antes = original[c.clave];
    const ahora = String(form?.[c.clave] ?? '').trim();
    if (ahora === antes.trim()) return;
    // Vaciar un campo lo borra; el numero va como numero.
    salida[c.clave] = c.tipo === 'numero' ? Number(ahora) || 12 : ahora;
  });
  return salida;
}

export const hayCambios = (form, config) =>
  Object.keys(cambiosDe(form, config)).length > 0;

/** Un aviso cuando la IA esta encendida pero le falta algo para trabajar. */
export function avisos(datos) {
  const lista = [];
  if (!datos) return lista;
  const bandejas = datos.bandejas || [];
  const encendidas = bandejas.filter(b => b.ia);
  if (datos.aiMode !== 'QUALIFY') {
    lista.push(
      'La IA está apagada: los leads nuevos se reparten como siempre.'
    );
    return lista;
  }
  if (!encendidas.length) {
    lista.push('La IA está encendida pero no atiende ninguna bandeja.');
  }
  if (!datos.inventarioConectado) {
    lista.push(
      'El inventario no está conectado: faltan las claves de las webs en el servidor.'
    );
  } else if (!(datos.sitios || []).length) {
    lista.push(
      'No hay ninguna web elegida: la IA no puede ofrecer propiedades.'
    );
  }
  return lista;
}
