# EÓN 2.0 ⏳

EÓN 1.9 queda como versión estable y no se modifica.

## Estado actual

EÓN 2.0 se desarrolla exclusivamente en este repositorio. La interfaz ya incorpora:

- Registro de tiempo.
- Balances de **Hoy, Semana y Mes**.
- Gráficos de tiempo por proyecto y categoría.
- Ajustes para administrar clientes, categorías y proyectos.
- Color configurable para categorías.
- Preact + Vite + TypeScript.
- Consultas acotadas al período necesario en lugar de usar el balance de 90 días como vista principal.

La escritura de datos está asociada al usuario autenticado mediante `user_id` y respeta las políticas RLS existentes de Supabase.

## Arquitectura

La capa de datos está separada de la interfaz en `src/data.ts`. Esto permite seguir optimizando consultas y reemplazar consultas de detalle por RPC de PostgreSQL cuando corresponda.

Objetivos siguientes:

- Caché local e IndexedDB.
- Temporizador persistente.
- PWA/offline.
- RPC para agregaciones.
- Validación de esquema y RLS antes de ampliar operaciones destructivas.
- Mejoras progresivas de edición y experiencia móvil.

## Regla de producción

**`nicolaievich/eon` es EÓN 1.9 y está congelado.**

Todo desarrollo de EÓN 2.0 se realiza en `nicolaievich/eon2`.
