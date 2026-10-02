// [turuta] Los atributos con valor van arriba: el asesor ve primero lo que
// ya se sabe del lead (lo que la IA o el equipo fue llenando), y debajo lo que
// falta. Dentro de cada grupo se respeta el orden de siempre (el que el
// usuario eligio arrastrando, o el de Ajustes).

/** Si un atributo tiene valor: ni vacio, ni solo espacios, ni una lista vacia. */
export function tieneValor(valor) {
  if (valor === null || valor === undefined) return false;
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === 'string') return valor.trim() !== '';
  return true;
}

/**
 * Los elementos del panel con los que tienen valor primero, sin cambiar el
 * orden dentro de cada grupo. Los que no son atributos (los fijos del panel)
 * cuentan como con valor: se quedan donde estaban, arriba.
 */
export function conValorPrimero(elementos) {
  const conValor = [];
  const sinValor = [];
  (elementos || []).forEach(e => {
    const esAtributo = e?.type === 'custom_attribute';
    (esAtributo && !tieneValor(e.value) ? sinValor : conValor).push(e);
  });
  return [...conValor, ...sinValor];
}
