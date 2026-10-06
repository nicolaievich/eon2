import { useEffect, useState } from 'preact/hooks';
import { supabase } from './lib/supabase';
import { cargarCatalogos, cargarUltimosRegistros } from './data';
import type { Catalogos, Registro } from './types';

const tiempo = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function App() {
  const [iniciando, setIniciando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [reg, setReg] = useState<Registro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [authView, setAuthView] = useState<'login' | 'registro' | 'recuperar' | 'enviado' | 'confirmar'>('login');
  const [registroEmail, setRegistroEmail] = useState('');
  const [registroPassword, setRegistroPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [vista, setVista] = useState<'hoy' | 'registros' | 'analisis'>('hoy');

  useEffect(() => {
    let vivo = true;

    const iniciar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!vivo) return;

        if (session) {
          setEmail(session.user.email ?? null);
          const [catalogos, registros] = await Promise.all([
            cargarCatalogos(),
            cargarUltimosRegistros(),
          ]);
          if (vivo) {
            setCat(catalogos);
            setReg(registros);
          }
        }
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        if (vivo) setIniciando(false);
      }
    };

    iniciar();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!vivo) return;

      setEmail(session?.user.email ?? null);

      if (session) {
        try {
          const [catalogos, registros] = await Promise.all([
            cargarCatalogos(),
            cargarUltimosRegistros(),
          ]);
          if (vivo) {
            setCat(catalogos);
            setReg(registros);
            setError(null);
          }
        } catch (e) {
          if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido');
        }
      } else {
        setCat(null);
        setReg([]);
      }
    });

    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const entrar = async (event: Event) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginMessage(null);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (authError) setLoginMessage(authError.message);
    setLoginBusy(false);
  };

  if (iniciando) {
    return (
      <main class="shell narrow">
        <section class="card">
          <b>EÓN 2.0 · ALPHA</b>
          <h1>Registro de Tiempos</h1>
          <p class="muted">Iniciando aplicación…</p>
        </section>
      </main>
    );
  }

  if (!email) {
    const titulo = authView === 'login' ? 'Ingresar' : authView === 'registro' ? 'Crear cuenta' : authView === 'recuperar' ? 'Recuperar contraseña' : authView === 'enviado' ? 'Revisá tu correo' : 'Confirmá tu correo';

    const registrar = async (event: Event) => {
      event.preventDefault(); setAuthBusy(true); setAuthMessage(null);
      const { error } = await supabase.auth.signUp({ email: registroEmail.trim(), password: registroPassword });
      setAuthBusy(false);
      if (error) setAuthMessage(error.message);
      else setAuthView('confirmar');
    };

    const recuperar = async (event: Event) => {
      event.preventDefault(); setAuthBusy(true); setAuthMessage(null);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: window.location.origin });
      setAuthBusy(false);
      if (error) setAuthMessage(error.message);
      else setAuthView('enviado');
    };

    const entrar = async (event: Event) => {
      event.preventDefault(); setLoginBusy(true); setLoginMessage(null); setError(null);
      const { error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
      if (authError) setLoginMessage(authError.message);
      setLoginBusy(false);
    };

    return (
      <main class="shell narrow auth-shell">
        <section class="card auth-card">
          <b>EÓN 2.0 · ALPHA</b>
          <h1>{titulo}</h1>

          {authView === 'login' && <form onSubmit={entrar} class="login-form">
            <label>Email<input type="email" value={loginEmail} onInput={(e) => setLoginEmail((e.currentTarget as HTMLInputElement).value)} autocomplete="email" required /></label>
            <label>Contraseña<input type="password" value={loginPassword} onInput={(e) => setLoginPassword((e.currentTarget as HTMLInputElement).value)} autocomplete="current-password" required /></label>
            <button type="submit" disabled={loginBusy}>{loginBusy ? 'Ingresando…' : 'Ingresar'}</button>
            {loginMessage && <p class="error">{loginMessage}</p>}
            <button type="button" class="secondary" onClick={() => {setAuthMessage(null);setAuthView('registro')}}>Crear una cuenta</button>
            <button type="button" class="link-button" onClick={() => {setAuthMessage(null);setAuthView('recuperar')}}>¿Olvidaste tu contraseña?</button>
          </form>}

          {authView === 'registro' && <form onSubmit={registrar} class="login-form">
            <label>Email<input type="email" value={registroEmail} onInput={(e) => setRegistroEmail((e.currentTarget as HTMLInputElement).value)} autocomplete="email" required /></label>
            <label>Contraseña<input type="password" value={registroPassword} onInput={(e) => setRegistroPassword((e.currentTarget as HTMLInputElement).value)} autocomplete="new-password" minlength="6" required /></label>
            <button type="submit" disabled={authBusy}>{authBusy ? 'Creando…' : 'Registrarme'}</button>
            {authMessage && <p class="error">{authMessage}</p>}
            <button type="button" class="link-button" onClick={() => setAuthView('login')}>Ya tengo una cuenta</button>
          </form>}

          {authView === 'recuperar' && <form onSubmit={recuperar} class="login-form">
            <label>Email<input type="email" value={resetEmail} onInput={(e) => setResetEmail((e.currentTarget as HTMLInputElement).value)} autocomplete="email" required /></label>
            <button type="submit" disabled={authBusy}>{authBusy ? 'Enviando…' : 'Enviar enlace de recuperación'}</button>
            {authMessage && <p class="error">{authMessage}</p>}
            <button type="button" class="link-button" onClick={() => setAuthView('login')}>Volver a ingresar</button>
          </form>}

          {authView === 'enviado' && <div class="auth-message">
            <p>Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.</p>
            <button type="button" onClick={() => setAuthView('login')}>Volver a ingresar</button>
          </div>}

          {authView === 'confirmar' && <div class="auth-message">
            <p>Te enviamos un correo de confirmación. Abrí el enlace del mensaje para activar tu cuenta.</p>
            <button type="button" onClick={() => setAuthView('login')}>Volver a ingresar</button>
          </div>}

          <p class="muted small">EÓN 1.9 continúa siendo la versión estable y no se modifica.</p>
        </section>
      </main>
    );
  }

  const total = reg.reduce((s, r) => s + Number(r.tiempo_minutos || 0), 0);
  const porProyecto = new Map<string, number>();
  for (const r of reg) {
    const nombre = r.proyecto?.nombre ?? 'Sin proyecto';
    porProyecto.set(nombre, (porProyecto.get(nombre) ?? 0) + Number(r.tiempo_minutos || 0));
  }
  const proyectosOrdenados = [...porProyecto.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main class="shell">
      <header class="topbar">
        <div>
          <b>EÓN 2.0 · ALPHA 1</b>
          <h1>{vista === 'hoy' ? 'Hoy' : vista === 'registros' ? 'Registros' : 'Análisis'}</h1>
          <p class="muted">{email}</p>
        </div>
      </header>

      <nav class="nav">
        {(['hoy', 'registros', 'analisis'] as const).map((item) => (
          <button class={vista === item ? 'active' : ''} onClick={() => setVista(item)}>
            {item === 'hoy' ? 'Hoy' : item === 'registros' ? 'Registros' : 'Análisis'}
          </button>
        ))}
      </nav>

      {error && <section class="card error">{error}</section>}

      {vista === 'hoy' && <>
      <section class="card hero">
        <div>
          <span class="muted">Últimos 90 días</span>
          <strong>{tiempo(total)}</strong>
        </div>
        <span class="badge">SOLO LECTURA</span>
      </section>

      <section class="grid">
        {[
          ['Proyectos', cat?.proyectos.length],
          ['Categorías', cat?.categorias.length],
          ['Clientes', cat?.clientes.length],
          ['Registros', reg.length],
        ].map(([nombre, valor]) => (
          <article class="card" key={String(nombre)}>
            <span class="muted">{nombre}</span>
            <strong>{valor ?? 0}</strong>
          </article>
        ))}
      </section>

      <section class="card">
        <b>Actividad reciente</b>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Categoría</th>
                <th>Cliente</th>
                <th>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {reg.slice(0, 25).map((r) => (
                <tr key={r.id}>
                  <td>{r.fecha}</td>
                  <td>{r.proyecto?.nombre ?? '—'}</td>
                  <td>{r.categoria?.nombre ?? '—'}</td>
                  <td>{r.cliente?.nombre ?? '—'}</td>
                  <td>{tiempo(r.tiempo_minutos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </>}

      {vista === 'registros' && (
        <section class="card">
          <b>Registros · últimos 90 días</b>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Detalle</th><th>Tiempo</th></tr></thead>
              <tbody>{reg.map((r) => (
                <tr key={r.id}>
                  <td>{r.fecha}</td>
                  <td>{r.proyecto?.nombre ?? '—'}</td>
                  <td>{r.categoria?.nombre ?? '—'}</td>
                  <td>{r.cliente?.nombre ?? '—'}</td>
                  <td>{r.detalle ?? '—'}</td>
                  <td>{tiempo(r.tiempo_minutos)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      {vista === 'analisis' && (
        <>
          <section class="card hero">
            <div><span class="muted">Total · últimos 90 días</span><strong>{tiempo(total)}</strong></div>
          </section>
          <section class="card">
            <b>Tiempo por proyecto</b>
            <div class="bars">
              {proyectosOrdenados.map(([nombre, minutos]) => (
                <div class="bar-row" key={nombre}>
                  <div class="bar-label"><span>{nombre}</span><b>{tiempo(minutos)}</b></div>
                  <div class="bar"><span style={{ width: `${total ? Math.max(2, minutos / total * 100) : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
