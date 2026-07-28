# -*- coding: utf-8 -*-
import re,json,collections
s=open('interventions-catalog.ts',encoding='utf-8',newline='').read()
def unq(x): return x.replace("\\'","'").replace('\\"','"')
segs=re.split(r"\r\n\s{4,6}key: '",s)
head,body=segs[0],segs[1:]
CAT=dict(re.findall(r"\n  (\w+): '([^']+)',",open('/mnt/user-data/uploads/EliteTimer/src/constants/intervention-vocab.ts',encoding='utf-8').read().split('CATEGORY_LABELS')[1].split('};')[0]))
ROOT=dict(re.findall(r"\n  (\w+): '([^']+)',",open('/mnt/user-data/uploads/EliteTimer/src/constants/intervention-vocab.ts',encoding='utf-8').read().split('ROOT_LABELS')[1].split('};')[0]))
TRAD={'tcm','ayurveda','traditional_documented'}
NW={'indian_academic','chinese_academic','russian_academic','latam_academic','japanese_academic','korean_academic','soviet_sports'}
EN_REVISION={
 'hidratacion_ushapan_avanzado':'El volumen tiene apoyo indirecto, pero no existe ningún ensayo clínico del protocolo Ushapana, y el mecanismo termogénico que suele atribuírsele está refutado — el efecto aparece con agua fría, no tibia. Claim en revisión.',
 'agua_fuera_comidas':'No existe ningún ensayo que compare beber agua durante la comida contra fuera de ella. Además, la lectura estándar del verso clásico que citamos presenta beber durante la comida como la opción equilibrada. Postura en revisión.',
 'sauna_infrarrojo':'Nuestro protocolo no coincide con el estudiado (60 °C × 15 min más 30 min de reposo), y el único ensayo aleatorizado falló su desenlace primario. Parámetros y claims en revisión.',
 'bano_frio_desinflamacion':'Al protocolo exacto de esta intervención, el estudio con biopsias musculares no encuentra menos inflamación que con recuperación activa. El nombre y el encuadre están en revisión.',
 'ducha_fria_nivel3':'La única evidencia sólida de duchas frías usó 30 a 90 segundos, no 5 a 10 minutos, y no encontró relación dosis-respuesta. La duración está en revisión.',
}
out=[]
for seg in body:
    k=seg.split("'")[0]
    g=lambda f:(lambda m: unq(m.group(1)) if m else '')(re.search(r"\r\n\s+"+f+r": '((?:[^'\\]|\\.)*)'",seg))
    srcs=[]
    for m in re.finditer(r"\{\r\n\s+citation: '((?:[^'\\]|\\.)*)',\r\n\s+paradigm: '(\w+)',\r\n\s+sourceType: '(\w+)',((?:(?!\r\n      \},)[\s\S])*)",seg):
        cit,par,st,rest=m.group(1),m.group(2),m.group(3),m.group(4)
        u=re.search(r"url: '([^']+)'",rest); f=re.search(r"industryFunded: (true|false)",rest); pc=re.search(r"paradigmConflict: '((?:[^'\\]|\\.)*)'",rest)
        srcs.append({'c':unq(cit),'p':par,'t':st,'u':u.group(1) if u else None,
                     'f':(f.group(1)=='true') if f else None,'pc':unq(pc.group(1)) if pc else None})
    lvl=(re.search(r"evidenceLevel: '(N\d)'",seg) or [None,'?'])[1]
    hard={x['p'] for x in srcs if x['t'] not in ('secondary_divulgation','authority_body')}
    n=len(hard)
    comp='N1' if n>=3 and any(x['t'] in('primary_study','review_meta') for x in srcs) else ('N2' if n>=2 else ('N3' if n>=1 else 'N4'))
    cats=re.findall(r"'(\w+)'",(re.search(r"categories: \[([^\]]*)\]",seg) or [None,''])[1] if re.search(r"categories: \[([^\]]*)\]",seg) else '')[:1]
    roots=re.findall(r"'(\w+)'",(re.search(r"roots: \[([^\]]*)\]",seg) or [None,''])[1] if re.search(r"roots: \[([^\]]*)\]",seg) else '')
    contra=[unq(x) for x in re.findall(r"'((?:[^'\\]|\\.)*)'",(re.search(r"contraindications: \[([^\]]*)\]",seg) or [None,''])[1])] if re.search(r"contraindications: \[([^\]]*)\]",seg) else []
    out.append({'key':k,'name':g('name') or k,'benefit':g('benefit'),'how':g('how'),
      'mech':(re.search(r"mechanismSummary: '((?:[^'\\]|\\.)*)'",seg) or [None,''])[1],
      'cat':(CAT.get(cats[0],cats[0]) if cats else 'Otros'),'roots':[ROOT.get(r,r) for r in roots][:6],
      'lvl':lvl,'comp':comp,'nPar':n,'srcs':srcs,'contra':contra[:8],
      'revision':EN_REVISION.get(k)})
json.dump(out,open('portal.json','w',encoding='utf-8'),ensure_ascii=False)
print("intervenciones:",len(out),"| fuentes:",sum(len(x['srcs']) for x in out))
print("nivel declarado vs computado — discrepancias:",sum(1 for x in out if x['lvl']!=x['comp']))
print(collections.Counter((x['lvl'],x['comp']) for x in out).most_common(8))
print("en revisión:",sum(1 for x in out if x['revision']))
print("con URL:",sum(1 for x in out for y in x['srcs'] if y['u']))
