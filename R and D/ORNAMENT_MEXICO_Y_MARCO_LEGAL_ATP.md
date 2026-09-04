# Ornament en México y cómo ATP se apega sin dispararse en el pie

Fecha: 4 de septiembre de 2026. Investigación con fuentes abiertas; cada afirmación tiene URL en la sección 10. Lo que no se pudo confirmar está marcado como [NO VERIFICADO]. Versión 2: revisada bajo principio de cuatro ojos (un agente investigó, otro verificó cada cita legal contra la fuente; las correcciones del revisor ya están integradas).

## 1. Resumen ejecutivo en 10 líneas

1. Ornament ya vende en México desde hace años como app de "Salud y fitness", facturada por una AG suiza, con un solo disclaimer corto y sin registro COFEPRIS. ATP puede operar con el mismo posicionamiento: bienestar y educación, no diagnóstico.
2. COFEPRIS no tiene norma específica para apps de bienestar. El software entra a regulación cuando su propósito declarado es médico (diagnosticar, tratar, prevenir enfermedad, monitoreo clínico). Lo que te mete o te saca es el copy y el "uso previsto", no la tecnología.
3. La nueva LFPDPPP está vigente desde el 21 de marzo de 2025. Los datos de salud y genéticos son sensibles: necesitas consentimiento expreso y por escrito (vale la firma electrónica o "cualquier mecanismo de autenticación", o sea un checkbox dentro de la cuenta autenticada) y un aviso de privacidad con seis elementos concretos. No hay registro obligatorio.
4. Se reformó la LFPC (DOF 12 de diciembre de 2025, vigente desde el 13): toda suscripción debe informar el cobro recurrente, avisar 5 días naturales antes de renovar y permitir cancelación inmediata. Apple y Google cubren el consentimiento al cobro y la cancelación desde la cuenta; el recordatorio de 5 días lo cubres tú con un push o correo automático (una tarde de trabajo). En Stripe armas todo tú.
5. Como persona física sí puedes vender en App Store, Google Play y Stripe. Ojo: Apple retiene ISR e IVA a personas físicas mexicanas bajo el régimen de plataformas tecnológicas, y ese régimen es incompatible con RESICO. Da de alta "Actividades Empresariales y Profesionales" (no RESICO) si vas a cobrar por las tiendas (regla 3.13.3 de la RMF).
6. Desde el 1 de enero de 2026 la retención de ISR por plataformas subió a 2.5% con RFC (20% sin RFC) e IVA 8% con RFC (16% sin RFC). Con RFC cargado en Apple pierdes poco; sin RFC pierdes hasta 36%.
7. Google Play acepta cuenta personal para apps "Health & Fitness"; exige cuenta de organización (con D-U-N-S) solo para apps "Medical" e investigación con humanos. Cuenta personal nueva = prueba cerrada con 12 testers por 14 días antes de producción.
8. En términos y condiciones puedes delimitar el servicio y redactar un tope de responsabilidad, pero no vale contra dolo (art. 2106 CCF) y frente a consumidores el art. 90 fr. II LFPC tiene por no puestas las cláusulas que liberen al proveedor de responsabilidad civil. El tope sirve poco ante PROFECO; lo que sí protege es delimitar bien qué es y qué no es ATP. Cláusula recomendada en la sección 7.
9. Genética y suplementos no requieren permiso para interpretarlos o sugerirlos de forma educativa; los límites son: consentimiento expreso para datos genéticos (LGS 103 Bis 3), no atribuir propiedades terapéuticas a suplementos (LGS 216) y no "prescribir".
10. Esta semana: (a) RFC en Actividades Empresariales y Profesionales con obligación de plataformas, (b) aviso de privacidad y T&C con el checklist de las secciones 6 y 7, (c) ajustar copy con la tabla de la sección 4, (d) llenar la Health apps declaration en Play Console y el privacy label en App Store Connect.

## 2. Ornament en México (hechos verificados, con URL de cada uno)

