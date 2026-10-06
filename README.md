# EÓN 2.1 ⏳

EÓN 1.9 queda como versión estable y no se modifica.

## Estado actual

EÓN 2 se desarrolla exclusivamente en este repositorio. La interfaz 2.1 organiza el trabajo en:

- **Hoy:** formulario de nuevo registro, total de horas del día, gráfico de torta por categoría y registros de hoy editables.
- **Balances:** consultas rápidas de Hoy, Semana y Mes; búsqueda libre; filtro por campo; rango de fechas; gráfico de torta por categoría y tabla editable.
- **Ajustes:** administración de clientes, categorías y proyectos.
- Interfaz responsive con paleta arena, amarillo y naranja.
- Preact + Vite + TypeScript + Supabase.
- La capa de datos permanece separada de la interfaz para seguir optimizando consultas y poder incorporar RPC cuando corresponda.

## Regla de producción

**`nicolaievich/eon` es EÓN 1.9 y está congelado.**

Todo desarrollo de EÓN 2 se realiza en `nicolaievich/eon2`.
