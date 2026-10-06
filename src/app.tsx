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
    return (
      <main class="shell narrow">
        <section class="card">
          <b>EÓN 2.0 · ALPHA</b>
          <h1>Registro de Tiempos</h1>
          <p class="muted">Nueva generación de EÓN. Esta versión trabaja inicialmente en modo de solo lectura.</p>

          <form onSubmit={entrar} class="login-form">
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onInput={(e) => setLoginEmail((e.currentTarget as HTMLInputElement).value)}
                autocomplete="email"
                required
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={loginPassword}
                onInput={(e) => setLoginPassword((e.currentTarget as HTMLInputElement).value)}
                autocomplete="current-password"
                required
              />
            </label>

            <button type="submit" disabled={loginBusy}>
              {loginBusy ? 'Ingresando…' : 'Ingresar'}
            </button>

            {loginMessage && <p class="error">{loginMessage}</p>}
          </form>

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
