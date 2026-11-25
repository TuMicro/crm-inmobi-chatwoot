// [turuta] El numero que se escribe en "Mensaje nuevo" para escribirle a
// alguien que no esta en el CRM (25/11). El campo de Chatwoot solo entiende un
// telefono si empieza por "+": sin el lo toma por un correo y no deja crear el
// contacto, y aqui todo el mundo escribe el celular a secas (987 654 321).
//
// En cuanto lo escrito es un celular de Peru entero, se le pone el +51 a la
// vista. Con otro pais hay que escribir el + y el codigo, como siempre.

/** Si lo escrito va camino de ser un telefono y no un nombre o un correo. */
export const pareceTelefono = valor => /^\s*[+\d]/.test(String(valor ?? ''));

/**
 * "987 654 321" -> "+51987654321"; "51 987654321" -> "+51987654321". Null si
 * no es un celular de Peru entero sin prefijo: entonces no se toca lo escrito.
 */
export function conPrefijoDePeru(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto || texto.startsWith('+') || /[^\d\s-]/.test(texto)) return null;
  const digitos = texto.replace(/\D/g, '');
  if (/^9\d{8}$/.test(digitos)) return `+51${digitos}`;
  if (/^519\d{8}$/.test(digitos)) return `+${digitos}`;
  return null;
}