| Hecho | Detalle verificado | Fuente |
|---|---|---|
| Disponible en App Store MX | Sí. "Ornament: Entrenador de Salud", vendedor Ornament Health AG, categoría Salud y fitness, clasificación 16+, iOS 15.1+ | [1] |
| Precios en MXN (App Store MX) | AI Health Report $69 MXN; suscripción "Ornament Plus" en tramos de $89, $169, $229, $559, $999, $1,149, $1,409, $1,699 y $1,799 MXN según duración | [1] |
| Disponible en Google Play MX | Sí, 1 millón+ de descargas, calificación 1.9 estrellas (3,740+ reseñas), categoría Health & Fitness | [2] |
| Disclaimer en la ficha de App Store | "Ornament no es un dispositivo médico y no proporciona diagnósticos ni tratamientos médicos. Consulta siempre a un profesional de la salud cualificado para obtener asesoramiento médico." | [1] |
| Disclaimer en Google Play | "Ornament no es un servicio médico y no está destinado a realizar diagnósticos ni tratamientos. Consulte siempre a un profesional sanitario para obtener asesoramiento médico." | [2] |
| Disclaimer en web y términos | "Ornament is not a healthcare provider or a medical device. We don't offer any healthcare and medical services." y "The App does not provide any legal, medical, or psychological advice, diagnosis, or treatment." | [3][4] |
| Cómo se presenta | En la landing se llama "preventive medicine app made in Switzerland" y en el help center dice "Under no circumstances can Ornament ever replace a medical consultant or exam". El "health score" es "for information purposes only" | [4][5][6] |
| Entidad que factura | Ornament Health AG, Schindellegistrasse 3, 8808 Pfäffikon SZ, Suiza (CHE-483.076.327). Merchant para cobros web: Ornament Health LTD, Limassol, Chipre (HE 427824). Ley aplicable suiza, foro Lucerna. En tiendas cobra Apple o Google como intermediario | [3][4] |
| Datos de salud | Los clasifica como sensibles, base legal "legitimate interest and your consent". Servidores en Suiza/UE. Transferencias con Standard Contractual Clauses. Subencargados: Primer, Worldpay, Apple, Google, RevenueCat, Meta, TikTok, AppsFlyer, Freshchat. Borra cuentas inactivas 12 meses; eliminación en 30 días, respaldos hasta 90. DPO: dpo@ornament.health | [3] |
| Reembolsos | No reembolsable salvo periodo de reflexión de 14 días para consumidores de EEE/UK/Suiza. Renovación automática; para no pagar hay que cancelar al menos 24 h antes de que termine la prueba | [4] |
| Rangos de referencia | Ajusta rangos por sexo y edad del perfil; resultados preliminares al instante y "final results" con doble verificación | [5] |
| Tienda de laboratorios en México | [NO VERIFICADO] No encontré evidencia de venta de paquetes de laboratorio en México ni de convenio con Chopo, Salud Digna, Olab, Swiss Lab o Polanco. La ficha MX, los términos y la política de privacidad no mencionan México ni laboratorios. Los términos solo hablan de "Third Party Items" genéricos | [1][3][4] |

Lectura práctica: Ornament opera en México como app extranjera de bienestar, sin entidad mexicana, sin registro sanitario, con precios en MXN vía tiendas y un disclaimer de dos frases. Ese es el piso de mercado.

## 3. Dónde está ATP frente a la regulación

