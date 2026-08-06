# ✅ AWAY RUN MB-20.5 · el cierre de HOY

**Rama:** seguir en `feat/mb20-1-editorial`. Un commit por pieza.
**Cero migraciones.** `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

**Este run cierra HOY.** Después de esto va audit, device test, merge y OTA.

---

# PIEZA 1 · Muere el modal. Solo quedan DOS tipos de card

## La decisión

> *"Eliminemos el modal y mandemos a módulo. Así ya no es pedo de HOY y HOY deja de ser
> confuso. Y así solo tenemos 2 tipos de cards."*

**`experiencia` desaparece como tipo.** Las seis que lo eran pasan a **`navegar`**:
meditación, respiración, cardio, fuerza, journal y N-Back.

`SmartCheckModal` se retira de HOY, junto con `EXPERIENCIA_SOURCES`, `EXPERIENCIA_CAPTURA` y
`EXPERIENCIA_REGISTRO` si no los usa nadie más. **Verifícalo con el censo antes de borrar.**

## El resultado

| Tipo | Tap | Tap largo | Círculo |
|---|---|---|---|
| **palomear** | palomea | navega, si tiene ruta | **círculo** |
| **navegar** | abre su pantalla | nada | **chevron** |

Y agua, que es su propio caso: sus tres botones capturan y el tap del resto abre Hidratación.

⚠️ **Esto mata de un golpe los tres modales sin salida** (journal, N-Back y fuerza), que era el
bug abierto. No hay que arreglarlos: ya no existen.

---

# PIEZA 2 · El registro manual se muda al módulo

Lo que el modal preguntaba ahora vive **dentro de cada pantalla**, que es donde tiene sentido.

**Una card-botón, simple**, arriba o donde encaje con el diseño de esa pantalla:

| Módulo | El botón dice |
|---|---|
| Meditación | **Ya medité** |
| Respiración | **Ya respiré** |
| Cardio | **Registrar sesión** (ya existe: verifica que sea visible) |
| Fuerza | **Registrar entrenamiento** (ya existe `/log-exercise`) |

**Journal y N-Back no lo necesitan:** escribir la entrada **es** el registro, y jugar la partida
**es** el registro. Si le pones un botón ahí, estarías ofreciendo registrar algo que solo existe
si lo hiciste en la app.

## Qué hace ese botón

Abre un **modal simple**: cuánto tiempo, y guardar. Nada más.

> *"Lo vamos mejorando un poco al paso del tiempo."*

⚠️ **Que escriba en la MISMA tabla que la sesión real** (`mind_sessions` para meditar y respirar,
`cardio_sessions` para cardio), para que el electrón verificado se otorgue por el mismo camino
de siempre. **Nada de una ruta paralela**: eso es exactamente lo que rompe el ledger.

---

# PIEZA 3 · La pista visual: círculo contra chevron

Hoy las de navegar no llevan nada donde las de palomear llevan círculo, y **nada indica que van
a llevarte a otro lado.**

- **Palomear → círculo.** Es un blanco que marcas. Ya está.
- **Navegar → chevron.** Es la forma que todo el mundo ya lee como "esto te lleva a algún lado".

**Por qué chevron y no cuadrado ni leyenda:** un cuadrado también se lee como casilla, y una
palabra como "ir" hay que traducirla y ocupa. El chevron no necesita idioma, ocupa lo mismo que
el círculo y **conserva la alineación de la columna** que ya se resolvió con el slot invisible.

Mismo tamaño, misma posición, mismo peso visual. **Lo único que cambia es la forma.**

Aplica en las dos lentes y en la card grande.

---

# PIEZA 4 · Las tres imágenes que faltaban

`TAREA_IMAGES` tiene 18 llaves y le faltan tres. **Las imágenes ya existen en el repo**, solo hay
que asignarlas:

| Card | Imagen |
|---|---|
| Cardio | `assets/images/hoy-extra/cardio-01.webp` y `cardio-02.webp` |
| Romper ayuno | `assets/images/hoy-extra/ayuno.webp` |
| Registrar ciclo | `assets/images/cycle/ciclo-01.webp`, `ciclo-02`, `ciclo-03` |

Con eso **todas las cards son editoriales de verdad**, sin ninguna cayendo al degradado con glifo.

⚠️ Usa el mismo mecanismo de rotación por día que ya tienen las demás.

---

# PIEZA 5 · Los dos tests que quedaron pendientes

**5.1 · El contrato del gesto no prueba el mapeo.** Verifica el orden de los strings en el
código. Cambiar `palomear` por `navegar` en el hook **deja los 9 tests en verde**. Que instancie
el hook y afirme la tabla completa por tipo. **La prueba de que sirve: esa mutación debe tronar.**

Con el modal muerto la tabla es más chica, así que el test es más fácil de escribir.

**5.2 · El copy de la burbuja no tiene test.** Vive suelto en el JSX de `TareasView`. Amárralo
como está el del tour.

---

# PIEZA 6 · El copy, otra vez

Con dos tipos en vez de tres, el copy se simplifica solo.

**Tour, paso 2** y **la burbuja del nudge** deben describir la regla nueva:
un toque palomea los hábitos y abre las funciones; mantener presionado abre el módulo de un
hábito que además tiene pantalla.

⚠️ **Y busca lo que quede de los modales:** cualquier copy, comentario o test que hable de
*"¿ya meditaste?"* o de la paloma inteligente. Si `SmartCheckModal` se borra, sus tests también.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **qué se borró con el modal** y si algo lo seguía usando.

**Verificación en dispositivo:**
1. Solo hay **dos formas**: círculo en las que marcas, chevron en las que abren.
2. **Ningún modal en HOY.** Tocar Meditar abre meditación directo.
3. Dentro de Meditación hay un botón **"Ya medité"** que guarda, y **el electrón se otorga igual
   que con una sesión real.**
4. **Las 21 cards tienen foto.** Ninguna con degradado y glifo.
5. Tap largo en luz solar abre `/solar`; en baño frío no hace nada.
6. Agua conserva sus tres botones y el `-250` no deja negativos.
7. El tour del paso 2 enseña la regla de dos tipos.
