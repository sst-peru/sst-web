# sst-web

Panel web del sistema de gestión de **Seguridad y Salud en el Trabajo** (Ley 29783 — Perú).
Lo usa el comité de SST y el supervisor. Consume el mismo API que la app Android: [`sst-api`](https://github.com/sst-peru/sst-api).

## Stack

React 18 · TypeScript · Vite 6 · React Router 6 · TanStack Query 5 · Axios

## Levantarlo en local

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
bash scripts/setup-hooks.sh   # activa la validación de commits
```

Necesitas `sst-api` corriendo en `http://localhost:8000`. Vite hace proxy de `/api` hacia ahí, así
que en desarrollo no hay problemas de CORS. Si tu backend está en otro puerto:

```bash
VITE_API_PROXY=http://localhost:9000 npm run dev
```

Usuarios de prueba (después de correr `python manage.py seed_demo` en el API):
`supervisor` / `demo12345`.

## Estructura

```
src/
├── api/
│   ├── client.ts      cliente axios + JWT + renovación automática del token
│   ├── endpoints.ts   una función por endpoint del API
│   └── types.ts       tipos que reflejan el contrato del API
├── components/        Layout, ProtectedRoute
├── features/
│   ├── auth/          AuthContext y login
│   ├── dashboard/     tablero de KPIs y resultados del A/B test
│   ├── reports/       listado, detalle y cierre de hallazgos; inspecciones
│   └── iperc/         matriz IPERC
└── styles/global.css
```

## Pantallas

| Ruta | Qué muestra |
|------|-------------|
| `/login` | Ingreso con usuario y contraseña (JWT) |
| `/` | Tablero: MTTR, hallazgos abiertos, cumplimiento de inspecciones, vencidas |
| `/reportes` | Listado filtrable por estado, tipo y área |
| `/reportes/:id` | Detalle con foto, GPS, bitácora y cierre del hallazgo |
| `/iperc` | Matriz IPERC con nivel de riesgo calculado |
| `/inspecciones` | Cumplimiento del programa de inspecciones |
| `/experimento` | Resultados del A/B test: reportes por usuario en cada variante |

## Una decisión que conviene conocer

**Renovación del token.** El interceptor de `client.ts` detecta un `401`, renueva el access token
con el refresh y reintenta la petición original una sola vez. Si varias peticiones fallan a la vez,
comparten la misma promesa de renovación (`refreshing`) para no disparar cinco refresh en paralelo.
Si el refresh también falla, limpia los tokens y manda al login.

Los tokens viven en `localStorage`. Para un trabajo de curso está bien; si esto fuera a producción
real conviene mover el refresh token a una cookie `httpOnly` para reducir el riesgo de XSS.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Build de producción en `dist/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |

## Cómo contribuir

Ramas, Conventional Commits y merges: ver [CONTRIBUTING.md](CONTRIBUTING.md).
