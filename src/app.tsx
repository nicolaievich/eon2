import { useEffect, useMemo, useState } from 'preact/hooks';
import { supabase } from './lib/supabase';
import { cargarCatalogos, cargarRegistrosRecientes } from './data';
import type { Catalogos, Registro } from './types';

const tiempo = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inicioSemana = (d = new Date()) => { const r = new Date(d); const dia = r.getDay(); r.setDate(r.getDate() - (dia === 0 ? 6 : dia - 1)); return fechaLocal(r); };

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
  const [timerInicio, setTimerInicio] = useState<number | null>(() => { const v = localStorage.getItem('eon2.timerInicio'); return v ? Number(v) : null; });
  const [, tick] = useState(0);

  useEffect(() => {
    if (timerInicio === null) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerInicio]);

  useEffect(() => {
    let vivo = true;
    const iniciar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!vivo) return;
        if (session) {
          setEmail(session.user.email ?? null);
          const [catalogos, registros] = await Promise.all([cargarCatalogos(), cargarRegistrosRecientes()]);
          if (vivo) { setCat(catalogos); setReg(registros); }
        }
      } catch (e) { if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido'); }
      finally { if (vivo) setIniciando(false); }
    };
    iniciar();
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!vivo) return;
      setEmail(session?.user.email ?? null);
      if (session) {
        try {
          const [catalogos, registros] = await Promise.all([cargarCatalogos(), cargarRegistrosRecientes()]);
          if (vivo) { setCat(catalogos); setReg(registros); setError(null); }
        } catch (e) { if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido'); }
      } else { setCat(null); setReg([]); }
    });
    return () => { vivo = false; data.subscription.unsubscribe(); };
  }, []);

  const entrar = async (event: Event) => {
    event.preventDefault(); setLoginBusy(true); setLoginMessage(null); setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
    if (authError) setLoginMessage(authError.message);
    setLoginBusy(false);
  };

  const iniciarTimer = () => { const ahora = Date.now(); localStorage.setItem('eon2.timerInicio', String(ahora)); setTimerInicio(ahora); };
  const detenerTimer = () => { localStorage.removeItem('eon2.timerInicio'); setTimerInicio(null); };
  const timerTexto = timerInicio ? tiempo(Math.floor((Date.now() - timerInicio) / 60000)) + `:${String(Math.floor((Date.now() - timerInicio) / 1000) % 60).padStart(2, '0')}` : '00:00';

  const hoy = fechaLocal();
  const semana = inicioSemana();
  const mes = hoy.slice(0, 7) + '-01';
  const totalHoy = useMemo(() => reg.filter(r => r.fecha >= hoy).reduce((s, r) => s + Number(r.tiempo_minutos || 0), 0), [reg, hoy]);
  const totalSemana = useMemo(() => reg.filter(r => r.fecha >= semana).reduce((s, r) => s + Number(r.tiempo_minutos || 0), 0), [reg, semana]);
  const totalMes = useMemo(() => reg.filter(r => r.fecha >= mes).reduce((s, r) => s + Number(r.tiempo_minutos || 0), 0), [reg, mes]);
  const porProyecto = useMemo(() => { const mapa = new Map<string, number>(); for (const r of reg) { const n = r.proyecto?.nombre ?? 'Sin proyecto'; mapa.set(n, (mapa.get(n) ?? 0) + Number(r.tiempo_minutos || 0)); } return [...mapa.entries()].sort((a,b) => b[1]-a[1]); }, [reg]);

  if (iniciando) return <main class="shell narrow"><section class="card"><b>EÓN 2.1</b><h1>Registro de Tiempos</h1><p class="muted">Iniciando aplicación…</p></section></main>;

  if (!email) {
    const titulo = authView === 'login' ? 'Ingresar' : authView === 'registro' ? 'Crear cuenta' : authView === 'recuperar' ? 'Recuperar contraseña' : authView === 'enviado' ? 'Revisá tu correo' : 'Confirmá tu correo';
    const registrar = async (event: Event) => { event.preventDefault(); setAuthBusy(true); setAuthMessage(null); const { error } = await supabase.auth.signUp({ email: registroEmail.trim(), password: registroPassword }); setAuthBusy(false); if (error) setAuthMessage(error.message); else setAuthView('confirmar'); };
    const recuperar = async (event: Event) => { event.preventDefault(); setAuthBusy(true); setAuthMessage(null); const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: window.location.origin }); setAuthBusy(false); if (error) setAuthMessage(error.message); else setAuthView('enviado'); };
    return <main class="shell narrow auth-shell"><section class="card auth-card"><b>EÓN 2.1</b><h1>{titulo}</h1>
      {authView === 'login' && <form onSubmit={entrar} class="login-form"><label>Email<input type="email" value={loginEmail} onInput={(e) => setLoginEmail((e.currentTarget as HTMLInputElement).value)} autocomplete="email" required /></label><label>Contraseña<input type="password" value={loginPassword} onInput={(e) => setLoginPassword((e.currentTarget as HTMLInputElement).value)} autocomplete="current-password" required /></label><button type="submit" disabled={loginBusy}>{loginBusy ? 'Ingresando…' : 'Ingresar'}</button>{loginMessage && <p class="error">{loginMessage}</p>}<button type="button" class="secondary" onClick={() => setAuthView('registro')}>Crear una cuenta</button><button type="button" class="link-button" onClick={() => setAuthView('recuperar')}>¿Olvidaste tu contraseña?</button></form>}
      {authView === 'registro' && <form onSubmit={registrar} class="login-form"><label>Email<input type="email" value={registroEmail} onInput={(e) => setRegistroEmail((e.currentTarget as HTMLInputElement).value)} autocomplete="email" required /></label><label>Contraseña<input type="password" value={registroPassword} onInput={(e) => setRegistroPassword((e.currentTarget as HTMLInputElement).value)} autocomplete="new-password" minLength={6} required /></label><button type="submit" disabled={authBusy}>{authBusy ? 'Creando…' : 'Registrarme'}</button>{authMessage && <p class="error">{authMessage}</p>}<button type="button" class="link-button" onClick={() => setAuthView('login')}>Ya tengo una cuenta</button></form>}
      {authView === 'recuperar' && <form onSubmit={recuperar} class="login-form"><label>Email<input type="email" value={resetEmail} onInput={(e) => setResetEmail((e.currentTarget as HTMLInputElement).value)} autocomplete="email" required /><button type="submit" disabled={authBusy}>{authBusy ? 'Enviando…' : 'Enviar enlace de recuperación'}</button>{authMessage && <p class="error">{authMessage}</p>}<button type="button" class="link-button" onClick={() => setAuthView('login')}>Volver a ingresar</button></form>}
      {authView === 'enviado' && <div class="auth-message"><p>Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.</p><button onClick={() => setAuthView('login')}>Volver</button></div>}
      {authView === 'confirmar' && <div class="auth-message"><p>Te enviamos un correo de confirmación. Abrí el enlace para activar tu cuenta.</p><button onClick={() => setAuthView('login')}>Volver</button></div>}
      <p class="muted small">EÓN 1.9 continúa siendo la versión estable y no se modifica.</p></section></main>;
  }

  return <main class="shell"><header class="topbar"><div><b>EÓN 2.1</b><h1>{vista === 'hoy' ? 'Hoy' : vista === 'registros' ? 'Registros' : 'Análisis'}</h1><p class="muted">{email}</p></div></header>
    <nav class="nav">{(['hoy','registros','analisis'] as const).map(item => <button class={vista === item ? 'active' : ''} onClick={() => setVista(item)}>{item === 'hoy' ? 'Hoy' : item === 'registros' ? 'Registros' : 'Análisis'}</button>)}</nav>
    {error && <section class="card error">{error}</section>}
    {vista === 'hoy' && <><section class="card hero"><div><span class="muted">Hoy</span><strong>{tiempo(totalHoy)}</strong></div><button onClick={timerInicio ? detenerTimer : iniciarTimer}>{timerInicio ? `Detener ${timerTexto}` : 'Iniciar temporizador'}</button></section><section class="periodos"><article class="card"><span class="muted">Esta semana</span><strong>{tiempo(totalSemana)}</strong></article><article class="card"><span class="muted">Este mes</span><strong>{tiempo(totalMes)}</strong></article></section><section class="grid">{[['Proyectos',cat?.proyectos.length],['Categorías',cat?.categorias.length],['Clientes',cat?.clientes.length],['Registros cargados',reg.length]].map(([n,v]) => <article class="card" key={String(n)}><span class="muted">{n}</span><strong>{v ?? 0}</strong></article>)}</section><section class="card"><b>Actividad reciente</b><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Tiempo</th></tr></thead><tbody>{reg.slice(0,25).map(r => <tr key={r.id}><td>{r.fecha}</td><td>{r.proyecto?.nombre ?? '—'}</td><td>{r.categoria?.nombre ?? '—'}</td><td>{r.cliente?.nombre ?? '—'}</td><td>{tiempo(r.tiempo_minutos)}</td></tr>)}</tbody></table></div></section></>}
    {vista === 'registros' && <section class="card"><b>Registros · últimos 31 días</b><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Detalle</th><th>Tiempo</th></tr></thead><tbody>{reg.map(r => <tr key={r.id}><td>{r.fecha}</td><td>{r.proyecto?.nombre ?? '—'}</td><td>{r.categoria?.nombre ?? '—'}</td><td>{r.cliente?.nombre ?? '—'}</td><td>{r.detalle ?? '—'}</td><td>{tiempo(r.tiempo_minutos)}</td></tr>)}</tbody></table></div></section>}
    {vista === 'analisis' && <><section class="card hero"><div><span class="muted">Este mes</span><strong>{tiempo(totalMes)}</strong></div></section><section class="card"><b>Tiempo por proyecto · últimos 31 días</b><div class="bars">{porProyecto.map(([n,m]) => <div class="bar-row" key={n}><div class="bar-label"><span>{n}</span><b>{tiempo(m)}</b></div><div class="bar"><span style={{width:`${totalMes ? Math.max(2,m/totalMes*100):0}%`}}/></div></div>)}</div></section></>}</main>;
}
