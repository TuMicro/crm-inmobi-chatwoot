// [turuta] Calculos de la pagina Embudo, sin Vue, para poder probarlos.
// La API (dashboard-app/funnel) da los recuentos; aqui solo se preparan para
// pintarlos.

const ganada = e => e.terminal && !e.requiereMotivo;
const perdida = e => Boolean(e.requiereMotivo);

/** 'ganada' | 'perdida' | 'abierta'. Decide el color de la etapa. */
export function tipoDeEtapa(etapa) {
  if (ganada(etapa)) return 'ganada';
  if (perdida(etapa)) return 'perdida';
  return 'abierta';
}

const porcentaje = (parte, total) =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

/** Las cuatro cifras de cabecera. La tasa de cierre es sobre los leads que ya
 *  tienen desenlace (ganados + perdidos); null si todavia no hay ninguno, que
 *  no es lo mismo que un 0 %. */
export function resumen(datos) {
  const etapas = datos?.etapas || [];
  const suma = filtro =>
    etapas.filter(filtro).reduce((n, e) => n + (e.total || 0), 0);
  const cerrados = suma(ganada);
  const perdidos = suma(perdida);
  const conDesenlace = cerrados + perdidos;
  return {
    activos: datos?.activos ?? 0,
    total: datos?.total ?? 0,
    cerrados,
    perdidos,
    tasaDeCierre: conDesenlace ? porcentaje(cerrados, conDesenlace) : null,
  };
}

/** Filas del grafico por etapa: ancho de barra relativo a la etapa mas llena,
 *  y que parte del total de leads representa cada una. */
export function filasPorEtapa(etapas) {
  const lista = etapas || [];
  const maximo = Math.max(1, ...lista.map(e => e.total || 0));
  const total = lista.reduce((n, e) => n + (e.total || 0), 0);
  return lista.map(e => ({
    code: e.code,
    name: e.name,
    total: e.total || 0,
    tipo: tipoDeEtapa(e),
    ancho: porcentaje(e.total || 0, maximo),
    parte: porcentaje(e.total || 0, total),
  }));
}

/** Filas de una lista con barras (cierres por asesor, perdidos por motivo). */
export function filasConBarra(lista) {
  const filas = lista || [];
  const maximo = Math.max(1, ...filas.map(f => f.total || 0));
  const total = filas.reduce((n, f) => n + (f.total || 0), 0);
  return filas.map(f => ({
    ...f,
    ancho: porcentaje(f.total || 0, maximo),
    parte: porcentaje(f.total || 0, total),
  }));
}

/** 0 a 4: cuanto se tine una celda de la tabla por asesor. 0 es vacia. */
export function intensidad(valor, maximo) {
  if (!valor || maximo <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((valor / maximo) * 4)));
}

/** El valor mas alto de la tabla por asesor, sin contar la columna Total. */
export function maximoDeLaTabla(asesores) {
  return Math.max(
    0,
    ...(asesores || []).flatMap(a => Object.values(a.porEtapa || {}))
  );
}

/** "Ana Cerradora" -> "AC". Para el circulo del asesor. */
export function iniciales(nombre) {
  const partes = String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return '?';
  const letras =
    partes.length === 1
      ? partes[0].slice(0, 2)
      : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
}

/** Asesores con algun lead primero; a igualdad, por nombre. "Sin asesor" al final. */
export function ordenarAsesores(asesores) {
  return [...(asesores || [])].sort((a, b) => {
    if (!a.id !== !b.id) return a.id ? -1 : 1;
    return (
      (b.total || 0) - (a.total || 0) ||
      String(a.nombre).localeCompare(String(b.nombre), 'es')
    );
  });
}
