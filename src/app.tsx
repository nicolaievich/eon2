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
  const [fecha, setFecha] = useState(fechaLocal());
  const [proyecto, setProyecto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cliente, setCliente] = useState('');
  const [horas, setHoras] = useState('00');
  const [minutos, setMinutos] = useState('00');
  const [detalle, setDetalle] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensajeRegistro, setMensajeRegistro] = useState<string | null>(null);
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

  const guardarRegistro = async (event: Event) => {
    event.preventDefault();
    setMensajeRegistro(null);
    const categoriaId = Number(categoria);
    const totalMinutos = Number(horas) * 60 + Number(minutos);
    if (!fecha) return setMensajeRegistro('La fecha es obligatoria.');
    if (!Number.isInteger(categoriaId) || categoriaId <= 0) return setMensajeRegistro('Seleccioná una categoría.');
    if (!Number.isInteger(totalMinutos) || totalMinutos <= 0) return setMensajeRegistro('Ingresá un tiempo mayor a 00:00.');
    if (Number(minutos) > 59) return setMensajeRegistro('Los minutos deben estar entre 00 y 59.');
    setGuardando(true);
    const proyectoEncontrado = cat?.proyectos.find(p => p.nombre.toLowerCase() === proyecto.trim().toLowerCase());
    const clienteEncontrado = cat?.clientes.find(c => c.nombre.toLowerCase() === cliente.trim().toLowerCase());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMensajeRegistro('No estás autenticado.'); setGuardando(false); return; }
    const { error: insertError } = await supabase.from('registros').insert({
      fecha,
      proyecto_id: proyectoEncontrado?.id ?? null,
      categoria_id: categoriaId,
      cliente_id: clienteEncontrado?.id ?? null,
      tiempo_minutos: totalMinutos,
      detalle: detalle.trim() || null,
      user_id: user.id
    });
    if (insertError) {
      setMensajeRegistro(`Error: ${insertError.message}`);
    } else {
      setMensajeRegistro('Registro guardado correctamente.');
      setHoras('00'); setMinutos('00'); setDetalle('');
      detenerTimer();
      try { setReg(await cargarRegistrosRecientes()); } catch { /* el registro ya fue guardado */ }
    }
    setGuardando(false);
  };

  const cargarTiempoDelTimer = () => {
    if (!timerInicio) return;
    const segundos = Math.max(0, Math.floor((Date.now() - timerInicio) / 1000));
    setHoras(String(Math.floor(segundos / 3600)).padStart(2, '0'));
    setMinutos(String(Math.floor(segundos / 60) % 60).padStart(2, '0'));
  };
  const timerTexto = timerInicio ? (() => { const segundos = Math.floor((Date.now() - timerInicio) / 1000); return `${String(Math.floor(segundos / 3600)).padStart(2, '0')}:${String(Math.floor(segundos / 60) % 60).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`; })() : '00:00:00';

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
      {authView === 'recuperar' && <form onSubmit={recuperar} class="login-form"><label>Email<input type="email" value={resetEmail} onInput={(e) => setResetEmail((e.currentTarget as HTMLInputElement).value)} autocomplete="email" required /></label><button type="submit" disabled={authBusy}>{authBusy ? 'Enviando…' : 'Enviar enlace de recuperación'}</button>{authMessage && <p class="error">{authMessage}</p>}<button type="button" class="link-button" onClick={() => setAuthView('login')}>Volver a ingresar</button></form>}
      {authView === 'enviado' && <div class="auth-message"><p>Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.</p><button onClick={() => setAuthView('login')}>Volver</button></div>}
      {authView === 'confirmar' && <div class="auth-message"><p>Te enviamos un correo de confirmación. Abrí el enlace para activar tu cuenta.</p><button onClick={() => setAuthView('login')}>Volver</button></div>}
      <p class="muted small">EÓN 1.9 continúa siendo la versión estable y no se modifica.</p></section></main>;
  }

  return <main class="shell"><header class="topbar"><div><b>EÓN 2.1</b><h1>{vista === 'hoy' ? 'Hoy' : vista === 'registros' ? 'Registros' : 'Análisis'}</h1><p class="muted">{email}</p></div></header>
    <nav class="nav">{(['hoy','registros','analisis'] as const).map(item => <button class={vista === item ? 'active' : ''} onClick={() => setVista(item)}>{item === 'hoy' ? 'Hoy' : item === 'registros' ? 'Registros' : 'Análisis'}</button>)}</nav>
    {error && <section class="card error">{error}</section>}
    {vista === 'hoy' && <><section class="card registro-card">
      <div class="registro-heading"><div><span class="eyebrow">REGISTRO</span><h2>Cargar tiempo</h2><p class="muted">Registrá lo que hiciste, cuánto tiempo llevó y guardalo.</p></div></div>
      <form class="registro-form" onSubmit={guardarRegistro}>
        <label>Fecha<input type="date" value={fecha} onInput={e => setFecha((e.currentTarget as HTMLInputElement).value)} required /></label>
        <label>Proyecto<input list="proyectos-lista" value={proyecto} onInput={e => setProyecto((e.currentTarget as HTMLInputElement).value)} placeholder="Buscar proyecto..." autocomplete="off" /><datalist id="proyectos-lista">{cat?.proyectos.map(p => <option value={p.nombre} key={p.id} />)}</datalist></label>
        <label>Categoría
          <select value={categoria} onChange={e => setCategoria((e.currentTarget as HTMLSelectElement).value)} required>
            <option value="">Seleccionar categoría...</option>
            {cat?.categorias.map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label>Cliente<input list="clientes-lista" value={cliente} onInput={e => setCliente((e.currentTarget as HTMLInputElement).value)} placeholder="Buscar cliente..." autocomplete="off" /><datalist id="clientes-lista">{cat?.clientes.map(c => <option value={c.nombre} key={c.id} />)}</datalist></label>
        <div class="campo-tiempo"><label>Tiempo (HH:MM)
          <div class="tiempo-controles"><div class="tiempo-input"><input inputMode="numeric" maxLength={2} value={horas} onInput={e => setHoras((e.currentTarget as HTMLInputElement).value.replace(/\\D/g,'').slice(0,2))} aria-label="Horas" /><span>:</span><input inputMode="numeric" maxLength={2} value={minutos} onInput={e => setMinutos((e.currentTarget as HTMLInputElement).value.replace(/\\D/g,'').slice(0,2))} aria-label="Minutos" /></div>
          <button type="button" class="timer-button" onClick={timerInicio ? () => { cargarTiempoDelTimer(); detenerTimer(); } : iniciarTimer}>{timerInicio ? `⏹ ${timerTexto}` : '▶ Iniciar'}</button>
          <button type="button" class="reset-button" onClick={() => { detenerTimer(); setHoras('00'); setMinutos('00'); }}>↺</button></div>
        </label></div>
        <label class="detalle-field">Detalle<textarea rows={3} value={detalle} onInput={e => setDetalle((e.currentTarget as HTMLTextAreaElement).value)} placeholder="¿Qué hiciste? (opcional)" /></label>
        <button class="guardar-button" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar registro'}</button>
        {mensajeRegistro && <p class={mensajeRegistro.startsWith('Registro') ? 'success' : 'error'}>{mensajeRegistro}</p>}
      </form>
    </section><section class="card hero"><div><span class="muted">Hoy</span><strong>{tiempo(totalHoy)}</strong></div><button onClick={timerInicio ? detenerTimer : iniciarTimer}>{timerInicio ? `Detener ${timerTexto}` : 'Iniciar temporizador'}</button></section><section class="periodos"><article class="card"><span class="muted">Esta semana</span><strong>{tiempo(totalSemana)}</strong></article><article class="card"><span class="muted">Este mes</span><strong>{tiempo(totalMes)}</strong></article></section><section class="grid">{[['Proyectos',cat?.proyectos.length],['Categorías',cat?.categorias.length],['Clientes',cat?.clientes.length],['Registros cargados',reg.length]].map(([n,v]) => <article class="card" key={String(n)}><span class="muted">{n}</span><strong>{v ?? 0}</strong></article>)}</section><section class="card"><b>Actividad reciente</b><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Tiempo</th></tr></thead><tbody>{reg.slice(0,25).map(r => <tr key={r.id}><td>{r.fecha}</td><td>{r.proyecto?.nombre ?? '—'}</td><td>{r.categoria?.nombre ?? '—'}</td><td>{r.cliente?.nombre ?? '—'}</td><td>{tiempo(r.tiempo_minutos)}</td></tr>)}</tbody></table></div></section></>}
    {vista === 'registros' && <section class="card"><b>Registros · últimos 31 días</b><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Detalle</th><th>Tiempo</th></tr></thead><tbody>{reg.map(r => <tr key={r.id}><td>{r.fecha}</td><td>{r.proyecto?.nombre ?? '—'}</td><td>{r.categoria?.nombre ?? '—'}</td><td>{r.cliente?.nombre ?? '—'}</td><td>{r.detalle ?? '—'}</td><td>{tiempo(r.tiempo_minutos)}</td></tr>)}</tbody></table></div></section>}
    {vista === 'analisis' && <><section class="card hero"><div><span class="muted">Este mes</span><strong>{tiempo(totalMes)}</strong></div></section><section class="card"><b>Tiempo por proyecto · últimos 31 días</b><div class="bars">{porProyecto.map(([n,m]) => <div class="bar-row" key={n}><div class="bar-label"><span>{n}</span><b>{tiempo(m)}</b></div><div class="bar"><span style={{width:`${totalMes ? Math.max(2,m/totalMes*100):0}%`}}/></div></div>)}</div></section></>}</main>;
}