| Tema | ¿Aplica a ATP? | Qué hacer | Costo / tiempo | Fuente |
|---|---|---|---|---|
| COFEPRIS registro sanitario (SaMD) | (c) No aplica mientras el uso previsto sea bienestar y educación. Zona gris si el copy promete detectar o prevenir enfermedades | Mantener "uso previsto" de bienestar en ficha, landing, T&C y prompts de ARGOS. No usar la lista roja de la sección 4. Revisar cada 6 meses si COFEPRIS publica lineamiento específico | $0 hoy. Un registro Clase II como Medsi AI cuesta meses y consultoría regulatoria | [7][8][9][10] |
| Publicidad de salud (Reglamento LGS en materia de publicidad) | (b) Recomendable: aplicar principios de arts. 6 y 7 (no atribuir cualidades preventivas o terapéuticas, publicidad orientadora). El permiso del art. 79 es para servicios de salud, suplementos, medicamentos, equipo médico; ATP no anuncia ninguno como producto propio | En redes y landing: hablar de hábitos, energía, rendimiento y comprensión de resultados. Nada de "cura", "previene", "trata". Si alguna vez vendes suplemento propio, ese sí requiere permiso de publicidad | $0 | [11][12] |
| LFPDPPP 2025 (datos sensibles) | (a) Obligatorio ya | Aviso de privacidad integral y simplificado, consentimiento expreso por checkbox dentro de sesión autenticada, cláusula de transferencias internacionales, procedimiento ARCO gratuito, bitácora de consentimientos | Redactarlo tú con el checklist de la sección 6: 1 día. Revisión de abogado: 5,000 a 15,000 MXN [NO VERIFICADO precio de mercado] | [13][14][15][16] |
| Registro ante autoridad de datos | (c) No aplica. La ley no prevé registro | Nada | $0 | [13][14] |
| PROFECO suscripciones (art. 76 Bis VIII y IX, DOF 12 dic 2025) | (a) Obligatorio ya en web/Stripe; en tiendas Apple/Google cubren consentimiento y cancelación, el aviso de 5 días lo cubres tú | Pantalla de pago con monto total en MXN con IVA, periodicidad, fecha de cargo, consentimiento expreso, correo o push 5 días antes de renovar, botón de cancelar inmediato | 1 a 2 días de desarrollo. Stripe Billing envía recordatorios configurables; para tiendas, notificación propia disparada por RevenueCat o por las notificaciones de servidor de App Store/Play | [17][18][19] |
| Registro de contrato de adhesión en PROFECO | (c) No aplica. Solo se registran los que una NOM o PROFECO determinan (tiempos compartidos, sistemas de comercialización, etc.) | Nada, pero evita las cláusulas del art. 90 (modificación unilateral, liberación de responsabilidad, tribunales extranjeros) | $0 | [20] |
| Vender como persona física en tiendas | (a) Sí se puede | Apple: cuenta individual 99 USD/año. Google: cuenta personal 25 USD única, 12 testers por 14 días. Cargar RFC en ambas | 124 USD + 2 semanas de prueba cerrada | [21][22][23][24] |
| Régimen fiscal | (a) Obligatorio: Actividades Empresariales y Profesionales con sección de plataformas tecnológicas. RESICO es incompatible con ingresos por plataformas (regla 3.13.3 RMF) | Ver sección 5 | Contador freelance 1,500 a 3,000 MXN/mes [NO VERIFICADO precio] | [25][26][27] |
| App Store 1.4.1, 5.1.1, 5.1.3 | (a) Obligatorio al publicar | Recordatorio de consultar médico dentro de la app, política de privacidad en metadata y en la app, no usar datos de salud para publicidad, declarar datos de salud en privacy label | Copy y configuración: medio día | [28] |
| Google Play Health Content and Services | (a) Obligatorio al publicar | Disclaimer literal "no es un dispositivo médico y no diagnostica, trata, cura ni previene ninguna condición" en la descripción de la ficha, Health apps declaration en Play Console, recordar consultar profesional | Medio día | [29][30] |
| Responsabilidad civil | (b) Recomendable pronto | Delimitar el servicio y redactar el tope de responsabilidad "en la medida permitida por la ley" (sección 7), sabiendo que frente a consumidores pesa poco | Incluida en T&C | [31][20] |
| Genética (LGS 103 Bis) | (a) Aplica a Elite | Consentimiento expreso separado, confidencialidad, derecho a no saber | Un párrafo en el contrato Elite | [32] |
| Suplementos (LGS 215, 216) | (b) Aplica al copy de ARGOS | Sugerir, no prescribir; sin propiedades terapéuticas; leyenda "los suplementos no son medicamentos" | Ajuste de prompts | [33][34] |
| Ayuno | (c) No hay regulación específica encontrada | Advertencias para embarazo, diabetes, trastornos alimentarios, menores | Ajuste de prompts | [35] |

## 4. Copy seguro: palabras que usar y palabras que evitar

El criterio que usa COFEPRIS para atraer un software es que "interviene directamente en el diagnóstico o tratamiento" [7]. La NOM-241-SSA1-2025 define SaMD como "software utilizado con uno o más propósitos médicos" [9]. Medsi AI, primer SaMD Clase II en México (28 de mayo de 2025), se registró precisamente porque promete "detectar signos sutiles de condiciones crónicas como diabetes e hipertensión" [10]. Ese es el ejemplo de lo que NO decir.

