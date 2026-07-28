# -*- coding: utf-8 -*-
import json,html,collections
d=json.load(open('portal.json',encoding='utf-8'))
PAR={'western_academic':'Occidental académica','functional_independent':'Divulgación funcional','tcm':'Medicina tradicional china','ayurveda':'Ayurveda','soviet_sports':'Escuela soviética','indian_academic':'Académica india','chinese_academic':'Académica china','russian_academic':'Académica rusa','latam_academic':'Académica latinoamericana','japanese_academic':'Académica japonesa','korean_academic':'Académica coreana','mechanistic':'Mecanismo','traditional_documented':'Tradición documentada'}
ST={'primary_study':'Estudio primario','review_meta':'Revisión / meta-análisis','tradition':'Tradición','secondary_divulgation':'Divulgación secundaria','mechanism':'Mecanismo','authority_body':'Postura institucional'}
NW={'indian_academic','chinese_academic','russian_academic','latam_academic','japanese_academic','korean_academic','soviet_sports'}
LVL={'N1':'Convergencia de tres o más paradigmas independientes.','N2':'Evidencia occidental sólida e independiente de la industria, más apoyo funcional o de tradición.','N3':'Un paradigma sólido más dos convergentes, aunque falte un ensayo aleatorizado.','N4':'Mecanismo biológico plausible más observación clínica, sin evidencia de daño.'}
RET=[("No publicamos una hora de autofagia","2026-07-27","Toda la industria publica una gráfica que dice que la autofagia empieza en la hora 16. No está establecido en humanos: el flujo autofágico casi no se puede medir en personas vivas y las cifras que circulan vienen de animales. Retiramos el número. En su lugar describimos las condiciones metabólicas de entrada y usamos como proxy medible la glucemia y la relación glucosa-cetonas, que sí se puede medir en sangre."),
("Retiramos seis referencias que no existen","2026-07-27","Auditamos nuestras propias citas de investigación soviética. De diecisiete, solo dos resultaron ser investigación soviética verificable. Seis referenciaban trabajos que no existen en ningún catálogo bibliográfico: dos atribuidas a un autor cuyo homónimo real publicaba parapsicología, una a un almirante y oceanógrafo sin relación con la fisiología, y una a un investigador inexistente. El aval institucional que invocaban cuatro de ellas no tiene ninguna publicación localizable sobre el tema. Las eliminamos. Otras seis se degradaron a tradición documentada, que es lo que realmente son."),
("Dejamos de emitir dosis de suplementos","2026-07-27","Nuestro catálogo declaraba que ATP no recomienda suplementos, y al mismo tiempo nuestros protocolos de arranque emitían dosis concretas. Era una contradicción interna y una exposición regulatoria. Barrimos todas las dosis. Lo que el usuario registra se queda: eso es registro, no prescripción."),
("Suavizamos veintiún afirmaciones infladas","2026-07-27","Superlativos que ningún estudio sostiene — «el predictor número uno», «la de mejor evidencia» —, cifras exactas sin cita, y verbos terapéuticos donde el respaldo era asociativo. El hallazgo incómodo no fue que inventáramos números: fue que los habíamos detectado meses antes y no los habíamos aplicado."),
("Un separador de dedos no previene un juanete","2026-07-27","Afirmábamos que prevenía el hallux valgus. No hay respaldo primario para eso, y prometer mover un ángulo estructural es la afirmación de mayor exposición del catálogo. Lo reescribimos como lo que realmente es: el efecto viene de caminar descalzo con ellos puestos para reactivar la musculatura intrínseca del pie, y requiere además cambiar el calzado. Como estímulo aislado no basta."),
("Retiramos un mecanismo de dopamina que no existe","2026-07-27","Decíamos que un día sin pantallas «restaura la dopamina basal». Las fuentes que citábamos eran libros de divulgación que hablan de atención y de ánimo, no de dopamina, y no hay ningún estudio humano que mida eso. Nos quedamos con los beneficios conductuales que sí se sostienen.")]
NOSE=[("La hora exacta en que empieza la autofagia","No se puede medir de forma fiable en humanos vivos. Cualquier cifra que circule viene de modelos animales o de extrapolación."),
("Si el reloj de órganos de la medicina tradicional china corresponde a algo medible","La cronobiología moderna confirma que la fisiología varía según la hora del día. El mapeo específico de un órgano a una franja horaria no ha sido validado por investigación moderna, incluida la investigación china. Recomendamos dormir temprano por la epidemiología, no por el reloj de órganos."),
("Cuánto del efecto del baño de bosque es el bosque y cuánto es la expectativa","Los propios autores de la revisión de cortisol advierten que el efecto placebo anticipado puede tener un papel importante. Y el estudio japonés con mayor número de participantes no encuentra efecto crónico sobre la presión arterial."),
("Si el aceite de coco aporta algo más que el enjuague","El único ensayo que comparó el enjuague con aceite contra hacer buches con agua destilada no encontró diferencia entre los dos grupos. Sugiere que el efecto es mecánico, no del aceite."),
("Si el infrarrojo lejano hace algo que no haga el calor común","En el único ensayo aleatorizado en personas sanas resultó equivalente a un paquete caliente convencional. Y no eleva la temperatura interna, que es de lo que dependen varios de los mecanismos que se le atribuyen."),
("Si el frío después de entrenar ayuda o estorba","Reduce la percepción de dolor, pero al protocolo exacto no baja la inflamación más que la recuperación activa, y hay evidencia consistente de que atenúa las ganancias de masa y fuerza si se usa justo después de entrenar fuerza."),
("Cuánta de la ciencia que no se publicó en inglés nos estamos perdiendo","Aproximadamente el noventa y cinco por ciento de la literatura biomédica indexada está en inglés. Estamos incorporando literatura japonesa, india, china, coreana y latinoamericana, y aun así nuestra bibliografía sigue siendo mayoritariamente occidental. Lo declaramos porque es una limitación real de nuestro expediente, no una virtud.")]
e=html.escape
def chips(x):
    o=''
    for s in x['srcs']:
        pass
    return o
