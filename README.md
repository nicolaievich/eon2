# EÓN 2.0 ⏳

**Versión beta: 2.1.0-beta.1**

EÓN es la app para registrar el tiempo de trabajo de les emprendedores. Permite registrar horas por fecha, proyecto, categoría y cliente; consultar balances y administrar los catálogos.

> **Estado:** beta pública para pruebas. EÓN 1.9 continúa como versión estable y no se modifica.

## Novedades de la beta 2.1.0-beta.1

- Landing pública con presentación del proyecto y acceso directo a crear una cuenta.
- Registro con email, doble ingreso de contraseña y medidor de requisitos.
- Validación de contraseña: 8 caracteres como mínimo, mayúscula, minúscula, número y símbolo.
- Pantalla explícita para revisar el correo y confirmar el registro.
- Inicio de sesión con control para mostrar u ocultar la contraseña.
- Recuperación de acceso por email y formulario para definir una nueva contraseña, con doble ingreso, validador y visor.
- Formularios adaptables a móvil y mensajes de estado en español.

## Autenticación y configuración de Supabase

La autenticación usa Supabase Auth. Para que los flujos de correo funcionen en el dominio de producción:

1. En **Authentication → URL Configuration**, establecer la URL del sitio y permitir las URLs de redirección de la aplicación.
2. En **Authentication → Email Templates**, comprobar las plantillas de confirmación y recuperación.
3. La URL de redirección usada por la aplicación es el origen actual (`window.location.origin`). El dominio desplegado debe estar incluido en las URLs permitidas.
4. Probar confirmación de cuenta, enlace de recuperación vigente y enlace vencido antes de anunciar la beta.

No se guardan contraseñas en la aplicación: Supabase gestiona las credenciales y envía los correos. Las claves públicas necesarias para el cliente se configuran mediante `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Desarrollo

Requisitos: Node.js **20.19 o superior**.

```bash
npm install
npm run dev
```

Para comprobar el build de producción:

```bash
npm run build
npm run preview
```

## Alcance actual

La aplicación incluye registro de tiempos, temporizador persistente, balances, filtros, edición de registros, ajustes de categorías/proyectos/clientes y valores por defecto.

EÓN 2.0 se desarrolla desde cero y, durante esta etapa, reutiliza la base de Supabase de EÓN 1.9 para las pruebas. La versión 1.9 estable permanece separada y sin cambios.

## Próximo paso antes del anuncio público

Completar una prueba real de punta a punta con el proyecto de Supabase de producción: alta → confirmación de correo → inicio de sesión → solicitud de recuperación → nueva contraseña → inicio de sesión con la nueva clave. También verificar las políticas RLS para asegurar que cada cuenta solo acceda a sus propios registros.
