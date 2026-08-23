# 🐛 Registro: el alta con un correo que ya existe deja la app colgada

**Detectado:** 22 de agosto de 2026, 04:03 UTC · **Para:** quien programe · **No es de correo, es de la app**

---

## Qué pasó

Se intentó crear una cuenta desde `somosatp.com` con un correo que ya estaba registrado. La app no mostró ningún error, se quedó atorada en la pantalla del nombre, y no llegó ningún correo.

Lo primero que hay que decir es que **el sistema de correo funcionó bien y no mandó nada porque no había nada que mandar.** No se creó ninguna cuenta.

## La evidencia

En los registros de autenticación, a las `2026-08-22T04:03:09Z`:

```json
{ "auth_event": { "action": "user_repeated_signup",
                  "actor_id": "68ffc2df-7cfc-4d9d-ae55-f78cf2aa3d00",
                  "actor_username": "enrique.outliers@gmail.com",
                  "traits": { "provider": "email" } },
  "path": "/signup", "status": 200, "referer": "https://somosatp.com" }
```

Y en la base, al mismo tiempo:

| Consulta | Resultado |
|---|---|
| `count(*) from auth.users` | **9** |
| `max(created_at)` | **18 de julio**, hace 35 días |

O sea: `/signup` contestó **200**, pero no se creó ningún usuario. Esa cuenta ya existía desde el 28 de marzo.

## Por qué Supabase contesta 200 sin hacer nada

Es a propósito y está bien que lo haga. Cuando la confirmación por correo está encendida y alguien se registra con un correo que ya existe, GoTrue devuelve **200 con un objeto de usuario falso** y no manda correo. Si devolviera un error, cualquiera podría averiguar qué direcciones tienen cuenta en ATP probando una por una. La acción queda registrada como `user_repeated_signup`.

**El problema no es de Supabase. Es que la app se cree ese 200.**

## Cómo se detecta del lado del cliente

Supabase sí deja una señal, y es la única: en la respuesta de `signUp()`, cuando el correo ya existe, **`data.user.identities` viene como arreglo vacío.**

```ts
const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } })

if (!error && data.user && data.user.identities?.length === 0) {
  // el correo ya tiene cuenta. Supabase no mandó nada.
  // No avanzar al paso del nombre.
}
```

## Qué debería hacer la app

No decir "ese correo ya existe", porque eso reabre justo el hueco que Supabase cerró. La salida que usan casi todos y que no filtra nada:

> **Si esa dirección no tiene cuenta, te acaba de llegar un correo para confirmarla. Si ya tenías cuenta con nosotros, entra con tu contraseña o pide una nueva desde aquí.**

Con un botón a entrar y otro a recuperar contraseña. La persona que sí es dueña del correo entiende de inmediato; la que está fisgoneando no aprende nada.

## 🔴 Por qué esto importa antes del 27

En el corte de founders va a haber gente que se registró en la beta hace meses y ya no se acuerda. Cada una de esas personas va a ver una pantalla muerta, sin mensaje y sin correo, justo en el momento de entrar. Y del lado nuestro no queda rastro visible: en la base no aparece nada, porque no se creó nada.

Es una fuga silenciosa más, de la misma familia que las otras que ya se cerraron esta semana.

## El segundo bug, que hay que confirmar aparte

Se reportó también que **la pantalla del nombre no avanza**: se escribe el nombre, se toca continuar, y no pasa nada.

Puede ser el mismo problema, si la app llega a esa pantalla después del `signUp()` y se queda esperando una sesión que nunca existió. O puede ser un bug independiente del formulario.

**Se distingue con una prueba de treinta segundos:** repetir el alta con un correo que de verdad no exista. Si con un correo nuevo la pantalla del nombre sí avanza, entonces era el mismo problema. Si sigue sin avanzar, es un bug aparte y hay que buscarlo en el manejador de ese botón.

## Cómo comprobar que quedó arreglado

Registrarse con un correo ya existente y ver un mensaje claro con salida a entrar o recuperar, sin pantalla colgada. Registrarse con un correo nuevo y ver que se crea el usuario, que `auth.users` sube de nueve a diez, y que llega el correo de confirmación.