| Usar (verde) | Evitar (rojo) | Por qué |
|---|---|---|
| "Entiende tus laboratorios" | "Diagnóstico", "diagnosticamos" | Propósito médico: te mete a SaMD y a "servicios de salud" del art. 79 del Reglamento de publicidad |
| "Marcadores fuera del rango de referencia del laboratorio" | "Tienes anemia / prediabetes / hipotiroidismo" | Nombrar la enfermedad a partir del marcador es diagnosticar |
| "Edad ATP: estimación basada en tus marcadores, con fines informativos" | "Edad biológica clínicamente validada", "predice tu riesgo de enfermedad" | Apple 1.4.1 exige metodología validada para claims de precisión; COFEPRIS lo lee como propósito médico |
| "Sugerencias de hábitos, alimentación y rutina" | "Tratamiento", "plan terapéutico", "prescripción", "receta médica" | Tratar es propósito médico y LGS 216 prohíbe atribuir propiedades terapéuticas |
| "Optimiza energía, rendimiento, recuperación, sueño" | "Previene la diabetes", "cura", "revierte la enfermedad" | Arts. 6, 21 y 22 del Reglamento de publicidad |
| "Coach de IA (ARGOS). No sustituye a tu médico" | "Tu médico de IA", "nutriólogo virtual", "doctor" | Uso de títulos profesionales sin cédula es tema de ejercicio profesional; además dispara revisión en tiendas |
| "Puedes considerar hablar con tu médico sobre X" | "Toma 5,000 UI de vitamina D diario" (como orden) | Mercado: Function y Superpower usan "general educational guidance" |
| "Referencias: rangos del laboratorio que emitió tu estudio" | "Rangos óptimos médicos de ATP" | Si los rangos son tuyos y clínicos, asumes el juicio médico |
| "Herramienta de bienestar y educación" | "App médica", categoría "Medical" en tiendas | En Google Play "Medical" exige cuenta de organización, y a las apps reguladas como dispositivo médico les pueden pedir prueba de aprobación [22][30] |
| "Lectura automatizada por IA; verifica los valores contra tu PDF" | "Lectura 100% exacta" | Apple 1.4.1 rechaza claims de exactitud no validables |
| "Elite: acompañamiento personalizado de estilo de vida con base en tus estudios" | "Consulta médica", "diagnóstico personalizado" | Elite lo entrega Enrique como coach, no como profesional de la salud con cédula |

Nota sobre Elite: la palabra "diagnóstico personalizado" que hoy usa la descripción interna hay que cambiarla a "evaluación personalizada" o "análisis integral de estilo de vida". Es el cambio de copy de mayor rendimiento de todo el informe.

## 5. Vender como persona física: checklist en orden

1. **RFC y régimen.** Inscripción en línea en el SAT como persona física. Régimen: "Actividades Empresariales y Profesionales" y activar la obligación de "ingresos a través de plataformas tecnológicas". No elijas RESICO: la regla 3.13.3 de la RMF (vigente en 2026; era la 3.13.4 en 2022), emitida para efectos del art. 113-E LISR, y las preguntas frecuentes del SAT excluyen del RESICO a quien tenga ingresos por plataformas tecnológicas, aunque sean solo una parte de sus ingresos [25][26][27]. Costo: $0. Tiempo: 1 día si ya tienes e.firma; si no, cita en oficina del SAT.
2. **e.firma y CSD.** Necesarios para emitir CFDI 4.0. Costo $0.
3. **Cuenta bancaria con CLABE a tu nombre.** Apple y Google pagan por transferencia; Stripe deposita en cuenta mexicana.
4. **Apple Developer Program (individual).** 99 USD/año; nombre legal, dirección física, 2FA [21]. En el Anexo C sección 8 (México) Apple dice que aplicará IVA a su comisión y emitirá factura, y que "aplicará la tasa de retención del impuesto sobre la renta aplicable a las personas físicas" y pagará lo retenido al SAT; debes "proporcionar a Apple una copia del registro" de tu RFC [23]. Con RFC: retención ISR 2.5% e IVA 8%. Sin RFC: 20% y 16% (vigente desde 1 de enero de 2026, DOF 7 de noviembre de 2025) [24][36]. La retención de IVA del 8% está en la LIVA (art. 18-J), no en el documento de Apple: confírmala en la primera constancia de retenciones que te emita Apple. Apple Services LATAM LLC actúa como agente para México [23].
5. **Google Play Console (personal).** 25 USD única vez. Cuenta personal es válida para Health & Fitness; solo apps "Medical" y de investigación con humanos exigen organización con D-U-N-S [22][30]. Las cuentas personales creadas después del 13 de noviembre de 2023 deben pasar prueba cerrada con 12 testers opt-in continuos por 14 días antes de pedir acceso a producción [37]. Retención fiscal de Google para desarrolladores en México: [NO VERIFICADO]; la página de WHT de Google no lista a México [38]. Asume el mismo esquema que Apple y confírmalo con tu contador en el primer pago.
6. **Stripe México.** Tarifas: 3.6% + 3 MXN + IVA por tarjeta nacional, +0.5% internacional, 2% conversión, OXXO/SPEI 4% + 3 MXN, Billing 0.7% del volumen [39]. Stripe exige subir la Constancia de Situación Fiscal en PDF y que nombre y RFC coincidan; sin eso no emite tus facturas de IVA mensuales [40]. Aceptación de persona física: sí. El Contrato de Servicios de Stripe México define al usuario como "una persona física o moral" y solo pide mayoría de edad [46]. El requisito documental es la constancia fiscal, que una persona física con actividad empresarial sí tiene. Todas las comisiones de Stripe llevan IVA encima. Stripe no es "plataforma tecnológica" retenedora: aquí tú emites el CFDI al cliente y pagas ISR e IVA completos.
7. **CFDI 4.0.** Ventas por Stripe y Elite: emites CFDI de ingreso (público en general si no te piden factura). Ventas por tiendas: conservas las constancias de retención de la plataforma y declaras el ingreso; el CFDI "por los ingresos que no pasen a través de la plataforma" sigue siendo tu obligación [26].
8. **Declaraciones mensuales** de ISR e IVA acreditando retenciones. Si tus ingresos por plataformas son menores a 300,000 MXN anuales y solo tienes ingresos de plataformas existe la opción de retención definitiva, pero como también cobrarás Elite y Stripe, esa opción no te sirve [25].
9. **Precio en pantalla.** Art. 7 Bis LFPC: monto total a pagar, con impuestos, "de forma notoria y visible" [19]. En tiendas el precio ya incluye IVA; en Stripe muestra "$X MXN IVA incluido".
10. **Elite (40,000 MXN).** Contrato de prestación de servicios de coaching firmado electrónicamente, CFDI, y el consentimiento genético separado (sección 8). Si el cliente paga con tarjeta vía Stripe, mismas reglas.

