# EÓN 2.0 ⏳

EÓN 1.9 queda como versión estable y no se modifica.

## Estrategia inicial

EÓN 2.0 se desarrolla desde cero en este repositorio y utiliza inicialmente la misma base de Supabase que 1.9 para disponer de datos reales de prueba.

**Durante esta etapa 2.0 es solo lectura:** no realiza INSERT, UPDATE ni DELETE.

## Objetivos

- Apertura rápida y consultas en paralelo.
- Proyectos como eje del análisis.
- Caché local e IndexedDB.
- Temporizador persistente.
- PWA/offline.
- Preact + CSS propio.
- RPC de PostgreSQL para agregaciones.

## RPC

Una RPC será una función PostgreSQL ejecutada desde Supabase. Por ejemplo, en lugar de descargar miles de registros para sumar horas por proyecto, EÓN podrá pedir a PostgreSQL directamente los totales del período y recibir únicamente los resultados agrupados.

## Próximo paso

Antes de crear las RPC definitivas hay que revisar el esquema SQL real de Supabase (tablas, tipos y RLS). No se ejecutan cambios de base de datos desde este repositorio todavía.
