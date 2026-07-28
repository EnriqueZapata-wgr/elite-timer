# 🌅 Estado al despertar · ATP Science Portal

**Trabajo autónomo de la madrugada del 2026-07-28.** Enrique dijo: *"continúa con todo lo que puedas y avanza tanto como puedas tú solo hasta llegar lo más cerca posible de la publicación."*

**Dónde quedó:** el portal existe, funciona y se puede abrir. Falta lo que solo tú puedes decidir.

---

## 1 · Lo primero que quiero que hagas

Abre **`tools/science-portal/atp-science.html`** en el navegador. Está también como artefacto en tu Cowork con el nombre *ATP Science Wiki*. No necesita servidor ni conexión: es un archivo único.

Recorre estas cuatro cosas en este orden, porque son las que quiero que juzgues:

1. **Una intervención cualquiera** → mira cómo se abre el expediente por capas. Prueba `Hidratación matutina 500 ml`: vas a ver un estudio marcado *"Financiada por industria interesada"* con la nota de que lo patrocinó Danone. Eso es el producto.
2. **Método** → las tres reglas que no negociamos, escritas para afuera.
3. **Lo que no sabemos** → siete huecos declarados en nuestras palabras.
4. **Lo que retiramos** → seis correcciones con fecha y motivo, incluida la de las citas soviéticas.

Si esas cuatro páginas te representan, el portal está listo para contenido. Si no, dime qué cambia y lo rehago: **el HTML se regenera desde el catálogo con dos comandos, no se edita a mano.**

---

## 2 · Lo que se hizo mientras dormías

| | |
|---|---|
| **68 estudios verificados insertados** | Cada uno con paradigma, tipo y DOI. Antes de insertarlos los mandé a **tres verificadores independientes** de los agentes que los encontraron: **71 de 71 resolvieron**, cero fabricados, cero discrepancias de autor, año o revista. |
| **2 paradigmas nuevos** | `japanese_academic` y `korean_academic`. El corpus japonés de shinrin-yoku y Waon no tenía dónde vivir y se estaba clasificando como occidental, que es falso. |
| **`sourceType` en las 777 fuentes** | Seis valores. La doctrina dejó de ser buena intención y es un tipo de TypeScript. |
| **Nivel de evidencia computado** | Implementado con la asimetría que aprobaste: **solo puede bajar, nunca subir.** |
| **1 cita duplicada eliminada** | Burkhart 2009 estaba citado dos veces en la misma intervención con los nombres de pila invertidos. Inflaba el conteo de fuentes. |
| **El portal completo** | 88 intervenciones, 777 fuentes, 328 con enlace verificable, seis vistas. |

---

## 3 · Tres hallazgos que cambian cosas

### 3.1 · La fórmula publicada, tomada literalmente, infla

Mi primera implementación del nivel computado **promovía 55 intervenciones a N1**. Eso confirma AK-12 de la peor manera: si publicamos "N1 = tres paradigmas convergentes" y alguien lo calcula, casi todo el catálogo califica, porque la tradición cuenta como paradigma.

Lo resolví con un techo estricto —N1 exige tres paradigmas duros **y** dos estudios resolubles— y con la regla de que el cálculo solo puede bajar. Resultado: **el nivel declarado se sostiene en 84 de 88.** Bajan cuatro, y aparecen marcadas en el portal con su motivo:

- `pantallas_off_90min` N1 → N2 (solo dos paradigmas duros)
- `meta_pasos_10k` N1 → N2 (un solo estudio resoluble)
- `ducha_fria_nivel3` N2 → N3 (el de AK-20)
- `pausas_activas_90min` N2 → N3 (**cero estudios resolubles** — este no lo habíamos visto)

### 3.2 · Encontré la incoherencia de Harvard dentro de nuestro catálogo → AK-21

Al tipar las fuentes salieron seis que invocan autoridad institucional. **Cuatro se usan como respaldo**: la American Optometric Association para la regla 20-20-20, un Preferred Practice Pattern de la Academia Americana de Oftalmología, una Scientific Statement de la AHA en *Circulation*, y el Departamento de Veteranos citado porque "35+ centros lo implementan" — que es adopción, no evidencia.

Las otras dos son usos legítimos y conviene saber distinguirlos: tres advertencias de Divers Alert Network **restringen** una práctica por seguridad, y la AHA aparece citada explícitamente como *"postura opuesta"* sobre los omega-6. Esa última **es el modelo de lo que el portal debe hacer siempre.**