## 6. Aviso de privacidad y consentimiento: qué debe tener ATP

Base: LFPDPPP publicada en DOF el 20 de marzo de 2025, vigente desde el 21 de marzo de 2025; autoridad: Secretaría Anticorrupción y Buen Gobierno (el INAI desapareció) [13][14]. El reglamento nuevo sigue sin publicarse al 2026; aplica supletoriamente el de 2011 en lo que no contradiga la ley [16]. No hay registro de bases de datos.

Checklist del aviso integral (art. 15 según el texto de Diputados [15]):

- [ ] Identidad y domicilio del responsable: "Enrique [apellidos], persona física con actividad empresarial, RFC ..., domicilio ...". Lo típico que falta: el domicilio físico.
- [ ] Datos que se tratan, marcando los sensibles: resultados de laboratorio, marcadores, peso, edad, hábitos, y en Elite información genética. Lo típico que falta: no separar los sensibles.
- [ ] Finalidades, distinguiendo las que requieren consentimiento: primarias (extraer marcadores, calcular Edad ATP, coaching) y secundarias (mejorar modelos, marketing). Lo típico que falta: mezclar "mejorar el producto" con lo esencial.
- [ ] Opciones para limitar uso o divulgación (correo de baja de comunicaciones).
- [ ] Mecanismo ARCO: correo, plazo, gratuito.
- [ ] Procedimiento para comunicar cambios (correo y aviso en app).
- [ ] Cláusula de transferencias y encargados aunque la ley nueva ya no la exija textualmente; el reglamento supletorio sí [14][15]: Supabase (hosting en EE. UU.), Anthropic (IA; sus datos retenidos "never used for model training without your express permission", ZDR bajo solicitud) [41], Google (OCR/IA si aplica), Apple, Google Play, Stripe, RevenueCat si la usas. Cita "cláusulas contractuales / DPA" como garantía, igual que Ornament.
- [ ] Plazo de conservación y borrado (copiar el modelo Ornament: 30 días tras solicitud, respaldos hasta 90) [3].
- [ ] Menores: declarar que el servicio es para mayores de 18.

Consentimiento para datos sensibles (art. 8 según [15]): "expreso y por escrito ... a través de su firma autógrafa, firma electrónica, o cualquier mecanismo de autenticación que al efecto se establezca". Implementación: checkbox no premarcado dentro de la sesión autenticada, texto "Acepto el tratamiento de mis datos de salud conforme al aviso de privacidad", y guardar en Supabase user_id, versión del aviso, fecha, hora e IP. Aviso simplificado en el onboarding con link al integral [14].

Multas: arts. 59 y 60 del texto de Diputados: 100 a 160,000 UMA y 200 a 320,000 UMA, y con datos sensibles "podrán incrementarse hasta por dos veces" [15]. En la práctica, el INAI impuso en 2023 46.8 millones de pesos en 74 procedimientos, concentrados en financieras, medios y retail; entre las infracciones más comunes están tratar datos en contra de los principios de la ley y omitir elementos del aviso de privacidad [42]. Para una app de un fundador el escenario realista es un requerimiento para corregir el aviso, no una multa millonaria, siempre que tengas aviso y consentimiento.

## 7. Términos y condiciones: cláusulas mínimas

