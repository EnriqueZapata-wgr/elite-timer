#!/usr/bin/env node
/**
 * codigos.js: emitir y revisar codigos de activacion desde la terminal.
 *
 * POR QUE EXISTE (8 de septiembre de 2026): con el pivote Elite, sin codigo de
 * activacion no hay cuenta. Emitir codigos era SQL a mano y saber cuales se
 * usaron tambien. Esto lo vuelve dos comandos.
 *
 * OJO: la tabla activation_codes esta VACIA en produccion. Mientras no se
 * emita el primer codigo con este comando, NADIE puede crear cuenta en la app,
 * ni un cliente ni Enrique.
 *
 * Uso (PowerShell o Git Bash; node ya esta instalado):
 *   node scripts/elite/codigos.js generar --cuantos 6 --dias 365
 *   node scripts/elite/codigos.js generar --correo cliente@ejemplo.com --dias 365
 *   node scripts/elite/codigos.js generar --correos ana@x.com,luis@y.com --dias 365
 *   node scripts/elite/codigos.js listar
 *   node scripts/elite/codigos.js listar --correo cliente@ejemplo.com --limite 100
 *
 * Opciones de generar:
 *   --cuantos N     cuantos codigos (1 a 500). Por defecto 1, o uno por correo.
 *   --correo C      a quien se le entrega (queda en issued_to_email).
 *   --correos A,B   varios clientes: un codigo por correo, cada uno a su nombre.
 *   --dias N        cuanto dura el nivel Elite desde el canje. Por defecto 365.
 *   --vigencia N    dias que el codigo puede esperar sin canjearse. Por defecto 365.
 *   --tier T        elite (por defecto) o premium.
 *
 * Variables de entorno:
 *   ATP_JWT             obligatoria. Ver scripts/elite/obtener-jwt.md.
 *                       NUNCA se escribe en el repo ni se imprime completa.
 *   SUPABASE_ANON_KEY   si falta, se lee EXPO_PUBLIC_SUPABASE_ANON_KEY del .env de la raiz.
 *   SUPABASE_URL        opcional; por defecto el proyecto de produccion.
 *
 * Hermano de curl-elite.sh (mismo patron: PostgREST + JWT de admin, sin
 * service_role). Este esta en node para que corra igual en PowerShell, donde
 * bash no existe.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://itqkfozqvpwikogggqng.supabase.co';

function falla(mensaje) {
  console.error('ERROR: ' + mensaje);
  process.exit(1);
}

/** La anon key es publica (viaja en la app); la de admin es el JWT, y esa no se toca. */
function anonKey() {
  if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY.trim();
  const env = path.join(RAIZ, '.env');
  if (fs.existsSync(env)) {
    for (const linea of fs.readFileSync(env, 'utf8').split(/\r?\n/)) {
      if (linea.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
        return linea.slice('EXPO_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/["']/g, '').trim();
      }
    }
  }
  return '';
}

function jwt() {
  const t = (process.env.ATP_JWT || '').trim();
  if (!t) {
    falla('falta ATP_JWT. Sigue scripts/elite/obtener-jwt.md y vuelve a correr esto en la MISMA ventana.');
  }
  // Nunca se imprime completo: solo su largo, que basta para saber si esta ahi.
  return t;
}

function args(lista) {
  const salida = {};
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (!a.startsWith('--')) falla('no entiendo el argumento: ' + a);
    const clave = a.slice(2);
    const valor = lista[i + 1];
    if (valor === undefined || valor.startsWith('--')) falla('falta el valor de --' + clave);
    salida[clave] = valor;
    i++;
  }
  if (salida.jwt || salida.token) {
    falla('el JWT no se pasa como argumento (queda en el historial de la terminal). Va en la variable ATP_JWT.');
  }
  return salida;
}

function entero(valor, nombre, min, max) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) falla(nombre + ' debe ser un entero entre ' + min + ' y ' + max);
  return n;
}

function correosDe(opciones) {
  const crudo = opciones.correos || opciones.correo || '';
  const lista = crudo.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
  for (const c of lista) if (!c.includes('@')) falla('esto no parece un correo: ' + c);
  return lista;
}

