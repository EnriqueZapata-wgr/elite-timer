# 💬 Comms de bienvenida + onboarding beta + invite Skool

**Contexto:** este doc cubre el mensaje que llega **con el link** (no la invitación
previa — esa está en `01_INVITACION_WHATSAPP.md`). Refleja los 5 sprints nuevos:
motor de personalización, Cuestionario Maestro, Salud Funcional 8 destinos, Pilar
Mente editorial, imágenes MJ.

- **Skool (grupo cerrado):** `https://www.skool.com/the-vital-order-7560/about`
  (fuente de verdad: `src/constants/brand.ts` → `SKOOL_URL`).
- **Canal:** WhatsApp 1-a-1 (nunca blast — sesgo personal por tester).
- **Momento:** después de correr grant H+ (`05b`) y confirmar sourcemaps.

---

## 1 · Mensaje de bienvenida (llega CON el link)

```
[Nombre], aquí está 🚀

Bienvenido a la beta cerrada de ATP. Eres de los primeros 9 en el mundo
en tener esto en las manos.

📲 Instala el APK: [link build Expo]
👥 Únete a la Tribu (feedback + comunidad): https://www.skool.com/the-vital-order-7560/about

Ya te dejé saldo de sobra adentro (H+) para que pruebes TODO sin límites
este fin de semana.

Cuando abras la app, empieza por aquí 👇
```

*(Sigue con la guía de 5 pasos de la sección 2.)*

---

## 2 · Onboarding beta · los 5 primeros pasos (pega esto debajo del mensaje)

```
Tu ruta de los primeros 20 min:

1️⃣ Contesta tu Cuestionario Maestro (Salud → Mis Evaluaciones)
   Son ~13 bloques, se guarda solo — puedes salir y volver. Al terminar,
   ATP te prescribe tus 5 intervenciones personalizadas. ESTE es el corazón
   de la app: entre mejor lo contestes, mejor te lee ARGOS.

2️⃣ Genera tu Diagnóstico Funcional con ARGOS (gratis, el primero de por vida).
   Es tu punto de partida medible.

3️⃣ Activa 3-5 de las intervenciones que ATP te sugirió en Mi Protocolo,
   y registra tus hábitos 3-5 días seguidos.

4️⃣ Explora Salud Funcional (8 secciones nuevas) y el Pilar Mente
   (contenido nuevo curado). Escanea 2-3 suplementos con el BHA scan.

5️⃣ Pásate por Comunidad — agrega a 1-2 amigos si conoces a otros testers.

Todo lo que veas — bueno, malo, raro — cae en la Tribu (Skool). Eso es
literalmente el trabajo del tester.
```

---

## 3 · Qué feedback pido (mensaje aparte o fijado en Skool)

```
Lo que más me sirve, en orden:

🐞 Bugs / crashes → captura de pantalla + qué estabas haciendo.
🧭 UX que rechina → dime EN QUÉ pantalla y por qué se sintió mal.
🧠 ¿ARGOS le atinó? → ¿las 5 intervenciones que te prescribió tienen
   sentido para ti? Si algo se sintió fuera de lugar, quiero saberlo.
💡 Ideas → tíralas sin filtro.

No hay feedback "tonto". El detalle chico que a ti te molestó le va a
molestar a las siguientes 100 personas.
```

---

## 4 · Post en Skool · mensaje de arranque del grupo (fijar)

```
Bienvenidos a la Tribu ATP 🔱

Este es el círculo cerrado de la beta. Aquí:
· Reportas bugs y lo que no cuadre (con captura si puedes)
· Compartes qué te prescribió ARGOS y si le atinó
· Propones lo que quieras ver en la v1 pública (agosto)

Regla única: nada de esto se comparte afuera todavía. Son beta cerrada.
Lo que construyamos aquí define la primera versión que ve el mundo.

Yo respondo rápido (< 2h en horario despierto). Cualquier cosa, aquí estoy.
— Enrique
```

---

## 5 · Checklist de envío (para Enrique, día del launch)

- [ ] Grant H+ corrido y verificado (`05b_SQL_GRANT_HPLUS_INICIAL.md` · `grants_recibidos = 1`)
- [ ] `SKOOL_URL` correcto y el grupo acepta solicitudes de ingreso
- [ ] Link del APK/OTA probado por ti en un device limpio
- [ ] Mensajes 1, 2 y 3 personalizados con `[Nombre]` por tester
- [ ] Post de arranque (sección 4) fijado en Skool ANTES de mandar links
- [ ] Enviar 1-a-1 por WhatsApp (no grupo, no blast)

---

**Relacionado:** `01_INVITACION_WHATSAPP.md` (contacto previo) ·
`07_RUNBOOK_LAUNCH_DAY_v2_2026-07-13.md` (Fase 4 · comms) ·
`08_COMMS_POSTBETA_TEMPLATES.md` (seguimiento post-beta).