1. **Naturaleza del servicio.** "ATP es una herramienta de bienestar y educación. No es un servicio médico, no es un dispositivo médico, no diagnostica, trata, cura ni previene enfermedades y no sustituye la consulta con un profesional de la salud. La Edad ATP y las lecturas de marcadores son estimaciones informativas." Esto cubre a la vez el disclaimer que exige Google Play [29] y el recordatorio de Apple 1.4.1 [28].
2. **IA.** "ARGOS es un asistente automatizado; puede cometer errores de lectura o interpretación. Verifica los valores contra tu documento original y consulta a tu médico antes de tomar decisiones."
3. **Suscripción (web/Stripe).** Precio total en MXN con IVA, periodicidad, fecha del cargo, consentimiento expreso al cobro recurrente, aviso 5 días naturales antes de cada renovación, cancelación inmediata desde la app o un link, sin penalización [17][18]. En tiendas remite a la gestión de Apple/Google para cancelar, pero el aviso previo de 5 días mándalo tú (push o correo) porque Apple solo documenta aviso previo ante aumentos de precio, no antes de cada renovación mensual [NO VERIFICADO que Apple o Google lo manden].
4. **Reembolsos.** Compras en tiendas: según política de Apple/Google. Web: define tu regla (Ornament: sin reembolso salvo periodo de reflexión de 14 días en Europa). Sugerencia de mercado para México: 7 días de garantía de satisfacción en el primer pago; cuesta poco y desarma quejas ante PROFECO.
5. **Elite.** Alcance ("evaluación personalizada de estilo de vida"), entregables, calendario, política de cancelación proporcional, y que no incluye atención médica.
6. **Límite de responsabilidad.** Redacción: "En la medida permitida por la ley, la responsabilidad total de ATP frente al usuario se limita al monto pagado por el usuario en los 12 meses anteriores al hecho. Esta limitación no aplica a la responsabilidad por dolo, ni a los casos en que la ley prohíba limitarla." Fundamento y límite práctico: el art. 2117 CCF permite regular la responsabilidad por convenio y el 2106 hace nula la renuncia por dolo [31]; pero el art. 90 fr. II LFPC tiene por no puestas, en contratos de adhesión, las cláusulas que liberen al proveedor de su responsabilidad civil, y la fr. VI las que sometan al consumidor a tribunales extranjeros [20]. Un tope monetario puede leerse como liberación parcial, así que redáctalo "en la medida permitida por la ley", no lo vendas como blindaje y asume que frente a PROFECO pesará poco. Su valor real está en las cláusulas 1 y 2 (qué es y qué no es ATP). Superpower usa un tope similar ("the greater of $100 or the total amount paid ... in the six months preceding") [43].
7. **Jurisdicción.** No pactes tribunales extranjeros ni renuncia a la ley mexicana (art. 90 fr. VI LFPC); di "leyes de los Estados Unidos Mexicanos" y deja PROFECO como vía conciliatoria.
8. **Uso aceptable, propiedad intelectual, cuenta, terminación, edad mínima 18.**
9. **Sin registro en PROFECO**: solo se registran contratos que la ley o una NOM exijan (arts. 85 a 87) [20].

## 8. Genética, suplementos y ayuno: cómo redactarlo

**Genética (solo Elite).** La LGS regula el genoma humano en los arts. 103 Bis a 103 Bis 7: todo estudio requiere "aceptación expresa de la persona sujeta al mismo" (103 Bis 3), hay que resguardar la confidencialidad de los datos genéticos, la persona puede decidir "que se le informe o no de los resultados" (103 Bis 4) y se prohíbe discriminar por características genéticas (103 Bis 2) [32]. La LFPDPPP lista "información genética" como dato sensible [15]. El laboratorio que hace la prueba es quien necesita licencia sanitaria; Enrique interpreta un reporte que ya existe. Redacción para el contrato Elite: "Acepto de forma expresa que ATP reciba y analice mi información genética exclusivamente para elaborar recomendaciones de estilo de vida. Entiendo que puedo pedir que no se me informen resultados específicos, que mis datos genéticos no se compartirán con terceros ni se usarán para fines distintos, y que esta interpretación es educativa y no constituye asesoría genética clínica." Guarda el consentimiento firmado (firma electrónica) aparte del aviso general.

