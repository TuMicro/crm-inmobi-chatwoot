// [turuta] Requisitos de la contrasena, los MISMOS que exige el servidor
// (devise-secure_password, config/initializers/devise.rb). Se ensenan desde que
// se abre el formulario y se validan antes de enviar: asi el asesor no se
// entera de ellos por un aviso de error despues de pulsar el boton.

export const LARGO_MINIMO = 6;

// Igual que shared/helpers/Validators.js (isValidPassword).
const ESPECIAL = /[!@#$%^&*()_+\-=[\]{}|'"/\\.,`<>:;?~]/;

/** Un requisito por fila, con la clave de texto de Chatwoot que le toca. */
export function requisitos(contrasena) {
  const valor = contrasena || '';
  return [
    {
      id: 'largo',
      cumple: valor.length >= LARGO_MINIMO,
      texto: 'REGISTER.PASSWORD.REQUIREMENTS_LENGTH',
    },
    {
      id: 'mayuscula',
      cumple: /[A-Z]/.test(valor),
      texto: 'REGISTER.PASSWORD.REQUIREMENTS_UPPERCASE',
    },
    {
      id: 'minuscula',
      cumple: /[a-z]/.test(valor),
      texto: 'REGISTER.PASSWORD.REQUIREMENTS_LOWERCASE',
    },
    {
      id: 'numero',
      cumple: /[0-9]/.test(valor),
      texto: 'REGISTER.PASSWORD.REQUIREMENTS_NUMBER',
    },
    {
      id: 'especial',
      cumple: ESPECIAL.test(valor),
      texto: 'REGISTER.PASSWORD.REQUIREMENTS_SPECIAL',
    },
  ];
}

/** Validador para vuelidate: true cuando se cumplen todos. */
export const contrasenaValida = contrasena =>
  requisitos(contrasena).every(r => r.cumple);