async function rpc(nombre, cuerpo) {
  const key = anonKey();
  if (!key) falla('falta SUPABASE_ANON_KEY (o EXPO_PUBLIC_SUPABASE_ANON_KEY en el .env de la raiz)');
  let respuesta;
  try {
    respuesta = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + nombre, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + jwt(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    });
  } catch (e) {
    falla('no se pudo llegar a Supabase (revisa tu conexion): ' + e.message);
  }
  const texto = await respuesta.text();
  if (respuesta.status === 401) {
    falla('HTTP 401: el JWT vencio o no es valido (dura 1 hora). Pide otro con scripts/elite/obtener-jwt.md.');
  }
  if (respuesta.status === 404) {
    falla('HTTP 404: el RPC ' + nombre + ' no existe en produccion. Falta aplicar la migracion (npx supabase db push).');
  }
  if (!respuesta.ok) falla('HTTP ' + respuesta.status + ': ' + texto.slice(0, 300));
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    falla('la respuesta no es JSON: ' + texto.slice(0, 300));
  }
  if (datos && datos.ok === false) {
    if (datos.error === 'not_authorized') {
      falla('tu cuenta no tiene rol admin en profiles, asi que el servidor no emite codigos con ella.');
    }
    falla('el servidor rechazo la llamada: ' + JSON.stringify(datos));
  }
  return datos;
}

function fechaLarga(iso) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fechaCorta(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}

/** El mensaje que se copia y se pega tal cual. No nombra precios, tiendas ni sitios. */
function mensajeParaCliente(codigo, correo, venceISO) {
  const lineas = [];
  lineas.push('Hola. Ya puedes abrir tu cuenta en ATP.');
  lineas.push('');
  lineas.push('1. Instala la app y toca Crear cuenta.');
  lineas.push('2. En el primer campo escribe tu código de activación: ' + codigo);
  if (correo) lineas.push('3. Usa este correo: ' + correo);
  else lineas.push('3. Sigue con tu correo y tu contraseña.');
  lineas.push('4. Abre el correo de confirmación que te llegará y toca el enlace.');
  lineas.push('5. Vuelve a la app y entra con tu correo y tu contraseña.');
  lineas.push('');
  lineas.push('Tu nivel queda activo solo, sin que tengas que hacer nada más.');
  lineas.push('Es el código que va con tu servicio contratado y sirve una sola vez.');
  lineas.push('Actívalo antes del ' + fechaLarga(venceISO) + '.');
  return lineas.join('\n');
}

async function cmdGenerar(opciones) {
  const dias = entero(opciones.dias || '365', '--dias', 1, 3650);
  // 8-sep-2026 (revision en frio): el default era 30 dias. Los codigos se
  // reparten conforme se cierran ventas, asi que un cliente que entraba en la
  // semana cinco leia "este codigo ya vencio". Un ano no traiciona a nadie y
  // sigue habiendo fecha limite (el que nunca vence no se puede desactivar).
  const vigencia = entero(opciones.vigencia || '365', '--vigencia', 1, 3650);
  const tier = (opciones.tier || 'elite').toLowerCase();
  if (tier !== 'elite' && tier !== 'premium') falla('--tier solo acepta elite o premium');
  const correos = correosDe(opciones);
  const cuantos = opciones.cuantos ? entero(opciones.cuantos, '--cuantos', 1, 500) : (correos.length || 1);
  const venceISO = new Date(Date.now() + vigencia * 86400000).toISOString();

  // Un codigo por correo cuando hay lista de correos: asi cada codigo queda a
  // nombre de su cliente y `listar` puede decir quien tiene cual. Sin correos,
  // se emiten sueltos y en la lista apareceran como (sin correo).
  const lotes = correos.length > 0
    ? correos.map((c) => ({ correo: c, cuantos: correos.length === 1 ? cuantos : 1 }))
    : [{ correo: null, cuantos }];

  const emitidos = [];
  for (const lote of lotes) {
    const datos = await rpc('generate_activation_codes', {
      p_count: lote.cuantos,
      p_tier: tier,
      p_duration_days: dias,
      p_source: 'elite',
      p_expires_at: venceISO,
      p_issued_to_email: lote.correo,
    });
    if (!datos || datos.ok !== true || !Array.isArray(datos.codes) || datos.codes.length === 0) {
      falla('el servidor no genero codigos: ' + JSON.stringify(datos));
    }
    for (const codigo of datos.codes) emitidos.push({ codigo, correo: lote.correo });
  }

  console.log('');
  console.log(emitidos.length + ' codigo(s) ' + tier + ', ' + dias + ' dias de nivel desde el canje.');
  console.log('Se pueden canjear hasta el ' + fechaCorta(venceISO) + ' (vigencia del codigo, no del nivel).');
  console.log('');
  for (const e of emitidos) {
    console.log('==================== ' + (e.correo || 'sin correo asignado') + ' ====================');
    console.log('CODIGO: ' + e.codigo + '   ACTIVAR ANTES DEL ' + fechaCorta(venceISO));
    console.log('');
    console.log(mensajeParaCliente(e.codigo, e.correo, venceISO));
    console.log('');
  }
  console.log('Para ver despues cuales se activaron:  node scripts/elite/codigos.js listar');
  if (!correos.length) {
    console.log('Aviso: estos codigos salieron sin correo. Si le pasas --correos a@x.com,b@y.com');
    console.log('cada codigo queda a nombre de su cliente y la lista te dice quien activo cual.');
  }
}

