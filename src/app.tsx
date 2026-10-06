import { useEffect, useMemo, useState } from 'preact/hooks';
import { supabase } from './lib/supabase';
import { cargarCatalogos, cargarRegistros } from './data';
import type { Catalogos, Registro } from './types';

const tiempo = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inicioSemana = (d = new Date()) => { const r = new Date(d); const dia = r.getDay(); r.setDate(r.getDate() - (dia === 0 ? 6 : dia - 1)); return fechaLocal(r); };
const inicioMes = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

type BalancePreset = 'hoy' | 'semana' | 'mes';
type Editable = { fecha: string; proyecto_id: string; categoria_id: string; cliente_id: string; tiempo_minutos: string; detalle: string };

function Pie({ datos }: { datos: { nombre: string; minutos: number }[] }) {
  const total = datos.reduce((s, x) => s + x.minutos, 0);
  let acumulado = 0;
  const colores = ['#ed7622','#d7a514','#65751b','#b98500','#c95d10','#8b7a42','#e39b3f','#9c8f68'];
  const stops = datos.length ? datos.map((x, i) => {
    const ini = acumulado / total * 100; acumulado += x.minutos;
    return `${colores[i % colores.length]} ${ini}% ${acumulado / total * 100}%`;
  }).join(', ') : '#e1d1b1 0 100%';
  return <div class="pie-layout">
    <div class="pie" style={{ background: `conic-gradient(${stops})` }} aria-label="Distribución por categoría" />
    <div class="legend">{datos.map((x, i) => <div class="legend-row" key={x.nombre}><span class="legend-dot" style={{ background: colores[i % colores.length] }} /><span>{x.nombre}</span><b>{tiempo(x.minutos)}</b></div>)}</div>
  </div>;
}

