# Cómo obtener tu JWT para los comandos Elite

Los RPC de Elite (`generate_activation_codes`, `listar_codigos_activacion` y `elite_cargar_evaluacion`) se llaman con tu sesión de admin, nunca con `service_role`. Esa sesión es un JWT (access token) de Supabase Auth. La app no lo muestra en Ajustes, así que se pide con un `curl` al endpoint de login.

## Antes de empezar

- Git Bash (Windows) o cualquier terminal con `curl` y `node`.
- Estar en la raíz del repo (`EliteTimer`).
- La anon key. No va en este documento: sale de `.env` (variable `EXPO_PUBLIC_SUPABASE_ANON_KEY`) o de `app.json` (`expo.extra.supabaseAnonKey`). `curl-elite.sh` la lee solo de `.env` si no la exportas.

## Paso único (pegar en la terminal)

```bash
read -p "Correo: " ATP_CORREO
read -s -p "Contraseña: " ATP_PASS; echo
export SUPABASE_ANON_KEY="$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '\r')"
export ATP_JWT="$(curl -sS -X POST "https://itqkfozqvpwikogggqng.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "$(node -e 'console.log(JSON.stringify({email: process.argv[1], password: process.argv[2]}))' "$ATP_CORREO" "$ATP_PASS")" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const r=JSON.parse(d);if(!r.access_token){console.error(r);process.exit(1)}console.log(r.access_token)})')"
unset ATP_PASS
echo "JWT listo (${#ATP_JWT} caracteres)"
```

Si dice `JWT listo (900 y tantos caracteres)`, ya puedes correr `bash scripts/elite/curl-elite.sh ...` en esa misma terminal. Si imprime un objeto con `error` o `invalid_grant`, el correo o la contraseña están mal.

`read -s` no muestra la contraseña al escribirla y `unset` la borra de la sesión; el `curl` va dentro de `$(...)`, así que ni la contraseña ni el token quedan en el historial de Git Bash.

## Paso único en PowerShell (Windows)

Mismo resultado que el bloque de arriba, para quien trabaja en PowerShell y no en Git Bash. Pega el bloque completo, cambiando la primera línea por la ruta real del repo. Se corre una vez por sesión de terminal: el token vive en esa ventana y muere al cerrarla.

```powershell
cd C:\ruta\a\EliteTimer
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$correo = Read-Host "Correo"
$segura = Read-Host "Contrasena" -AsSecureString
$plano = [System.Net.NetworkCredential]::new("", $segura).Password
$linea = (Select-String -Path .env -Pattern '^EXPO_PUBLIC_SUPABASE_ANON_KEY=').Line
$env:SUPABASE_ANON_KEY = ($linea -replace '^EXPO_PUBLIC_SUPABASE_ANON_KEY=', '').Trim().Trim('"').Trim("'")
$cuerpo = @{ email = $correo; password = $plano } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "https://itqkfozqvpwikogggqng.supabase.co/auth/v1/token?grant_type=password" -Headers @{ apikey = $env:SUPABASE_ANON_KEY } -ContentType "application/json" -Body $cuerpo
$env:ATP_JWT = $r.access_token
$plano = $null
$cuerpo = $null
"JWT listo ($($env:ATP_JWT.Length) caracteres)"
```

Si dice `JWT listo (900 y tantos caracteres)`, ya puedes correr `node scripts/elite/codigos.js ...` en esa misma ventana. Si sale un error de autenticación, el correo o la contraseña están mal.

`Read-Host -AsSecureString` no muestra la contraseña al escribirla, y las dos líneas que ponen `$plano` y `$cuerpo` en `$null` la borran de la memoria de la sesión. La contraseña nunca queda en el historial porque no se escribe en la línea de comandos.

La línea de `OutputEncoding` es para que los acentos del mensaje que se le manda al cliente salgan bien al copiarlos.

## Lo que tienes que saber del token

- **Dura 1 hora.** Si un comando responde `HTTP 401`, repite el paso único y vuelve a intentar. No hay que "renovar" nada: se pide otro.
- **Nunca lo pegues en un chat, en un correo ni en un archivo del repo.** Con él, cualquiera es tú durante esa hora, incluido el permiso de admin para emitir códigos. Vive solo en la variable `ATP_JWT` de esa terminal; cerrar la ventana lo tira.
- Si alguna vez lo pegaste donde no debías: cambia tu contraseña en la app (o en el panel de Supabase, Authentication > Users > tu usuario > Reset password) y el token deja de servir al vencer; la contraseña nueva invalida los refresh tokens.
- El JWT sirve solo para lo que tu rol permite. `generate_activation_codes` y `elite_cargar_evaluacion` comprueban `role='admin'` en `profiles`; con la cuenta de otra persona responden `{"ok": false, "error": "not_authorized"}`.

## Si prefieres no escribir la contraseña en la terminal

Alternativa: iniciar sesión en la app en un dispositivo y leer el token desde el panel de Supabase no es posible (el panel no lista tokens). La opción más simple sigue siendo el paso único de arriba. Una pantalla de admin dentro de la app queda para la fase 2 (pivote 2.4).