tot=sum(len(x['srcs']) for x in d); url=sum(1 for x in d for y in x['srcs'] if y['u'])
nw=sum(1 for x in d for y in x['srcs'] if y['p'] in NW)
data=json.dumps(d,ensure_ascii=False)
meta={'tot':tot,'url':url,'nw':nw,'iv':len(d),'par':len({y['p'] for x in d for y in x['srcs']}),
 'ind':sum(1 for x in d for y in x['srcs'] if y['f']),'pc':sum(1 for x in d for y in x['srcs'] if y['pc'])}
H=f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ATP Science · Cómo sabemos lo que sabemos</title>
<meta name="description" content="La biblioteca de evidencia de ATP. Cada afirmación con su expediente: nivel de evidencia, paradigma de origen, financiamiento declarado y lo que no sabemos.">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
:root{{--bg:#0A0A0A;--card:#121212;--cl:#1A1A1A;--bd:#1F1F1F;--tx:#FFF;--s:#888;--m:#555;--lime:#A8E02A;--teal:#1ABC9C;--amber:#EFD54F;--rose:#fb7185;--blue:#5B9BD5;--violet:#7F77DD}}
html{{scroll-behavior:smooth}}
body{{background:var(--bg);color:var(--tx);font:16px/1.65 ui-sans-serif,-apple-system,"Segoe UI",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
a{{color:inherit}}
.wrap{{max-width:1180px;margin:0 auto;padding:0 24px}}
header{{border-bottom:1px solid var(--bd);position:sticky;top:0;background:rgba(10,10,10,.93);backdrop-filter:blur(14px);z-index:50}}
.hd{{display:flex;align-items:center;gap:28px;height:62px}}
.logo{{font-weight:700;letter-spacing:-.02em;font-size:17px;white-space:nowrap}}
.logo b{{color:var(--lime)}}
nav{{display:flex;gap:4px;flex-wrap:wrap;margin-left:auto}}
nav button{{background:none;border:0;color:var(--s);font:inherit;font-size:14px;padding:7px 13px;border-radius:7px;cursor:pointer}}
nav button:hover{{color:var(--tx);background:var(--cl)}}
nav button.on{{color:var(--bg);background:var(--lime);font-weight:600}}
.hero{{padding:82px 0 54px;border-bottom:1px solid var(--bd)}}
h1{{font-size:clamp(31px,5.2vw,50px);line-height:1.08;letter-spacing:-.035em;font-weight:700;max-width:19ch}}
.lede{{color:var(--s);font-size:18px;max-width:66ch;margin-top:22px;line-height:1.62}}
.lede strong{{color:var(--tx);font-weight:600}}
.stats{{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:1px;background:var(--bd);border:1px solid var(--bd);border-radius:12px;overflow:hidden;margin-top:46px}}
.stat{{background:var(--card);padding:20px 18px}}
.stat b{{display:block;font-size:29px;font-weight:700;letter-spacing:-.03em;color:var(--lime)}}
.stat span{{font-size:12.5px;color:var(--s);line-height:1.42;display:block;margin-top:3px}}
section{{padding:52px 0}}
h2{{font-size:26px;letter-spacing:-.025em;font-weight:700;margin-bottom:9px}}
h3{{font-size:18px;letter-spacing:-.015em;font-weight:650;margin-bottom:7px}}
.sub{{color:var(--s);font-size:15px;max-width:70ch;margin-bottom:30px;line-height:1.6}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:13px}}
.card{{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:17px;cursor:pointer;transition:border-color .14s,transform .14s}}
.card:hover{{border-color:#333;transform:translateY(-1px)}}
.card h3{{margin-bottom:6px;font-size:15.5px}}
.card p{{color:var(--s);font-size:13.4px;line-height:1.55}}
.tag{{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:3px 8px;border-radius:20px;border:1px solid var(--bd);color:var(--s);white-space:nowrap;line-height:1.5}}
.lv{{font-weight:700;font-size:11px;padding:3px 9px;border-radius:20px;letter-spacing:.04em}}
.N1{{background:rgba(168,224,42,.14);color:var(--lime);border:1px solid rgba(168,224,42,.3)}}
.N2{{background:rgba(26,188,156,.13);color:var(--teal);border:1px solid rgba(26,188,156,.3)}}
.N3{{background:rgba(239,213,79,.12);color:var(--amber);border:1px solid rgba(239,213,79,.28)}}
.N4{{background:#1A1A1A;color:var(--s);border:1px solid var(--bd)}}
.nw{{background:rgba(127,119,221,.15);color:#a49dff;border-color:rgba(127,119,221,.32)}}
.ind{{background:rgba(251,113,133,.13);color:var(--rose);border-color:rgba(251,113,133,.32)}}
.auth{{background:rgba(239,159,39,.13);color:#EF9F27;border-color:rgba(239,159,39,.32)}}
.rev{{background:rgba(239,213,79,.09);border:1px solid rgba(239,213,79,.3);border-radius:10px;padding:14px 16px;margin:16px 0;font-size:14.2px;color:#e8d99a;line-height:1.58}}
.rev b{{color:var(--amber);display:block;margin-bottom:3px;font-size:12px;letter-spacing:.05em;text-transform:uppercase}}
.lvl-box{{display:flex;gap:13px;align-items:flex-start;background:var(--cl);border:1px solid var(--bd);border-radius:11px;padding:15px 17px;margin:18px 0}}
.lvl-box p{{font-size:13.8px;color:var(--s);line-height:1.55}}
details{{border-top:1px solid var(--bd);padding:19px 0}}
summary{{cursor:pointer;font-weight:650;font-size:16.5px;list-style:none;display:flex;align-items:center;gap:10px;letter-spacing:-.01em}}
summary::-webkit-details-marker{{display:none}}
summary::before{{content:"›";color:var(--lime);font-size:22px;transition:transform .18s;display:inline-block;line-height:1}}
details[open]>summary::before{{transform:rotate(90deg)}}
summary small{{color:var(--m);font-weight:400;font-size:12.5px;margin-left:auto}}
.src{{border-left:2px solid var(--bd);padding:11px 0 11px 15px;margin:11px 0}}
.src:hover{{border-left-color:#333}}
.src p{{font-size:13.8px;line-height:1.58}}
.src .meta{{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}}
.src a{{color:var(--blue);font-size:12px;text-decoration:none;border-bottom:1px solid rgba(91,155,213,.3)}}
.pcw{{background:rgba(239,159,39,.07);border-left:2px solid #EF9F27;padding:10px 14px;margin-top:9px;font-size:13px;color:#dfc08a;border-radius:0 7px 7px 0;line-height:1.55}}
.back{{background:none;border:1px solid var(--bd);color:var(--s);font:inherit;font-size:13px;padding:7px 14px;border-radius:7px;cursor:pointer;margin-bottom:26px}}
.back:hover{{color:var(--tx);border-color:#333}}
input[type=search]{{width:100%;background:var(--card);border:1px solid var(--bd);color:var(--tx);font:inherit;font-size:15px;padding:12px 16px;border-radius:10px;margin-bottom:22px}}
input[type=search]:focus{{outline:none;border-color:#3a3a3a}}
.row{{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:11px}}
.lib{{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:14px 16px;margin-bottom:8px}}
.lib p{{font-size:13.6px;line-height:1.58}}
.ret{{background:var(--card);border:1px solid var(--bd);border-left:3px solid var(--lime);border-radius:0 11px 11px 0;padding:19px 22px;margin-bottom:13px}}
.ret h3{{font-size:16.5px}}
.ret time{{color:var(--m);font-size:12px;display:block;margin-bottom:8px}}
.ret p{{color:var(--s);font-size:14.2px;line-height:1.66}}
.gap{{background:var(--card);border:1px solid var(--bd);border-radius:11px;padding:19px 22px;margin-bottom:13px}}
.gap h3{{font-size:16px;color:var(--amber)}}
.gap p{{color:var(--s);font-size:14.2px;line-height:1.66;margin-top:6px}}
.rule{{background:var(--card);border:1px solid var(--bd);border-radius:11px;padding:18px 20px;margin-bottom:11px}}
.rule h3{{font-size:15.5px;margin-bottom:6px}}
.rule p{{color:var(--s);font-size:14px;line-height:1.62}}
.hid{{display:none}}
footer{{border-top:1px solid var(--bd);padding:38px 0 62px;color:var(--m);font-size:13px;line-height:1.72}}
footer strong{{color:var(--s)}}
mark{{background:rgba(168,224,42,.22);color:var(--tx);border-radius:2px}}
@media(max-width:640px){{.hd{{height:auto;padding:12px 0;flex-wrap:wrap;gap:12px}}nav{{margin-left:0;width:100%}}.hero{{padding:52px 0 38px}}}}
</style></head><body>
<header><div class="wrap hd"><div class="logo">ATP <b>Science</b></div>
<nav>
<button data-v="inicio" class="on">Inicio</button>
<button data-v="temas">Intervenciones</button>
<button data-v="biblioteca">Biblioteca</button>
<button data-v="metodo">Método</button>
<button data-v="nose">Lo que no sabemos</button>
<button data-v="retirado">Lo que retiramos</button>
</nav></div></header>
<main id="app"></main>
<footer><div class="wrap">
<p><strong>ATP no cura, previene ni trata ninguna condición médica.</strong> Este portal es material educativo sobre optimización de la función. Nada de lo que aparece aquí sustituye la consulta con un profesional de la salud, y ninguna decisión clínica debería tomarse a partir de esta información sin acompañamiento.</p>
<p style="margin-top:14px">Toda afirmación clínica publicada pasa por validación científica interna antes de aparecer aquí. Cuando el respaldo de algo es débil, lo decimos en la ficha en lugar de omitirlo.</p>
<p style="margin-top:14px;color:#3a3a3a">somosatp.com · Última revisión del expediente: 27 de julio de 2026</p>
</div></footer>
<script>
const D={data};
const PAR={json.dumps(PAR,ensure_ascii=False)}, ST={json.dumps(ST,ensure_ascii=False)}, LVL={json.dumps(LVL,ensure_ascii=False)};
const NW={json.dumps(sorted(NW))}, M={json.dumps(meta)};
const RET={json.dumps(RET,ensure_ascii=False)}, NOSE={json.dumps(NOSE,ensure_ascii=False)};
const $=s=>document.querySelector(s), app=$('#app');
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[c]));
function srcHTML(s){{
  const nw=NW.includes(s.p), au=s.t==='authority_body';
  return `<div class="src"><p>${{esc(s.c)}}</p><div class="meta">
    <span class="tag ${{nw?'nw':''}}">${{esc(PAR[s.p]||s.p)}}</span>
    <span class="tag ${{au?'auth':''}}">${{esc(ST[s.t]||s.t)}}</span>
    ${{s.f===true?'<span class="tag ind">Financiada por industria interesada</span>':''}}
    ${{s.u?`<a href="${{esc(s.u)}}" target="_blank" rel="noopener">Ver fuente ↗</a>`:''}}
  </div>${{s.pc?`<div class="pcw">${{esc(s.pc)}}</div>`:''}}</div>`;
}}
function detalle(k){{
  const x=D.find(i=>i.key===k); if(!x)return;
  const dura=x.srcs.filter(s=>['primary_study','review_meta'].includes(s.t));
  const trad=x.srcs.filter(s=>s.t==='tradition');
  const divu=x.srcs.filter(s=>s.t==='secondary_divulgation');
  const auth=x.srcs.filter(s=>s.t==='authority_body');
  const pars=[...new Set(x.srcs.filter(s=>!['secondary_divulgation','authority_body'].includes(s.t)).map(s=>s.p))];
  const nwp=pars.filter(p=>NW.includes(p));
  const confl=x.srcs.filter(s=>s.pc);
  app.innerHTML=`<div class="wrap"><section>
  <button class="back" onclick="go('temas')">← Todas las intervenciones</button>
  <div class="row" style="margin-bottom:14px"><span class="lv ${{x.efectivo}}">${{x.efectivo}}</span><span class="tag">${{esc(x.cat)}}</span>
  ${{x.degradado?`<span class="tag auth">Nivel ajustado a la baja desde ${{x.lvl}}</span>`:''}}
  ${{nwp.length?`<span class="tag nw">${{nwp.length}} paradigma${{nwp.length>1?'s':''}} no occidental${{nwp.length>1?'es':''}}</span>`:''}}</div>
  <h1 style="font-size:33px;max-width:26ch">${{esc(x.name)}}</h1>
  <p class="lede" style="font-size:16.5px;margin-top:16px">${{esc(x.benefit)}}</p>
  ${{x.revision?`<div class="rev"><b>Esta afirmación está en revisión</b>${{esc(x.revision)}}</div>`:''}}
  <div class="lvl-box"><span class="lv ${{x.efectivo}}">${{x.efectivo}}</span><p><strong style="color:#fff">Qué significa este nivel.</strong> ${{esc(LVL[x.efectivo])}}${{x.degradado?` <em style="color:#EF9F27">Habíamos declarado ${{x.lvl}}. Al recalcular el nivel desde las fuentes reales, el expediente no lo sostiene, así que lo bajamos.</em>`:''}}</p></div>

  <details open><summary>Cómo funciona <small>mecanismo en lenguaje llano</small></summary>
    <p style="color:#888;margin-top:13px;font-size:14.6px;line-height:1.68;max-width:75ch">${{esc(x.mech||x.how)}}</p>
    ${{x.how&&x.mech?`<p style="color:#666;margin-top:11px;font-size:14px;line-height:1.6;max-width:75ch"><strong style="color:#888">En la práctica.</strong> ${{esc(x.how)}}</p>`:''}}</details>

  ${{dura.length?`<details open><summary>Evidencia primaria y revisiones <small>${{dura.length}} fuente${{dura.length>1?'s':''}}</small></summary>${{dura.map(srcHTML).join('')}}</details>`:''}}
  ${{trad.length?`<details><summary>Tradición documentada <small>${{trad.length}} · nunca sostiene sola una afirmación</small></summary>${{trad.map(srcHTML).join('')}}</details>`:''}}
  ${{divu.length?`<details><summary>Divulgación secundaria <small>${{divu.length}} · nunca sostiene sola una afirmación</small></summary>${{divu.map(srcHTML).join('')}}</details>`:''}}
  ${{auth.length?`<details><summary>Posturas institucionales <small>${{auth.length}} · solo para restringir o para mostrar la posición contraria</small></summary>${{auth.map(srcHTML).join('')}}</details>`:''}}
  ${{confl.length?`<details><summary>Dónde los paradigmas se contradicen <small>${{confl.length}}</small></summary>${{confl.map(s=>`<div class="pcw" style="margin:12px 0">${{esc(s.pc)}}<div style="color:#666;font-size:12px;margin-top:7px">${{esc(s.c.slice(0,120))}}…</div></div>`).join('')}}</details>`:''}}
  ${{x.contra.length?`<details><summary>Contraindicaciones y precauciones <small>${{x.contra.length}}</small></summary><ul style="margin-top:13px;padding-left:19px;color:#888;font-size:14.2px;line-height:1.85">${{x.contra.map(c=>`<li>${{esc(c)}}</li>`).join('')}}</ul></details>`:''}}
  <details><summary>El expediente completo <small>cómo se calculó este nivel</small></summary>
    <div style="color:#888;font-size:14.2px;line-height:1.7;margin-top:14px;max-width:78ch">
    <p>Esta intervención se apoya en <strong style="color:#fff">${{x.srcs.length}} fuentes</strong> de <strong style="color:#fff">${{pars.length}} paradigma${{pars.length>1?'s':''}} independiente${{pars.length>1?'s':''}}</strong>, de los cuales ${{nwp.length}} ${{nwp.length===1?'es no occidental':'son no occidentales'}}. De esas fuentes, ${{x.srcs.filter(s=>s.u).length}} tienen un identificador que puedes abrir y verificar por tu cuenta.</p>
    <p style="margin-top:12px">El nivel no lo escribimos a mano: lo calcula el código a partir de las fuentes reales, y solo puede bajar el nivel declarado, nunca subirlo. Es una decisión deliberada — un portal de evidencia no debería poder promover sus propias afirmaciones.</p>
    ${{x.srcs.filter(s=>s.f===true).length?`<p style="margin-top:12px;color:#fb7185">${{x.srcs.filter(s=>s.f===true).length}} de estas fuentes tienen financiamiento de una industria con interés en el resultado. Lo marcamos siempre, también cuando el resultado nos favorece.</p>`:''}}
    ${{x.roots.length?`<p style="margin-top:12px">Se sugiere ante: ${{x.roots.map(esc).join(' · ')}}.</p>`:''}}
    </div></details>
  </section></div>`;
  window.scrollTo(0,0);
}}
window.detalle=detalle;
const V={{
 inicio:()=>`<div class="wrap"><div class="hero">
  <h1>Así sabemos lo que sabemos.</h1>
  <p class="lede">Casi toda app de salud hace una de dos cosas: no cita nada, o finge ser PubMed puro. Nosotros hacemos una tercera, y es incómoda a propósito. <strong>Publicamos cómo sabemos lo que sabemos</strong>: de qué paradigma viene cada fuente, cuándo un estudio lo pagó la industria interesada, dónde los paradigmas se contradicen entre sí, y qué no sabemos todavía.</p>
  <p class="lede">La evidencia que respalda a ATP no es solo occidental. El dinero de la investigación no va a las preguntas más importantes: va a las que tienen mejor retorno. Por eso cruzamos literatura japonesa, india, china, coreana y latinoamericana con la occidental y con tradiciones documentadas de siglos — y exigimos convergencia entre paradigmas que no se hablan entre sí, porque eso es una forma de replicación que no comparte sesgo de financiamiento.</p>
  <div class="stats">
   <div class="stat"><b>${{M.tot}}</b><span>fuentes catalogadas</span></div>
   <div class="stat"><b>${{M.url}}</b><span>con identificador verificable</span></div>
   <div class="stat"><b>${{M.par}}</b><span>paradigmas de origen</span></div>
   <div class="stat"><b>${{M.nw}}</b><span>fuentes académicas no occidentales</span></div>
   <div class="stat"><b>${{M.ind}}</b><span>con financiamiento de industria interesada</span></div>
   <div class="stat"><b>${{M.pc}}</b><span>conflictos entre paradigmas declarados</span></div>
  </div></div>
  <section><h2>Empieza por aquí</h2><p class="sub">Tres puertas. La primera te dice qué respalda cada práctica. La segunda es el método completo. La tercera es la que casi nadie publica.</p>
  <div class="grid">
   <div class="card" onclick="go('temas')"><h3>Las ${{M.iv}} intervenciones</h3><p>Cada una con su nivel de evidencia, sus fuentes con paradigma visible y sus contraindicaciones.</p></div>
   <div class="card" onclick="go('metodo')"><h3>Nuestro método</h3><p>Qué significa cada nivel, qué cuenta como fuente y las tres reglas que no negociamos.</p></div>
   <div class="card" onclick="go('nose')"><h3>Lo que no sabemos</h3><p>Los huecos abiertos de nuestro propio expediente, en nuestras palabras.</p></div>
   <div class="card" onclick="go('retirado')"><h3>Lo que retiramos</h3><p>Afirmaciones que quitamos o suavizamos, con la fecha y el motivo. Incluida una auditoría que nos costó.</p></div>
  </div></section></div>`,
 temas:()=>{{const c={{}};D.forEach(x=>(c[x.cat]=c[x.cat]||[]).push(x));
  return `<div class="wrap"><section><h2>Intervenciones</h2><p class="sub">Ordenadas por sistema. El color del nivel indica la fuerza del expediente, no la utilidad de la práctica: hay intervenciones N3 excelentes cuya evidencia formal simplemente nadie ha pagado.</p>
  <input type="search" id="q" placeholder="Buscar una intervención, un mecanismo o un sistema…" oninput="filtra(this.value)">
  ${{Object.keys(c).sort().map(k=>`<div class="tblk"><h3 style="margin:26px 0 11px;color:#888;font-size:13px;letter-spacing:.09em;text-transform:uppercase">${{esc(k)}}</h3><div class="grid">
  ${{c[k].map(x=>`<div class="card iv" data-s="${{esc((x.name+' '+x.benefit+' '+x.cat+' '+x.roots.join(' ')).toLowerCase())}}" onclick="detalle('${{x.key}}')">
   <div class="row" style="margin:0 0 9px"><span class="lv ${{x.efectivo}}">${{x.efectivo}}</span>${{x.revision?'<span class="tag auth">En revisión</span>':''}}${{x.srcs.some(s=>NW.includes(s.p))?'<span class="tag nw">No occidental</span>':''}}</div>
   <h3>${{esc(x.name)}}</h3><p>${{esc(x.benefit.slice(0,132))}}${{x.benefit.length>132?'…':''}}</p>
   <p style="color:#555;font-size:11.5px;margin-top:9px">${{x.srcs.length}} fuentes · ${{x.srcs.filter(s=>s.u).length}} verificables</p></div>`).join('')}}
  </div></div>`).join('')}}</section></div>`}},
 biblioteca:()=>{{const L=[];D.forEach(x=>x.srcs.filter(s=>s.u).forEach(s=>L.push({{...s,iv:x.name,k:x.key}})));
  L.sort((a,b)=>a.c.localeCompare(b.c));
  return `<div class="wrap"><section><h2>La biblioteca</h2><p class="sub">Las ${{L.length}} fuentes de nuestro expediente que tienen un identificador que puedes abrir y comprobar tú mismo. Cada una lleva su paradigma de origen y su marca de financiamiento. Si encuentras un error, es un error nuestro y queremos saberlo.</p>
  <input type="search" placeholder="Buscar por autor, revista, año o tema…" oninput="filtraLib(this.value)">
  <div id="libl">${{L.map(s=>`<div class="lib" data-s="${{esc((s.c+' '+s.iv).toLowerCase())}}"><p>${{esc(s.c)}}</p>
  <div class="meta row"><span class="tag ${{NW.includes(s.p)?'nw':''}}">${{esc(PAR[s.p]||s.p)}}</span><span class="tag">${{esc(ST[s.t]||s.t)}}</span>
  ${{s.f===true?'<span class="tag ind">Financiamiento de industria</span>':''}}
  <span class="tag" style="cursor:pointer" onclick="detalle('${{s.k}}')">${{esc(s.iv)}}</span>
  <a href="${{esc(s.u)}}" target="_blank" rel="noopener">Ver fuente ↗</a></div></div>`).join('')}}</div></section></div>`}},
 metodo:()=>`<div class="wrap"><section><h2>Nuestro método</h2><p class="sub">Publicamos el criterio completo, incluidos sus límites. Un método que solo se puede evaluar por sus conclusiones no es un método.</p>
  <h3 style="margin:34px 0 13px">Los cuatro niveles de evidencia</h3>
  <p class="sub" style="margin-bottom:18px">No usamos la pirámide clásica, que trata el ensayo aleatorizado como único árbitro. Los ensayos existen donde hubo dinero para pagarlos: no hay ensayo de fase III de la respiración nasal porque nadie la puede patentar. Nuestra jerarquía premia la convergencia entre paradigmas independientes.</p>
  ${{Object.keys(LVL).map(l=>`<div class="rule"><div class="row" style="margin:0 0 8px"><span class="lv ${{l}}">${{l}}</span><span style="color:#555;font-size:12px">${{D.filter(x=>x.efectivo===l).length}} intervenciones</span></div><p>${{esc(LVL[l])}}</p></div>`).join('')}}
  <h3 style="margin:38px 0 13px">Las tres reglas que no negociamos</h3>
  <div class="rule"><h3>Ninguna afirmación se sostiene solo en tradición</h3><p>La medicina tradicional china y el ayurveda entran a nuestro expediente como observación clínica documentada a escala de siglos, no como autoridad. Solo cuentan cuando convergen con un mecanismo o con literatura contemporánea. Ninguna de nuestras ${{M.iv}} intervenciones se apoya únicamente en tradición.</p></div>
  <div class="rule"><h3>Ninguna se sostiene solo en divulgación</h3><p>Los libros y podcasts de salud pueden señalar hacia dónde mirar, pero no son evidencia. Cuando una fuente nuestra es de divulgación, mostramos el estudio primario al que apunta, no a la persona.</p></div>
  <div class="rule"><h3>Una postura institucional nunca respalda una afirmación nuestra</h3><p>Y esta es la incómoda. No aceptamos a los grandes cuerpos de consenso como validación cuando nos contradicen, así que tampoco los usamos cuando nos convienen. Solo admitimos una postura institucional para dos cosas: restringir algo por seguridad, o mostrar cuál es la posición contraria a la nuestra. Si citáramos a favor a un organismo que rechazamos en contra, todo este portal se caería.</p></div>
  <h3 style="margin:38px 0 13px">El nivel lo calcula el código, y solo puede bajar</h3>
  <p class="sub">El nivel de evidencia no lo escribe una persona: lo deriva el sistema a partir de las fuentes reales de cada intervención. Y está construido de forma asimétrica a propósito — el cálculo puede <em>bajar</em> un nivel declarado, nunca subirlo. Un portal de evidencia que puede promover sus propias afirmaciones no es un portal de evidencia. Hoy hay ${{D.filter(x=>x.degradado).length}} intervenciones cuyo nivel bajó al recalcularlo, y aparecen marcadas.</p>
  <h3 style="margin:38px 0 13px">Los sesgos que declaramos, en las dos direcciones</h3>
  <p class="sub">Sesgo de publicación, de financiamiento, de idioma — cerca del 95% de la literatura indexada está en inglés —, de patrocinio industrial y de novedad. Marcamos ${{M.ind}} de nuestras fuentes por financiamiento de una industria con interés en el resultado, también cuando el resultado nos favorece.</p>
  <p class="sub">Y en la otra dirección: hay un sesgo documentado de resultados positivos en parte de la literatura clínica de algunos países asiáticos, especialmente en estudios de medicina tradicional. Por eso, cuando incorporamos una fuente de esas bases, exigimos que mida desenlaces duros y objetivos — glucosa, hemoglobina glicosilada, eventos incidentes — y no percepciones evaluadas por el mismo equipo que aplica la intervención. Declarar el sesgo solo del lado que nos conviene sería propaganda.</p>
  </section></div>`,
 nose:()=>`<div class="wrap"><section><h2>Lo que no sabemos</h2><p class="sub">Un expediente que solo contiene evidencia a favor se lee como propaganda. Uno que declara sus huecos se lee como ciencia. Estos son los nuestros, y los mantenemos abiertos hasta que haya algo que decir.</p>
  ${{NOSE.map(([t,p])=>`<div class="gap"><h3>${{esc(t)}}</h3><p>${{esc(p)}}</p></div>`).join('')}}
  <div class="gap" style="border-color:#333"><h3 style="color:#888">Y una nota sobre estas listas</h3><p>Esta página va a crecer, no a encogerse. Cada vez que revisamos algo a fondo encontramos algo que no sabíamos que no sabíamos. Preferimos publicarlo aquí antes de que alguien nos lo señale.</p></div>
  </section></div>`,
 retirado:()=>`<div class="wrap"><section><h2>Lo que retiramos</h2><p class="sub">Afirmaciones que quitamos o suavizamos, con su fecha y su motivo. Publicamos esto porque un sistema que demuestra que corrige sus propios errores es más difícil de atacar que uno que siempre tuvo razón — y porque si no lo publicáramos, no habría manera de que nos creyeras el resto.</p>
  ${{RET.map(([t,f,p])=>`<div class="ret"><time>${{esc(f)}}</time><h3>${{esc(t)}}</h3><p>${{esc(p)}}</p></div>`).join('')}}
  </section></div>`
}};
function go(v){{document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));app.innerHTML=V[v]();window.scrollTo(0,0);location.hash=v;}}
window.go=go;
window.filtra=q=>{{q=q.toLowerCase().trim();document.querySelectorAll('.iv').forEach(e=>e.classList.toggle('hid',q&&!e.dataset.s.includes(q)));
 document.querySelectorAll('.tblk').forEach(b=>b.classList.toggle('hid',![...b.querySelectorAll('.iv')].some(e=>!e.classList.contains('hid'))));}};
window.filtraLib=q=>{{q=q.toLowerCase().trim();document.querySelectorAll('#libl .lib').forEach(e=>e.classList.toggle('hid',q&&!e.dataset.s.includes(q)));}};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
go(location.hash.slice(1)&&V[location.hash.slice(1)]?location.hash.slice(1):'inicio');
</script></body></html>"""
open('atp-science.html','w',encoding='utf-8').write(H)
print("portal generado:",len(H)//1024,"KB")
print("intervenciones:",len(d),"| fuentes:",tot,"| con URL:",url,"| no occidentales:",nw)