export function App() {
  const [iniciando, setIniciando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [regHoy, setRegHoy] = useState<Registro[]>([]);
  const [balances, setBalances] = useState<Registro[]>([]);
  const [vista, setVista] = useState<'hoy' | 'balances'>('hoy');
  const [balancePreset, setBalancePreset] = useState<BalancePreset>('hoy');
  const [error, setError] = useState<string | null>(null);
  const [cargandoBalance, setCargandoBalance] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fCategoria, setFCategoria] = useState('');
  const [fProyecto, setFProyecto] = useState('');
  const [fCliente, setFCliente] = useState('');
  const [fDetalle, setFDetalle] = useState('');
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

  const [fecha, setFecha] = useState(fechaLocal());
  const [proyecto, setProyecto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cliente, setCliente] = useState('');
  const [horas, setHoras] = useState('00');
  const [minutos, setMinutos] = useState('00');
  const [detalle, setDetalle] = useState('');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && vivo) {
          setEmail(session.user.email ?? null);
          const catalogos = await cargarCatalogos();
          const hoy = fechaLocal();
          const registros = await cargarRegistros(hoy, hoy);
          if (vivo) { setCat(catalogos); setRegHoy(registros); }
        }
      } catch (e) { if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido'); }
      finally { if (vivo) setIniciando(false); }
    })();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => { vivo = false; data.subscription.unsubscribe(); };
  }, []);

  const entrar = async (event: Event) => {
    event.preventDefault(); setLoginBusy(true); setLoginMessage(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPassword });
    if (authError) setLoginMessage(authError.message);
    setLoginBusy(false);
  };

  const recargarHoy = async () => {
    try { setRegHoy(await cargarRegistros(fechaLocal(), fechaLocal())); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los registros.'); }
  };

  const guardarNuevo = async (event: Event) => {
    event.preventDefault(); setMensaje(null);
    const categoriaId = Number(categoria);
    const totalMinutos = Number(horas) * 60 + Number(minutos);
    if (!fecha) return setMensaje('La fecha es obligatoria.');
    if (!Number.isInteger(categoriaId) || categoriaId <= 0) return setMensaje('Seleccioná una categoría.');
    if (!Number.isInteger(totalMinutos) || totalMinutos <= 0) return setMensaje('Ingresá un tiempo mayor a 00:00.');
    if (Number(minutos) > 59) return setMensaje('Los minutos deben estar entre 00 y 59.');
    setGuardandoNuevo(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMensaje('No estás autenticado.'); setGuardandoNuevo(false); return; }
    const proyectoId = cat?.proyectos.find(p => p.nombre.toLowerCase() === proyecto.trim().toLowerCase())?.id ?? null;
    const clienteId = cat?.clientes.find(c => c.nombre.toLowerCase() === cliente.trim().toLowerCase())?.id ?? null;
    const { error: insertError } = await supabase.from('registros').insert({
      fecha, proyecto_id: proyectoId, categoria_id: categoriaId, cliente_id: clienteId,
      tiempo_minutos: totalMinutos, detalle: detalle.trim() || null, user_id: user.id
    });
    if (insertError) setMensaje(`Error: ${insertError.message}`);
    else { setMensaje('Registro guardado correctamente.'); setHoras('00'); setMinutos('00'); setDetalle(''); setProyecto(''); setCategoria(''); setCliente(''); if (fecha === fechaLocal()) await recargarHoy(); }
    setGuardandoNuevo(false);
  };

  const lanzarBalance = async (preset: BalancePreset = balancePreset) => {
    setCargandoBalance(true); setError(null); setMensaje(null);
    const hoy = fechaLocal();
    const desde = preset === 'hoy' ? hoy : preset === 'semana' ? inicioSemana() : inicioMes();
    try {
      const registros = await cargarRegistros(desde, hoy);
      setBalances(registros); setBalancePreset(preset); setBusqueda(''); setFDesde(''); setFHasta(''); setFCategoria(''); setFProyecto(''); setFCliente(''); setFDetalle('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo consultar el balance.'); }
    finally { setCargandoBalance(false); }
  };

  const buscar = async () => {
    setCargandoBalance(true); setError(null);
    const hoy = fechaLocal();
    const desde = fDesde || inicioMes();
    const hasta = fHasta || hoy;
    try { setBalances(await cargarRegistros(desde, hasta)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo realizar la búsqueda.'); }
    finally { setCargandoBalance(false); }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return balances.filter(r => {
      const valores = [r.fecha, r.proyecto?.nombre ?? '', r.categoria?.nombre ?? '', r.cliente?.nombre ?? '', r.detalle ?? ''].map(x => x.toLowerCase());
      return (!q || valores.some(x => x.includes(q))) &&
        (!fCategoria || String(r.categoria_id) === fCategoria) &&
        (!fProyecto || String(r.proyecto_id) === fProyecto) &&
        (!fCliente || String(r.cliente_id) === fCliente) &&
        (!fDetalle || (r.detalle ?? '').toLowerCase().includes(fDetalle.toLowerCase()));
    });
  }, [balances, busqueda, fCategoria, fProyecto, fCliente, fDetalle]);

  const datosHoy = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of regHoy) { const n = r.categoria?.nombre ?? 'Sin categoría'; mapa.set(n, (mapa.get(n) ?? 0) + Number(r.tiempo_minutos)); }
    return [...mapa.entries()].map(([nombre, minutos]) => ({ nombre, minutos })).sort((a,b) => b.minutos-a.minutos);
  }, [regHoy]);

  const datosBalance = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of filtrados) { const n = r.categoria?.nombre ?? 'Sin categoría'; mapa.set(n, (mapa.get(n) ?? 0) + Number(r.tiempo_minutos)); }
    return [...mapa.entries()].map(([nombre, minutos]) => ({ nombre, minutos })).sort((a,b) => b.minutos-a.minutos);
  }, [filtrados]);

  const totalHoy = regHoy.reduce((s,r) => s + Number(r.tiempo_minutos), 0);
  const totalBalance = filtrados.reduce((s,r) => s + Number(r.tiempo_minutos), 0);

  const editar = async (r: Registro, campo: string, valor: string) => {
    setGuardando(r.id);
    let patch: Record<string, unknown> = {};
    if (campo === 'fecha') patch.fecha = valor;
    if (campo === 'proyecto_id') patch.proyecto_id = valor ? Number(valor) : null;
    if (campo === 'categoria_id') patch.categoria_id = Number(valor);
    if (campo === 'cliente_id') patch.cliente_id = valor ? Number(valor) : null;
    if (campo === 'tiempo_minutos') patch.tiempo_minutos = Math.max(1, Number(valor) || 1);
    if (campo === 'detalle') patch.detalle = valor.trim() || null;
    const { error: updateError } = await supabase.from('registros').update(patch).eq('id', r.id);
    if (updateError) setError(`No se pudo guardar el registro: ${updateError.message}`);
    else {
      const actualizar = (lista: Registro[]) => lista.map(x => x.id === r.id ? { ...x, ...patch,
        proyecto: campo === 'proyecto_id' ? (cat?.proyectos.find(p => p.id === Number(valor)) ? { nombre: cat.proyectos.find(p => p.id === Number(valor))!.nombre } : null) : x.proyecto,
        categoria: campo === 'categoria_id' ? (cat?.categorias.find(c => c.id === Number(valor)) ? { nombre: cat.categorias.find(c => c.id === Number(valor))!.nombre } : x.categoria),
        cliente: campo === 'cliente_id' ? (cat?.clientes.find(c => c.id === Number(valor)) ? { nombre: cat.clientes.find(c => c.id === Number(valor))!.nombre } : null) : x.cliente
      } as Registro : x);
      setRegHoy(actualizar); setBalances(actualizar);
    }
    setGuardando(null);
  };

  if (iniciando) return <main class="shell narrow"><section class="card"><b>EÓN 2.1</b><h1>Registro de Tiempos</h1><p class="muted">Iniciando aplicación…</p></section></main>;

  if (!email) return <main class="shell narrow auth-shell"><section class="card auth-card"><b>EÓN 2.1</b><h1>Ingresar</h1><form onSubmit={entrar} class="login-form">
    <label>Email<input type="email" value={loginEmail} onInput={e => setLoginEmail((e.currentTarget as HTMLInputElement).value)} required /></label>
    <label>Contraseña<input type="password" value={loginPassword} onInput={e => setLoginPassword((e.currentTarget as HTMLInputElement).value)} required /></label>
    <button disabled={loginBusy}>{loginBusy ? 'Ingresando…' : 'Ingresar'}</button>
    {loginMessage && <p class="error">{loginMessage}</p>}
  </form><p class="muted small">EÓN 1.9 continúa siendo la versión estable y no se modifica.</p></section></main>;

  const fila = (r: Registro) => <tr key={r.id}>
    <td><input class="cell-input" type="date" value={r.fecha} onChange={e => editar(r,'fecha',(e.currentTarget as HTMLInputElement).value)} /></td>
    <td><select class="cell-input" value={r.proyecto_id ? String(r.proyecto_id) : ''} onChange={e => editar(r,'proyecto_id',(e.currentTarget as HTMLSelectElement).value)}><option value="">—</option>{cat?.proyectos.map(p => <option value={p.id} key={p.id}>{p.nombre}</option>)}</select></td>
    <td><select class="cell-input" value={String(r.categoria_id)} onChange={e => editar(r,'categoria_id',(e.currentTarget as HTMLSelectElement).value)}>{cat?.categorias.map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></td>
    <td><select class="cell-input" value={r.cliente_id ? String(r.cliente_id) : ''} onChange={e => editar(r,'cliente_id',(e.currentTarget as HTMLSelectElement).value)}><option value="">—</option>{cat?.clientes.map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></td>
    <td><input class="cell-input time-cell" type="number" min="1" value={r.tiempo_minutos} onChange={e => editar(r,'tiempo_minutos',(e.currentTarget as HTMLInputElement).value)} title="Minutos" /></td>
    <td><input class="cell-input" value={r.detalle ?? ''} onChange={e => editar(r,'detalle',(e.currentTarget as HTMLInputElement).value)} /></td>
    <td>{guardando === r.id ? <span class="saving">guardando…</span> : <span class="ok-dot">●</span>}</td>
  </tr>;

  return <main class="shell">
    <header class="topbar"><div><b>EÓN 2.1</b><h1>{vista === 'hoy' ? 'Hoy' : 'Balances'}</h1><p class="muted">{email}</p></div></header>
    <nav class="nav"><button class={vista === 'hoy' ? 'active' : ''} onClick={() => setVista('hoy')}>Hoy</button><button class={vista === 'balances' ? 'active' : ''} onClick={() => { setVista('balances'); if (!balances.length) lanzarBalance('hoy'); }}>Balances</button><button class="nav-exit" onClick={async () => { await supabase.auth.signOut(); setEmail(null); }}>Salir</button></nav>
    {error && <section class="card error">{error}</section>}
    {vista === 'hoy' && <section>
      <section class="card registro-card"><div class="registro-heading"><span class="eyebrow">HOY</span><h2>Registrar tiempo</h2><p class="muted">Cargá un nuevo registro. Debajo vas a ver el total, la distribución por categoría y los registros del día.</p></div>
        <form class="registro-form" onSubmit={guardarNuevo}>
          <label>Fecha<input type="date" value={fecha} onInput={e => setFecha((e.currentTarget as HTMLInputElement).value)} required /></label>
          <label>Proyecto<input list="proyectos-lista" value={proyecto} onInput={e => setProyecto((e.currentTarget as HTMLInputElement).value)} placeholder="Buscar proyecto..." /><datalist id="proyectos-lista">{cat?.proyectos.map(p => <option value={p.nombre} key={p.id} />)}</datalist></label>
          <label>Categoría<select value={categoria} onChange={e => setCategoria((e.currentTarget as HTMLSelectElement).value)} required><option value="">Seleccionar categoría...</option>{cat?.categorias.map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label>
          <label>Cliente<input list="clientes-lista" value={cliente} onInput={e => setCliente((e.currentTarget as HTMLInputElement).value)} placeholder="Buscar cliente..." /><datalist id="clientes-lista">{cat?.clientes.map(c => <option value={c.nombre} key={c.id} />)}</datalist></label>
          <label class="campo-tiempo">Tiempo (HH:MM)<div class="tiempo-controles"><div class="tiempo-input"><input inputMode="numeric" maxLength={2} value={horas} onInput={e => setHoras((e.currentTarget as HTMLInputElement).value.replace(/\\D/g,'').slice(0,2))} /><span>:</span><input inputMode="numeric" maxLength={2} value={minutos} onInput={e => setMinutos((e.currentTarget as HTMLInputElement).value.replace(/\\D/g,'').slice(0,2))} /></div></div></label>
          <label class="detalle-field">Detalle<textarea rows={3} value={detalle} onInput={e => setDetalle((e.currentTarget as HTMLTextAreaElement).value)} placeholder="¿Qué hiciste? (opcional)" /></label>
          <button class="guardar-button" disabled={guardandoNuevo}>{guardandoNuevo ? 'Guardando…' : 'Guardar registro'}</button>
          {mensaje && <p class={mensaje.startsWith('Registro') ? 'success' : 'error'}>{mensaje}</p>}
        </form>
      </section>
      <section class="card summary-card"><span class="eyebrow">TOTAL DE HOY</span><strong>{tiempo(totalHoy)}</strong><span class="muted">{regHoy.length} registro{regHoy.length === 1 ? '' : 's'}</span></section>
      <section class="card"><div class="section-title"><div><span class="eyebrow">DISTRIBUCIÓN</span><h2>Hoy por categoría</h2></div></div><Pie datos={datosHoy} /></section>
      <section class="card"><div class="section-title"><div><span class="eyebrow">REGISTROS DE HOY</span><h2>Editar registros</h2></div></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Minutos</th><th>Detalle</th><th></th></tr></thead><tbody>{regHoy.length ? regHoy.map(fila) : <tr><td colSpan={7} class="empty">Todavía no hay registros para hoy.</td></tr>}</tbody></table></div></section>
    </section>}
    {vista === 'balances' && <section>
      <section class="card balance-controls"><span class="eyebrow">BALANCES</span><h2>Consultar período</h2>
        <div class="preset-buttons"><button class={balancePreset==='hoy'?'selected':''} onClick={() => lanzarBalance('hoy')}>Hoy</button><button class={balancePreset==='semana'?'selected':''} onClick={() => lanzarBalance('semana')}>Semana</button><button class={balancePreset==='mes'?'selected':''} onClick={() => lanzarBalance('mes')}>Mes</button></div>
        <div class="search-grid"><label>Buscar en todo<input value={busqueda} onInput={e => setBusqueda((e.currentTarget as HTMLInputElement).value)} placeholder="Texto libre..." /></label><label>Desde<input type="date" value={fDesde} onInput={e => setFDesde((e.currentTarget as HTMLInputElement).value)} /></label><label>Hasta<input type="date" value={fHasta} onInput={e => setFHasta((e.currentTarget as HTMLInputElement).value)} /></label><label>Proyecto<select value={fProyecto} onChange={e => setFProyecto((e.currentTarget as HTMLSelectElement).value)}><option value="">Todos</option>{cat?.proyectos.map(p=><option value={p.id} key={p.id}>{p.nombre}</option>)}</select></label><label>Categoría<select value={fCategoria} onChange={e => setFCategoria((e.currentTarget as HTMLSelectElement).value)}><option value="">Todas</option>{cat?.categorias.map(c=><option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label><label>Cliente<select value={fCliente} onChange={e => setFCliente((e.currentTarget as HTMLSelectElement).value)}><option value="">Todos</option>{cat?.clientes.map(c=><option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label><label>Detalle contiene<input value={fDetalle} onInput={e => setFDetalle((e.currentTarget as HTMLInputElement).value)} placeholder="Filtrar detalle..." /></label><button class="search-button" onClick={buscar} disabled={cargandoBalance}>{cargandoBalance ? 'Consultando…' : 'Buscar'}</button></div>
      </section>
      <section class="card summary-card"><span class="eyebrow">RESULTADO</span><strong>{tiempo(totalBalance)}</strong><span class="muted">{filtrados.length} registro{filtrados.length === 1 ? '' : 's'}</span></section>
      <section class="card"><div class="section-title"><div><span class="eyebrow">DISTRIBUCIÓN</span><h2>Por categoría</h2></div></div><Pie datos={datosBalance} /></section>
      <section class="card"><div class="section-title"><div><span class="eyebrow">DETALLE</span><h2>Tabla editable</h2></div></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Minutos</th><th>Detalle</th><th></th></tr></thead><tbody>{filtrados.length ? filtrados.map(fila) : <tr><td colSpan={7} class="empty">No hay registros que coincidan con la consulta.</td></tr>}</tbody></table></div></section>
    </section>}
  </main>;
}