**Suplementos.** LGS 215 fr. V define suplemento alimenticio y el 216 exige que los productos que sugieran propiedades terapéuticas lleven "Este producto no es un medicamento" [33]. El Reglamento de publicidad (arts. 21, 22) prohíbe afirmar que un suplemento previene, alivia, trata o cura una enfermedad y el art. 79 exige permiso de publicidad a quien anuncia suplementos como producto [11][12][34]. ARGOS no anuncia un producto: sugiere categorías. Reglas para los prompts: (1) hablar de "puedes considerar" y "rangos comúnmente usados", nunca "toma X mg" en tono de orden; (2) no vincular el suplemento con enfermedades ("para tu hipotiroidismo"), sí con el marcador y el hábito ("tu vitamina D está por debajo del rango de referencia; exposición solar, alimentos y un suplemento son opciones que puedes platicar con tu médico"); (3) leyenda fija al final de cada sugerencia: "Los suplementos no son medicamentos. Consulta a tu médico antes de iniciar cualquier suplemento, sobre todo si tomas medicamentos, estás embarazada o tienes una condición diagnosticada"; (4) Google Play prohíbe promover sustancias no aprobadas o suplementos con ingredientes peligrosos [29]: lista negra en el prompt (efedrina, yohimbina, DMAA, SARMs, dosis megaterapéuticas). Si algún día vendes o recibes comisión por un suplemento concreto, entra el permiso de publicidad de COFEPRIS y la etiqueta del fabricante.

**Ayuno.** No encontré norma, NOM ni criterio de COFEPRIS que regule sugerir ventanas de ayuno a adultos. La única señal oficial es un comunicado del IMSS (agosto 2023) advirtiendo riesgos de practicarlo sin asesoría profesional [35]. Conclusión: (c) no aplica regulación; práctica recomendada: bloquear sugerencias de ayuno para menores, embarazo o lactancia, diabetes tipo 1 o con insulina, antecedentes de trastornos alimentarios, y limitar las ventanas sugeridas a protocolos comunes (12:12 a 16:8) con la frase "consulta a tu médico si tomas medicamentos".

## 9. Cuándo sí conviene constituir empresa y por qué

No hay urgencia regulatoria: nada de lo anterior exige persona moral. Apple y Google aceptan individuos; PROFECO, COFEPRIS y la LFPDPPP aplican igual a personas físicas. Conviene constituir (SAS es la vía barata, en línea y sin notario, aunque no verifiqué costos actuales [NO VERIFICADO]) cuando ocurra cualquiera de estas cuatro cosas: (1) quieres separar patrimonio personal de reclamaciones, sobre todo por Elite, donde entregas un servicio personal de alto ticket; (2) vas a publicar una app "Medical" o buscar registro COFEPRIS como SaMD, porque Google exige cuenta de organización con D-U-N-S y COFEPRIS pide establecimiento [22][30]; (3) entra inversión, socio o cliente corporativo que exija facturar a una sociedad; (4) los ingresos por plataformas crecen tanto que la carga de ISR de persona física en régimen general supera lo que pagarías con planeación en persona moral. Mientras tanto, la persona física con Actividades Empresariales y Profesionales, RFC cargado en las tiendas y contador mensual es exactamente lo que hace la mayoría de desarrolladores independientes en México.

## 10. Fuentes (URLs abiertas)

