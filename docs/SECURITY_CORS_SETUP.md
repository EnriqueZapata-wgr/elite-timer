# Configuración CORS en Supabase

## Paso 1: Supabase Dashboard > Settings > API

En la sección "CORS Allowed Origins", reemplaza `*` con:

```
https://itqkfozqvpwikogggqng.supabase.co
http://localhost:8081
http://localhost:3000
http://localhost:19006
```

- `localhost:8081` — Expo dev server
- `localhost:3000` — Next.js coach dashboard dev
- `localhost:19006` — Expo web dev

## Paso 2: Cuando publiques a producción, actualizar a:

```
https://itqkfozqvpwikogggqng.supabase.co
https://tu-dominio-coach.vercel.app
```

Remover TODOS los localhost.

## Paso 3: Verificar

Desde el navegador, abre DevTools > Network. Cualquier request a Supabase debe tener header:
`Access-Control-Allow-Origin: [tu dominio]`

Si dice `*`, CORS no está restringido.

## Security Checklist

- [ ] CORS restringido (no `*`)
- [ ] RLS habilitado en todas las tablas (migración 038)
- [ ] No hay `service_role` key en código cliente
- [ ] No hay `console.log` de keys/tokens
- [ ] Todas las URLs usan HTTPS en producción
- [ ] `X-Client-Info` header configurado en supabase.ts