El tipo `authority_body` ya existe y el generador lo excluye del cálculo de nivel. Faltan las cuatro reescrituras. **Cinco de 777 es un perfil de coherencia mucho mejor del que temíamos.**

### 3.3 · El dato honesto sobre la cosecha

Las fuentes académicas no occidentales pasaron de **2 de 716 (0,3%) a 32 de 777 (4,1%)**. Un factor de trece.

Y aun así, **el corpus sigue siendo 67% de origen occidental**, casi igual que el 68% de partida. Porque junto con la cosecha no occidental entró mucha evidencia occidental, buena parte de ella *en contra* de nuestras propias afirmaciones.

Prefiero que lo sepas así: **la cosecha mejoró la honestidad del expediente mucho más de lo que movió su geografía.** Presumir el 4,1% sin ese contexto sería justo el tipo de cosa que este portal existe para no hacer.

---

## 4 · Lo que NO toqué, y por qué

**Los cinco claims caídos siguen intactos.** Ushapan, agua fuera de las comidas, sauna infrarroja, el bloque de "desinflamación" y la duración de la ducha fría. Dijiste que los revisas tú y cambian narrativa, no redacción.

Lo que sí hice es que **el portal los muestra en revisión**, con un recuadro ámbar que explica en una línea por qué. No inventé la corrección ni la escondí: el usuario ve que estamos revisando esa afirmación y por qué. Cuando decidas, se reescribe el catálogo y el portal se regenera solo.

Tampoco toqué nada que requiera validación de Mariana.

---

## 5 · Lo que falta para publicar, en orden

1. **⛔ La regla de exclusión del expediente AK en el build.** `AK_EXPEDIENTE_INTERNO.md` vive en `R and D/`. Si el pipeline del sitio lee esa carpeta, publicas el documento del abogado del diablo. **Esto va antes que todo lo demás.** Un `.gitignore` no basta si el generador lee el directorio.
2. **Tus cinco decisiones** sobre los claims caídos.
3. **Las cuatro citas de autoridad** (AK-21) reescritas o retiradas.
4. **Validación de Mariana** sobre las afirmaciones clínicas nuevas y los riesgos incorporados: contraindicación de QT largo en inmersión fría, neumonía lipoidea por oil pulling, y la atenuación de hipertrofia por frío post-fuerza.
5. **Disclaimers legales.** El pie del portal ya trae el "ATP no cura, previene ni trata", pero la app tiene un sistema de disclaimers por pantalla (`legal-texts.ts`, `medical-disclaimers.ts`) y el portal público debería heredarlo, no improvisarlo. Exposición regulatoria mexicana: no la evalué, no es mi terreno.
6. **La capa `Claim`.** Hoy la trazabilidad es intervención → fuente. Para que el portal responda a *una oración concreta* falta frase → fuente. Es la Fase 1 del plan y es lo que convierte esto en el firewall que pediste.

---

## 6 · Nota sobre lo que este portal todavía no es

Es una **biblioteca navegable con expediente por intervención**. Eso ya es más de lo que tiene cualquier app de salud que conozco.

Todavía **no es la Wikipedia** que pediste, y no quiero que la primera impresión te confunda. Faltan dos cosas para eso: el resumen en lenguaje llano de cada estudio (hoy muestra la cita y el enlace, no el hallazgo explicado) y la navegación tema → subtema → estudio con el estudio como nodo. Las dos están en el plan como Fases 3 y 4, y la 3 es la larga: son cientos de resúmenes y es research, no código.

Lo que sí está completo es el **cimiento honesto**: 777 fuentes tipadas, niveles que no se pueden inflar, sesgos declarados en las dos direcciones, y un registro público de nuestras propias correcciones.

---

## 7 · Comandos

Regenerar el portal después de cualquier cambio al catálogo:

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer\tools\science-portal"
```
```powershell
python extract.py
```
```powershell
python build.py
```

Verificar que TypeScript sigue limpio tras las inserciones:

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
```
```powershell
npx tsc --noEmit
```

⚠️ **No pude correr `tsc` yo**: git y node sobre OneDrive se cuelgan a los 45 segundos desde aquí. Todas las verificaciones que sí hice son estructurales — llaves balanceadas, comillas escapadas, finales de línea CRLF preservados, 777 de 777 fuentes con `sourceType`, cero `sources[]` vacíos, y el portal renderizado en un navegador real sin errores de consola. **Si `tsc` falla, no publiques y dime qué dice.**