async function cmdListar(opciones) {
  const limite = entero(opciones.limite || '50', '--limite', 1, 500);
  const correo = opciones.correo ? correosDe(opciones)[0] : null;
  const datos = await rpc('listar_codigos_activacion', { p_email: correo, p_limite: limite });
  const filas = (datos && Array.isArray(datos.codigos)) ? datos.codigos : [];
  if (filas.length === 0) {
    console.log(correo ? 'No hay codigos emitidos para ' + correo + '.' : 'Todavia no hay codigos emitidos.');
    return;
  }
  // Anchos en un solo lugar para que el encabezado no se desalinee de las filas.
  const ANCHOS = [15, 11, 8, 32, 12, 20];
  const fila = (celdas) => celdas.map((c, i) => String(c).padEnd(ANCHOS[i])).join('').trimEnd();
  console.log('');
  console.log(fila(['CODIGO', 'ESTADO', 'NIVEL', 'PARA', 'EMITIDO', 'ACTIVADO']));
  for (const f of filas) {
    console.log(fila([
      f.code,
      f.estado,
      f.tier,
      f.issued_to_email || '(sin correo)',
      fechaCorta(f.created_at),
      f.canjeado_en ? fechaCorta(f.canjeado_en) : (f.estado === 'vencido' ? 'vencio ' + fechaCorta(f.expires_at) : '-'),
    ]));
  }
  const pendientes = filas.filter((f) => f.estado === 'pendiente').length;
  const canjeados = filas.filter((f) => f.estado === 'canjeado').length;
  const vencidos = filas.filter((f) => f.estado === 'vencido').length;
  console.log('');
  console.log(filas.length + ' codigo(s): ' + canjeados + ' activados, ' + pendientes + ' sin usar, ' + vencidos + ' vencidos.');
}

function ayuda() {
  const src = fs.readFileSync(__filename, 'utf8').split(/\r?\n/);
  for (const linea of src.slice(1, 32)) console.log(linea.replace(/^ \* ?/, '').replace(/^\/\*\*$/, '').replace(/^ \*\/$/, ''));
}

async function principal() {
  const [comando, ...resto] = process.argv.slice(2);
  const opciones = args(resto);
  if (comando === 'generar') {
    console.log('JWT de ' + jwt().length + ' caracteres en ATP_JWT (no se imprime: con el, cualquiera es tu).');
    await cmdGenerar(opciones);
  } else if (comando === 'listar') {
    await cmdListar(opciones);
  } else {
    ayuda();
    process.exit(2);
  }
}

principal().catch((e) => falla(e && e.message ? e.message : String(e)));
