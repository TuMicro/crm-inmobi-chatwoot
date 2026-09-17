// [turuta] Datos del mapa de calor "Cierres" del informe Resumen.
//
// La API da el instante de cada cierre (segundos). Aqui se reparten en cubos de
// una hora, en la hora LOCAL del navegador, con la misma forma que usa el mapa
// de Chatwoot: [{ timestamp, value }]. Tienen que ir TODAS las horas del
// periodo, tambien las que valen cero: el mapa solo pinta una fila por cada dia
// que aparece en los datos.

export const PERIODOS_DEL_MAPA = [7, 30];

export function cubosPorHora(instantes, dias, ahora = new Date()) {
  const inicio = new Date(ahora);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - (dias - 1));

  const cubos = new Map();
  for (let d = 0; d < dias; d += 1) {
    for (let h = 0; h < 24; h += 1) {
      const hora = new Date(inicio);
      hora.setDate(inicio.getDate() + d);
      hora.setHours(h);
      cubos.set(Math.floor(hora.getTime() / 1000), 0);
    }
  }

  (instantes || []).forEach(segundos => {
    const hora = new Date(segundos * 1000);
    hora.setMinutes(0, 0, 0);
    const clave = Math.floor(hora.getTime() / 1000);
    if (cubos.has(clave)) cubos.set(clave, cubos.get(clave) + 1);
  });

  return Array.from(cubos, ([timestamp, value]) => ({ timestamp, value }));
}

/** Texto de cada celda al pasar el raton. */
export function textoDeCelda(valor) {
  if (!valor) return 'Sin cierres';
  return valor === 1 ? '1 cierre' : `${valor} cierres`;
}
