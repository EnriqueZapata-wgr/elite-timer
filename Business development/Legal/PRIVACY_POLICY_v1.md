# Política de Privacidad — ATP (Advanced Training Protocol)

**Última actualización:** 2026-07-06
**Versión:** 1.0 (draft — pendiente revisión legal Enrique + Mariana)

## Introducción

ATP ("nosotros", "la app") es un sistema operativo de rendimiento humano que integra fitness, nutrición, mente, salud funcional y ciclo menstrual con inteligencia artificial personalizada (ARGOS). Esta Política de Privacidad describe cómo recolectamos, usamos, compartimos y protegemos tus datos personales.

Al usar ATP aceptas las prácticas descritas aquí. Si no estás de acuerdo, no uses la app.

**Cumplimos con:**
- Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPP, México)
- Reglamento General de Protección de Datos (GDPR, UE)
- California Consumer Privacy Act (CCPA, EE.UU.)
- Directrices de privacidad de Apple App Store y Google Play Store

**Responsable del tratamiento:** Enrique Zapata / ATP · somosatp.com · contacto@somosatp.com

---

## 1. Datos que recolectamos

### 1.1 Información que TÚ nos proporcionas

- **Perfil:** nombre, email, foto opcional, fecha de nacimiento, sexo biológico, altura, peso
- **Objetivo de salud:** propósito principal (longevidad, composición, energía, deporte, etc.)
- **Historia clínica:** síntomas, condiciones, alergias, medicamentos, suplementos
- **Datos biométricos:** biomarcadores, laboratorios, mediciones corporales
- **Ciclo menstrual (si aplica):** fechas, síntomas, fases
- **Hábitos:** nutrición, sueño, ejercicio, ayuno, hidratación, respiración, meditación
- **Conversaciones ARGOS:** mensajes que envías a nuestro asistente IA
- **Feedback:** reportes, encuestas, contacto con soporte

### 1.2 Información recolectada automáticamente

- **Uso de la app:** pantallas visitadas, features usadas, tiempo de sesión (vía PostHog)
- **Datos técnicos:** modelo de dispositivo, sistema operativo, versión de la app, idioma
- **Errores:** stack traces de crashes (vía Sentry)
- **Notificaciones:** tokens de push notifications (solo si concedes permiso)

### 1.3 Información de terceros (opcional)

Si conectas dispositivos externos (Apple Health, Google Fit, Freestyle Libre, Oura, etc.), importamos con tu autorización explícita:
- Pasos, frecuencia cardíaca, HRV, sueño, entrenamientos, peso, glucosa continua

---

## 2. Cómo usamos tus datos

### 2.1 Para operar la app

- Personalizar tu experiencia (recomendaciones, protocolos, agenda)
- Calcular tu Edad ATP y métricas funcionales
- Sincronizar tus datos entre dispositivos
- Enviar notificaciones que solicites

### 2.2 Para inteligencia artificial (ARGOS)

- Procesar tus consultas con proveedores LLM (Anthropic Claude, Google Gemini)
- Generar insights personalizados sobre tu salud
- Sugerir rutinas, recetas, ajustes de hábitos
- Mantener contexto entre sesiones para continuidad

**Importante:** las conversaciones privadas ARGOS↔tú se guardan cifradas y **NUNCA** son accesibles a clínicos, coaches ni terceros, aún si están vinculados a tu cuenta.

### 2.3 Para mejorar la app

- Análisis anónimos de uso agregado (vía PostHog, opt-in)
- Debugging de errores (vía Sentry, con datos mínimos)
- Investigación de producto (data anonimizada, opt-in)

### 2.4 Para propósitos legales

- Cumplir con obligaciones legales aplicables
- Prevenir fraude y abuso
- Responder a requerimientos judiciales

---

## 3. Cómo compartimos tus datos

**NO vendemos tus datos personales. Nunca.**

Compartimos con:

### 3.1 Proveedores de servicio (procesadores)

- **Supabase** (backend/base de datos, hosted en AWS us-east-1)
- **Anthropic** (Claude API para ARGOS)
- **Google** (Gemini fallback ARGOS)
- **Expo/EAS** (build y OTA updates)
- **Sentry** (error tracking)
- **PostHog** (analytics opt-in)
- **RevenueCat** (procesamiento de suscripciones)
- **Apple/Google** (pagos in-app, según política de cada tienda)

Estos proveedores acceden solo a lo necesario para su función y están sujetos a contratos de procesamiento de datos.