1. https://apps.apple.com/mx/app/ornament-entrenador-de-salud/id1453537030
2. https://play.google.com/store/apps/details?id=com.ornament.monitor&hl=es-MX&gl=MX
3. https://ornament.health/en/legals/privacy-policies
4. https://ornament.health/legals/terms-of-use
5. https://ornament.health/en/help/how-it-works
6. https://ornament.health/en/help/about y https://ornament.health/en/app
7. https://enlacebiomedico.com/el-software-como-dispositivo-medico-ya-lo-regula-la-cofepris/
8. https://saluddigital.com/big-data/la-regulacion-de-software-y-aplicaciones-medicas-y-los-avances-de-la-cofepris-en-mexico/
9. https://dof.gob.mx/normasOficiales/9497/salud/salud.html (NOM-241-SSA1-2025, definición 3.118 de SaMD)
10. https://www.saludiario.com/medsi-ai-primer-samd-clase-ii-aprobado-para-salud-preventiva-en-el-hemisferio-occidental/
11. https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LGS_MP.pdf
12. https://thefoodtech.com/normatividad-y-certificaciones/suplementos-alimenticios-y-publicidad-regulatoria/
13. https://www.garrigues.com/es_ES/noticia/mexico-nueva-ley-federal-proteccion-datos-personales-posesion-particulares-introduce
14. https://www.amda.mx/wp-content/uploads/2025/04/anexo%201%20de%20circular%2023%20de%202025.pdf
15. https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
16. https://sharkit.mx/nueva-lfpdppp-reglamento-pendiente/ y https://www.legiscope.com/blog/aviso-privacidad-mexico-lfpdppp.html
17. https://www.gtlaw.com/en/insights/2025/12/reformas-a-la-ley-federal-de-proteccion-al-consumidor
18. https://www.arochilindner.com/es/al-newsletter-reforma-a-la-ley-federal-de-proteccion-al-consumidor-cancelacion-de-suscripciones-y-cargos-recurrentes/
19. https://mexico.justia.com/federales/leyes/ley-federal-de-proteccion-al-consumidor/capitulo-ii
20. https://www.poderjudicialqro.gob.mx/biblio/leeDoc.php?cual=20185 (texto vigente de la LFPC, art. 90; sustituye a la página de Justia que no muestra el artículo)
21. https://developer.apple.com/programs/enroll/
22. https://support.google.com/googleplay/android-developer/answer/13634885?hl=en
23. https://developer-mdn.apple.com/support/downloads/terms/exhibits/Exhibits-to-Schedule-2-and-3-20250821-Spanish.pdf
24. https://www.ascg.mx/medios/reforma-fiscal-2026-nuevas-retenciones-para-vendedores-en-plataformas/
25. https://idconline.mx/fiscal-contable/2022/02/09/resico-e-ingresos-por-plataformas-pueden-combinarse
26. https://tesio.com.mx/blog/plataformas-digitales-sat-2026-guia-completa/
27. https://www.veritas.org.mx/Impuestos/Fiscal/declaracion-anual-de-personas-fisicas-resico-y-plataformas-digitales y https://fiscaly.mx/blog/resico-personas-fisicas-2026-guia-completa
28. https://developer.apple.com/app-store/review/guidelines/
29. https://support.google.com/googleplay/android-developer/answer/16679511?hl=en
30. https://support.google.com/googleplay/android-developer/answer/13996367?hl=en y https://support.google.com/googleplay/android-developer/answer/10788890?hl=en
31. https://mexico.justia.com/federales/codigos/codigo-civil-federal/libro-cuarto/primera-parte/titulo-cuarto/i/incumplimiento-de-las-obligaciones/capitulo-i
32. https://mexico.justia.com/federales/leyes/ley-general-de-salud/titulo-quinto-bis/capitulo-unico
33. https://www.gob.mx/cofepris/acciones-y-programas/marco-juridico-para-suplementos-alimenticios
34. https://mexico.justia.com/federales/leyes/ley-general-de-salud/titulo-decimo-segundo/capitulo-viii/ (art. 262 LGS)
35. https://www.imss.gob.mx/prensa/archivo/202308/410
36. https://kpmg.com/us/en/taxnewsflash/news/2025/11/mexico-tax-provisions-digital-platforms-2026-tax-reform.html y https://www.ey.com/es_mx/technical/tax/boletines-fiscales/propuestas-isr-e-iva-sector-plataformas-digitales
37. https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
38. https://support.google.com/googleplay/android-developer/answer/9384608?hl=es-419
39. https://stripe.com/mx/pricing
40. https://support.stripe.com/questions/accounts-from-mexico-update-your-tax-information
41. https://platform.claude.com/docs/en/manage-claude/api-and-data-retention y https://supabase.com/docs/guides/security/hipaa-compliance
42. https://www.proceso.com.mx/nacional/2024/1/7/inai-logro-multas-por-mas-de-46-mdp-por-infringir-ley-de-proteccion-de-datos-320498.html y https://kpmg.com/mx/es/tendencias/2025/01/flash-monto-de-multas-de-profeco-en-2025.html
43. https://superpower.com/terms y https://www.functionhealth.com/terms-of-service
44. https://support.google.com/googleplay/android-developer/answer/15931464?hl=en (Health Connect, 5 de marzo de 2025)
45. https://myappmonitor.com/blog/google-play-health-apps-update-2026-requirements (fuente secundaria; el requisito de cuenta de organización se confirmó en [22] y [30], el resto de esa nota queda [NO VERIFICADO])
46. https://stripe.com/mx/ssa (Contrato de Servicios de Stripe México: usuario "persona física o moral")
47. https://developer.apple.com/news/?id=tpgp89cl (Apple: aviso previo solo documentado ante aumentos de precio)
48. https://www.varaduz.com/en/blog/publicaciones-4/regimen-de-plataformas-tecnologicas-y-resico-son-compatibles-15 y https://www.profitosapp.com/blog/resico-vendedores-mercado-libre-mexico-2026 (regla 3.13.3 RMF)

Pendientes marcados [NO VERIFICADO]: tienda de laboratorios de Ornament en México; retención fiscal de Google Play a desarrolladores mexicanos; que Apple retenga el 8% de IVA además del ISR (confirmar en la primera constancia); que Apple o Google manden aviso antes de cada renovación mensual; valor de la UMA 2026; costos de abogado, contador y SAS.
