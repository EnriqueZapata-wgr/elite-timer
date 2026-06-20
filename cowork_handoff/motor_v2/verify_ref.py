import json, math, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
d = json.load(open('cowork_handoff/motor_v2/fixtures_4_pacientes.json', encoding='utf-8'))

def scoreToEdad(s):
    if s>=95: return 22
    if s>=90: return 28-(s-90)/5*6
    if s>=80: return 33-(s-80)/10*5
    if s>=70: return 42-(s-70)/10*9
    if s>=60: return 50-(s-60)/10*8
    if s>=50: return 60-(s-50)/10*10
    if s>=40: return 70-(s-40)/10*10
    if s>=30: return 80-(s-30)/10*10
    return min(100, 90+(30-s)/30*10)

def labs(I, cron):
    K={'alb':-0.0336,'cre':0.0095,'glu':0.1953,'crp':0.0954,'lym':-0.012,'mcv':0.0268,'rdw':0.3306,'alp':0.00188,'wbc':0.0554,'age':0.0804}
    xb=-19.9067
    xb+=(I['Albúmina']*10)*K['alb']
    xb+=(I['Creatinina sérica']*88.4)*K['cre']
    xb+=(I['Glucosa ayuno']*0.0555)*K['glu']
    xb+=math.log(max(I['PCR (CRP)']*10,0.0001))*K['crp']
    xb+=I['% Linfocitos']*K['lym']
    xb+=I['VCM (MCV)']*K['mcv']
    xb+=I['RDW-CV']*K['rdw']
    xb+=I['Fosfatasa Alcalina']*K['alp']
    xb+=I['Leucocitos (WBC)']*K['wbc']
    xb+=cron*K['age']
    mort=1-math.exp(-math.exp(xb)*((math.exp(0.0076927*120)-1)/0.0076927))
    pheno=141.50225+math.log(-0.00553*math.log(1-mort))/0.090165
    vitd=I['Vit D (25-OH)']
    dd=0
    dd+= 1 if vitd<30 else (0.5 if vitd>70 else (0 if vitd<50 else -1))
    b12=I['Vit B12']; dd+= 2 if b12<200 else (0.5 if b12<400 else (-0.5 if b12<700 else 0))
    hcy=I['Homocisteína']; dd+= -1 if hcy<8 else (0 if hcy<12 else (1 if hcy<15 else 2))
    fer=I['Ferritina']; dd+= -0.5 if 30<=fer<=300 else 1
    tsh=I['TSH']; dd+= -0.5 if 1<=tsh<=2.5 else (0 if 2.5<tsh<=4 else 1)
    cor=I['Cortisol matutino']; dd+= 0 if 8<=cor<=15 else 1
    bil=I['Bilirrubina total']; dd+= -0.5 if 0.3<=bil<=1.2 else 0.5
    dd=max(-5,min(10,dd))
    return pheno+dd

def comp(I):
    male=I['Sexo (M=1, F=0)']==1
    g=I['% Grasa corporal']
    if male: sg=100 if 10<=g<=14 else (90 if 8<=g<10 else (80 if 14<g<=18.5 else (50 if 18.5<g<=24 else (25 if g>24 else (80 if g<8 else 0)))))
    else: sg=100 if 18<=g<=23 else (90 if 15<=g<18 else (80 if 23<g<=28 else (50 if 28<g<=33 else (25 if g>33 else (80 if g<15 else 0)))))
    ffmi=I['Peso']*(1-g/100)/((I['Altura']/100)**2)
    if male: sf=25 if ffmi<17.5 else (50 if ffmi<19 else (80 if ffmi<22 else (100 if ffmi<=25 else 80)))
    else: sf=25 if ffmi<14 else (50 if ffmi<15.5 else (80 if ffmi<17 else (100 if ffmi<=19 else 80)))
    m=I['% Músculo esquelético']
    if male: sm=100 if m>=45 else (80 if m>=40 else (50 if m>=35 else (25 if m>=30 else 0)))
    else: sm=100 if m>=35 else (80 if m>=32 else (50 if m>=28 else (25 if m>=25 else 0)))
    v=I['Grasa visceral']
    if male: sv=100 if v<5 else (80 if v<=7 else (50 if v<=10 else (25 if v<=12 else 0)))
    else: sv=100 if v<4 else (80 if v<=6 else (50 if v<=8 else (25 if v<=10 else 0)))
    a=I['Fuerza de agarre']
    if male: sa=100 if a>55 else (80 if a>=45 else (50 if a>=35 else (25 if a>=25 else 0)))
    else: sa=100 if a>35 else (80 if a>=28 else (50 if a>=22 else (25 if a>=18 else 0)))
    c=I['Cintura']
    if male: sc=100 if c<94 else (50 if c<=102 else 0)
    else: sc=100 if c<80 else (50 if c<=88 else 0)
    score=sg*0.2+sf*0.2+sm*0.2+sv*0.15+sa*0.15+sc*0.1
    return scoreToEdad(score)