### 3.2 Clínicos vinculados (con TU consentimiento explícito)

Si vinculas tu cuenta con un clínico ATP (nutriólogo, médico funcional, coach), este puede ver:
- Perfil, historia clínica, labs, tests, biomarcadores
- Adherencia a tu plan (hábitos, suplementos, comidas)
- Notas clínicas que él/ella genere

**Lo que el clínico NUNCA ve:** tus conversaciones privadas con ARGOS.

Puedes desvincular al clínico en cualquier momento desde Configuración.

### 3.3 Comunicación legal

Cumpliremos requerimientos judiciales válidos, pero rechazaremos solicitudes excesivas o inadecuadas.

---

## 4. Retención de datos

- **Cuenta activa:** mantenemos tus datos mientras uses la app
- **Cuenta cancelada:** conservamos por 30 días para permitir restauración; después borrado permanente
- **Datos agregados anonimizados:** podemos retener indefinidamente para investigación
- **Logs de errores:** 90 días
- **Backups cifrados:** máximo 12 meses

---

## 5. Tus derechos

### 5.1 Bajo GDPR (usuarios UE)

Tienes derecho a:
- **Acceso:** ver qué datos tenemos sobre ti
- **Rectificación:** corregir datos inexactos
- **Supresión ("derecho al olvido"):** borrar tu cuenta y datos
- **Portabilidad:** descargar tus datos en formato estructurado (JSON)
- **Oposición:** oponerte a ciertos usos (analytics, marketing)
- **Restricción:** limitar cómo procesamos ciertos datos
- **Retirar consentimiento:** en cualquier momento

### 5.2 Bajo LFPDPP (México — derechos ARCO)

- **Acceso:** consultar tus datos
- **Rectificación:** corregir datos
- **Cancelación:** eliminar tu información
- **Oposición:** rechazar ciertos usos

### 5.3 Cómo ejercer tus derechos

- **En la app:** Configuración → Privacidad → "Descargar mis datos" o "Eliminar cuenta"
- **Por email:** privacidad@somosatp.com
- **Respuesta:** máximo 30 días naturales

---

## 6. Seguridad

Protegemos tus datos con:
- **Cifrado en tránsito** (HTTPS/TLS 1.2+)
- **Cifrado en reposo** (AES-256 en base de datos)
- **Row Level Security** en Supabase (cada usuario solo accede a SUS datos)
- **Chat ARGOS↔user cifrado** end-to-end o a nivel columna (roadmap)
- **Auditoría de accesos** internos
- **Autenticación multifactor** disponible
- **Sesiones que expiran** por inactividad

**Ningún sistema es 100% seguro.** Si detectamos una brecha te notificaremos en menos de 72 horas conforme a GDPR.

---

## 7. Datos de menores

ATP está diseñada para personas mayores de 18 años. NO recolectamos datos de menores de 13 años intencionalmente. Si tienes entre 13 y 17 años, requerimos consentimiento parental explícito.

Si descubrimos que hemos recolectado datos de un menor sin consentimiento, los eliminaremos.

---

## 8. Transferencias internacionales

Nuestros servidores están en Estados Unidos (Supabase us-east-1). Al usar ATP consientes la transferencia de tus datos a EE.UU. Todos nuestros proveedores cumplen con estándares equivalentes a GDPR (Cláusulas Contractuales Estándar).

---

## 9. Cookies y tecnologías similares

La app móvil NO usa cookies web. Los datos técnicos se guardan localmente en el dispositivo con AsyncStorage/SecureStore.

El sitio web somosatp.com puede usar cookies analíticas (aviso al entrar).

---

## 10. Aviso médico

**ATP NO reemplaza a un profesional de salud.** La información y sugerencias son con fines educativos y de rendimiento. Consulta a tu médico antes de cambiar tratamientos, medicamentos, dietas o programas de ejercicio.

Ver también: `Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md`.

---

## 11. Cambios a esta política

Actualizaremos esta política ocasionalmente. Los cambios materiales se notifican in-app con 30 días de anticipación. La versión actual está siempre en `somosatp.com/privacidad`.

---

## 12. Contacto

- **Email general:** contacto@somosatp.com
- **Privacidad:** privacidad@somosatp.com
- **Soporte:** soporte@somosatp.com
- **Sitio web:** somosatp.com

---

**Última actualización:** 2026-07-06 · Versión 1.0 · Pendiente revisión final

**Firmado por:**
- Enrique Zapata — Fundador ATP
- Mariana Doria, PhD — Co-Fundadora, Chief Science Officer