def fitness(I):
    male=I['Sexo (M=1, F=0)']==1
    vo=I['VO2max estimado']
    if male: s_vo=100 if vo>55 else (80 if vo>=45 else (50 if vo>=35 else (25 if vo>=30 else 0)))
    else: s_vo=100 if vo>45 else (80 if vo>=38 else (50 if vo>=30 else (25 if vo>=25 else 0)))
    a=I['Fuerza de agarre']
    if male: s_a=100 if a>55 else (80 if a>=45 else (50 if a>=35 else (25 if a>=25 else 0)))
    else: s_a=100 if a>35 else (80 if a>=28 else (50 if a>=22 else (25 if a>=18 else 0)))
    om=I['Old Man Test']; s_om=100 if om>=10 else (80 if om>=8 else (50 if om>=6 else (25 if om>=4 else 0)))
    p=I['Push-ups máx continuas']
    if male: s_p=100 if p>=40 else (80 if p>=25 else (50 if p>=15 else (25 if p>=10 else 0)))
    else: s_p=100 if p>=25 else (80 if p>=15 else (50 if p>=8 else (25 if p>=5 else 0)))
    sq=I['Sentadilla 60s']
    if male: s_sq=100 if sq>=40 else (80 if sq>=30 else (50 if sq>=20 else (25 if sq>=10 else 0)))
    else: s_sq=100 if sq>=35 else (80 if sq>=25 else (50 if sq>=15 else (25 if sq>=8 else 0)))
    b=I['Balance 1 pie ojos abiertos']; s_b=100 if b>=60 else (80 if b>=30 else (50 if b>=15 else (25 if b>=5 else 0)))
    pl=I['Plank máx']; s_pl=100 if pl>=180 else (80 if pl>=90 else (50 if pl>=45 else (25 if pl>=20 else 0)))
    rh=I['Recovery HR 2-min']; s_rh=100 if rh>=40 else (80 if rh>=25 else (50 if rh>=15 else (25 if rh>=10 else 0)))
    bo=I['BOLT']; s_bo=100 if bo>=40 else (80 if bo>=25 else (50 if bo>=15 else (25 if bo>=10 else 0)))
    score=s_vo*0.25+s_a*0.15+s_om*0.15+s_p*0.1+s_sq*0.1+s_b*0.08+s_pl*0.07+s_rh*0.05+s_bo*0.05
    return scoreToEdad(score)

RT_TOUCH_LATENCY_MS = 80  # cognicion v2.1: latencia tactil restada antes de las curvas

def cog(I, cron):
    dt = lambda rt: max(0, rt - RT_TOUCH_LATENCY_MS)
    def simple(rt):
        if rt<=250: return 20
        if rt<=270: return 20+(rt-250)/20*10
        if rt<=290: return 30+(rt-270)/20*10
        if rt<=320: return 40+(rt-290)/30*10
        if rt<=360: return 50+(rt-320)/40*10
        if rt<=410: return 60+(rt-360)/50*10
        if rt<=470: return 70+(rt-410)/60*10
        return min(100,80+(rt-470)/30*10)
    def choice(rt):
        if rt<=440: return 20
        if rt<=470: return 20+(rt-440)/30*10
        if rt<=500: return 30+(rt-470)/30*10
        if rt<=540: return 40+(rt-500)/40*10
        if rt<=600: return 50+(rt-540)/60*10
        if rt<=680: return 60+(rt-600)/80*10
        if rt<=780: return 70+(rt-680)/100*10
        return min(100,80+(rt-780)/50*10)
    def gng(rt,err):
        if rt<=280: r=20
        elif rt<=310: r=20+(rt-280)/30*10
        elif rt<=340: r=30+(rt-310)/30*10
        elif rt<=380: r=40+(rt-340)/40*10
        elif rt<=430: r=50+(rt-380)/50*10
        elif rt<=490: r=60+(rt-430)/60*10
        elif rt<=560: r=70+(rt-490)/70*10
        else: r=min(100,80+(rt-560)/40*10)
        em=min(15, max(0, err)*0.7)
        return r+em
    s=simple(dt(I['RT Simple promedio']))
    c=choice(dt(I['RT Choice 4-AFC promedio']))
    g=gng(dt(I['Go/No-Go RT hits']),I['Go/No-Go tasa errores'])
    avg10=(I['Claridad mental']+I['Energía mental']+I['Memoria autopercibida'])/3
    subj=cron-(avg10-5)*0.7
    return s*0.3+c*0.3+g*0.25+subj*0.15

def riesgos(I):
    male=I['Sexo (M=1, F=0)']==1
    apob=I['ApoB']; s7=100 if apob<=80 else (80 if apob<=99 else (50 if apob<=110 else (25 if apob<=125 else 0)))
    ldl=I['LDL']; s8=100 if ldl<=100 else (80 if ldl<=130 else (50 if ldl<=160 else (25 if ldl<=190 else 0)))
    hdl=I['HDL']; s9=100 if hdl>=60 else (80 if hdl>=50 else (50 if hdl>=40 else (25 if hdl>=30 else 0)))
    tg=I['Triglicéridos']; s10=100 if tg<=100 else (80 if tg<=150 else (50 if tg<=200 else (25 if tg<=300 else 0)))
    r=tg/hdl; s11=100 if r<=2 else (80 if r<=3 else (50 if r<=4 else (25 if r<=6 else 0)))
    pas=I['PA Sistólica']; s12=100 if 90<=pas<=115 else (80 if pas<=120 else (50 if pas<=130 else (25 if pas<=140 else 0)))
    pad=I['PA Diastólica']; s13=100 if 60<=pad<=75 else (80 if pad<=85 else (50 if pad<=90 else (25 if pad<=100 else 0)))
    ct=I['Colesterol Total']; s14=100 if ct<=200 else (80 if ct<=220 else (50 if ct<=240 else (25 if ct<=280 else 0)))
    cardio=s7*0.2+s8*0.1+s9*0.15+s10*0.1+s11*0.15+s12*0.15+s13*0.1+s14*0.05
    hba=I['HbA1c']; m18=100 if hba<=5.5 else (80 if hba<=5.6 else (50 if hba<=6.0 else (25 if hba<=6.5 else 0)))
    homa=I['HOMA-IR']; m19=100 if homa<=1 else (80 if homa<=1.5 else (50 if homa<=2.5 else (25 if homa<=4 else 0)))
    glu=I['Glucosa ayuno']; m20=100 if glu<=90 else (80 if glu<=100 else (50 if glu<=110 else (25 if glu<=125 else 0)))
    ins=I['Insulina ayuno']; m21=100 if ins<=5 else (80 if ins<=8 else (50 if ins<=12 else (25 if ins<=20 else 0)))
    metab=m18*0.35+m19*0.3+m20*0.2+m21*0.15
    pcr=I['PCR (CRP)']; i25=100 if pcr<=0.5 else (80 if pcr<=1 else (50 if pcr<=3 else (25 if pcr<=10 else 0)))
    hcy=I['Homocisteína']; i26=100 if hcy<=8 else (80 if hcy<=11 else (50 if hcy<=13 else (25 if hcy<=15 else 0)))
    nlr=I['NLR (Neutróf/Linfo)']; i27=100 if nlr<=1.5 else (80 if nlr<=2 else (50 if nlr<=2.5 else (25 if nlr<=3.5 else 0)))
    inflam=i25*0.4+i26*0.3+i27*0.3
    th=I['Testo total (H) / Estradiol (M)']
    if male: h31=100 if 4<=th<=8 else (80 if 3<=th<4 else (80 if 8<=th<=12 else (25 if th<3 else 50)))
    else: h31=100 if 30<=th<=200 else (80 if 200<=th<=400 else (25 if th<30 else 50))
    tsh=I['TSH']; h32=100 if 1<=tsh<=2.5 else (80 if 0.5<=tsh<=3 else (50 if 0.3<tsh<=4 else (25 if tsh<=5 else 0)))
    cor=I['Cortisol matutino']; h33=100 if 6<=cor<=15 else (80 if cor<=18 else (50 if cor<=22 else 25))
    vitd=I['Vit D (25-OH)']; h34=100 if 30<=vitd<=70 else (50 if vitd>=20 else 25)
    horm=h31*0.4+h32*0.25+h33*0.25+h34*0.1
    ast=I['AST']; r38=100 if ast<=25 else (80 if ast<=35 else (50 if ast<=45 else (25 if ast<=60 else 0)))
    alt=I['ALT']; r39=100 if alt<=25 else (80 if alt<=35 else (50 if alt<=45 else (25 if alt<=60 else 0)))
    ggt=I['GGT']; r40=100 if ggt<=25 else (80 if ggt<=35 else (50 if ggt<=50 else (25 if ggt<=70 else 0)))
    bun=I['BUN']; r41=100 if 8<=bun<=20 else (80 if bun<=25 else (50 if bun<=30 else (25 if bun<=40 else 0)))
    cre=I['Creatinina sérica']
    if male: r42=100 if 0.6<=cre<=1.2 else (80 if cre<=1.4 else (50 if cre<=1.6 else (25 if cre<=2 else 0)))
    else: r42=100 if 0.5<=cre<=1.1 else (80 if cre<=1.3 else (50 if cre<=1.5 else (25 if cre<=1.8 else 0)))
    hepa=r38*0.2+r39*0.2+r40*0.2+r41*0.2+r42*0.2
    total=cardio*0.3+metab*0.25+inflam*0.2+horm*0.15+hepa*0.1
    return scoreToEdad(total)

def habitos(I):
    ay=I['Ayuno IF']; s7=0 if ay<12 else (25 if ay<14 else (50 if ay<16 else (100 if ay<20 else (80 if ay<23 else 50))))
    ej=I['Ejercicio']; s8=0 if ej<2 else (25 if ej<4 else (50 if ej<7 else (80 if ej<10 else (100 if ej<25 else 80))))
    pa=I['Pasos']; s9=0 if pa<5000 else (25 if pa<6500 else (50 if pa<7800 else (100 if pa<15000 else (80 if pa<25000 else 50))))
    ta=I['Tabaquismo']; s10=100 if ta==0 else (25 if ta<=5 else 0)
    al=I['Alcohol']; s11=100 if al<=4 else (80 if al<=6 else (50 if al<=10 else (25 if al<=16 else 0)))
    su=I['Sueño']; s12=0 if su<6 else (50 if su<7 else (80 if su<7.5 else (100 if su<=8.5 else (80 if su<=9.5 else 50))))
    co=I['Consistencia sueño']; s13=100 if co<=45 else (80 if co<=75 else (50 if co<=90 else 25))
    score=s7*0.1+s8*0.2+s9*0.1+s10*0.15+s11*0.1+s12*0.2+s13*0.15
    factor=0.95 if score>=80 else (1.0 if score>=60 else (1.05 if score>=40 else 1.10))
    return score, factor

PESOS={'labs':0.25,'comp':0.15,'fit':0.2,'cog':0.15,'ries':0.25}
ANC={'labs':0.75,'comp':0.7,'fit':0.65,'cog':0.55,'ries':0.75}

print(f"{'pt':4} {'area':6} {'computed':>10} {'expected':>10} {'diff':>8}")
allok=True
for pt in ['H1','H2','M1','M2']:
    I={k:v['value'] for k,v in d[pt]['inputs'].items()}
    cron=I['Edad cronológica']; exp=d[pt]['expected']
    eL=labs(I,cron); eC=comp(I); eF=fitness(I); eG=cog(I,cron); eR=riesgos(I)
    rows=[('labs',eL,exp['edad_labs_ciega']),('comp',eC,exp['edad_composicion_ciega']),
          ('fit',eF,exp['edad_fitness_ciega']),('cog',eG,exp['edad_cognicion_ciega']),
          ('ries',eR,exp['edad_riesgos_ciega'])]
    for nm,cv,ev in rows:
        diff=cv-ev; flag='' if abs(diff)<=1.5 else '  <-- FAIL'
        if abs(diff)>1.5: allok=False
        print(f"{pt:4} {nm:6} {cv:10.4f} {ev:10.4f} {diff:8.4f}{flag}")
    anc=lambda e,f: cron+(e-cron)*f
    pre=anc(eL,ANC['labs'])*PESOS['labs']+anc(eC,ANC['comp'])*PESOS['comp']+anc(eF,ANC['fit'])*PESOS['fit']+anc(eG,ANC['cog'])*PESOS['cog']+anc(eR,ANC['ries'])*PESOS['ries']
    hsc,hf=habitos(I)
    final=max(20,min(100,pre*hf))
    ev=exp['edad_atp_integral']; diff=final-ev; flag='' if abs(diff)<=1.0 else '  <-- GATE FAIL'
    if abs(diff)>1.0: allok=False
    print(f"{pt:4} {'INTEG':6} {final:10.4f} {ev:10.4f} {diff:8.4f}{flag}  (habit_score={hsc:.1f} f={hf})")
    print()
print("ALL WITHIN TOLERANCE" if allok else "SOME FAILED")
