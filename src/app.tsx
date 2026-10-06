import { useEffect, useMemo, useState } from 'preact/hooks';
import { supabase } from './lib/supabase';
import { actualizarCategoria, actualizarCliente, actualizarProyecto, cargarCatalogos, cargarRegistros, crearCategoria, crearCliente, crearProyecto, crearRegistro } from './data';
import type { Catalogos, Registro } from './types';

type Vista = 'registro' | 'balances' | 'ajustes';
type Periodo = 'hoy' | 'semana' | 'mes';
type Ajuste = 'inicio' | 'clientes' | 'categorias' | 'proyectos';
const minutos = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inicioSemana = (d: Date) => { const x = new Date(d); const day = x.getDay() || 7; x.setDate(x.getDate() - day + 1); return x; };
const inicioMes = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const fechaLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export function App() {
  const [iniciando, setIniciando] = useState(true); const [email, setEmail] = useState<string | null>(null);
  const [cat, setCat] = useState<Catalogos | null>(null); const [reg, setReg] = useState<Registro[]>([]);
  const [vista, setVista] = useState<Vista>('registro'); const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [ajuste, setAjuste] = useState<Ajuste>('inicio'); const [error, setError] = useState<string | null>(null);
  const cargar = async () => { const [catalogos, registros] = await Promise.all([cargarCatalogos(), cargarRegistros(iso(inicioMes(new Date()))) ]); setCat(catalogos); setReg(registros); setError(null); };
  useEffect(() => { let vivo = true; (async () => { try { const { data: { session } } = await supabase.auth.getSession(); if (!vivo) return; setEmail(session?.user.email ?? null); if (session) await cargar(); } catch (e) { if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido'); } finally { if (vivo) setIniciando(false); } })(); const { data } = supabase.auth.onAuthStateChange(async (_event, session) => { setEmail(session?.user.email ?? null); if (session) { try { await cargar(); } catch (e) { setError(e instanceof Error ? e.message : 'Error desconocido'); } } else { setCat(null); setReg([]); } }); return () => { vivo = false; data.subscription.unsubscribe(); }; }, []);
  if (iniciando) return <main class="shell narrow"><section class="card splash"><b>EÓN 2.0</b><h1>Registro de Tiempos</h1><p>Iniciando…</p></section></main>;
  if (!email) return <Auth />;
  return <main class="shell">
    <header class="topbar"><div><div class="eyebrow">EÓN 2.0</div><h1>{vista === 'registro' ? 'Registro' : vista === 'balances' ? 'Balances' : 'Ajustes'}</h1><p class="muted">{email}</p></div><button class="ghost" onClick={() => supabase.auth.signOut()}>Salir</button></header>
    <nav class="main-nav">{(['registro','balances','ajustes'] as Vista[]).map(v => <button class={vista === v ? 'active' : ''} onClick={() => setVista(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</nav>
    {error && <section class="card error">{error}</section>}
    {vista === 'registro' && <RegistroView cat={cat} onSaved={cargar} />}
    {vista === 'balances' && <Balances reg={reg} periodo={periodo} setPeriodo={setPeriodo} />}
    {vista === 'ajustes' && <Ajustes cat={cat} ajuste={ajuste} setAjuste={setAjuste} onChanged={cargar} />}
  </main>;
}

function RegistroView({ cat, onSaved }: { cat: Catalogos | null; onSaved: () => Promise<void> }) {
  const [fecha, setFecha] = useState(fechaLocal()); const [proyecto, setProyecto] = useState(''); const [categoria, setCategoria] = useState(''); const [cliente, setCliente] = useState('');
  const [horas, setHoras] = useState('00'); const [mins, setMins] = useState('00'); const [detalle, setDetalle] = useState(''); const [busy, setBusy] = useState(false); const [mensaje, setMensaje] = useState('');
  const guardar = async (e: Event) => { e.preventDefault(); setMensaje(''); setBusy(true); try { const h = Number(horas), m = Number(mins); if (!categoria) throw new Error('Seleccioná una categoría.'); if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59 || h * 60 + m <= 0) throw new Error('Ingresá un tiempo válido.'); await crearRegistro({ fecha, proyecto_id: proyecto ? Number(proyecto) : null, categoria_id: Number(categoria), cliente_id: cliente ? Number(cliente) : null, tiempo_minutos: h * 60 + m, detalle: detalle.trim() || null }); setHoras('00'); setMins('00'); setDetalle(''); setMensaje('Registro guardado correctamente.'); await onSaved(); } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); } };
  return <section class="card form-card"><div class="section-head"><div><div class="eyebrow">Cargar tiempo</div><h2>Nuevo registro</h2></div></div><form onSubmit={guardar} class="form-grid">
    <label>Fecha<input type="date" value={fecha} onInput={e => setFecha(e.currentTarget.value)} required /></label>
    <label>Proyecto<select value={proyecto} onChange={e => setProyecto(e.currentTarget.value)}><option value="">Sin proyecto</option>{cat?.proyectos.map(p => <option value={p.id}>{p.nombre}</option>)}</select></label>
    <label>Categoría<select value={categoria} onChange={e => setCategoria(e.currentTarget.value)} required><option value="">Seleccionar…</option>{cat?.categorias.map(c => <option value={c.id}>{c.nombre}</option>)}</select></label>
    <label>Cliente<select value={cliente} onChange={e => setCliente(e.currentTarget.value)}><option value="">Sin cliente</option>{cat?.clientes.map(c => <option value={c.id}>{c.nombre}</option>)}</select></label>
    <label>Horas<input inputMode="numeric" value={horas} onInput={e => setHoras(e.currentTarget.value.replace(/\D/g, '').slice(0, 2))} /></label>
    <label>Minutos<input inputMode="numeric" value={mins} onInput={e => setMins(e.currentTarget.value.replace(/\D/g, '').slice(0, 2))} /></label>
    <label class="wide">Detalle<textarea value={detalle} onInput={e => setDetalle(e.currentTarget.value)} rows={4} placeholder="¿Qué hiciste?" /></label>
    <div class="wide form-actions"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar registro'}</button>{mensaje && <span class="form-message">{mensaje}</span>}</div>
  </form></section>;
}

function Balances({ reg, periodo, setPeriodo }: { reg: Registro[]; periodo: Periodo; setPeriodo: (p: Periodo) => void }) {
  const ahora = new Date(); const desde = periodo === 'hoy' ? iso(ahora) : periodo === 'semana' ? iso(inicioSemana(ahora)) : iso(inicioMes(ahora)); const filtrados = reg.filter(r => r.fecha >= desde);
  const total = filtrados.reduce((s, r) => s + Number(r.tiempo_minutos), 0); const porProyecto = useMemo(() => agrupar(filtrados, r => r.proyecto?.nombre ?? 'Sin proyecto'), [filtrados]); const porCategoria = useMemo(() => agrupar(filtrados, r => r.categoria?.nombre ?? 'Sin categoría'), [filtrados]); const max = Math.max(...porProyecto.map(x => x[1]), 1);
  return <><div class="period-tabs">{(['hoy','semana','mes'] as Periodo[]).map(p => <button class={periodo === p ? 'active' : ''} onClick={() => setPeriodo(p)}>{p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}</button>)}</div>
    <section class="balance-hero"><span>Tiempo registrado</span><strong>{minutos(total)}</strong><small>{periodo === 'hoy' ? 'Hoy' : periodo === 'semana' ? 'Esta semana' : 'Este mes'}</small></section>
    <section class="stats-grid"><article class="card stat"><span>Registros</span><b>{filtrados.length}</b></article><article class="card stat"><span>Proyectos</span><b>{porProyecto.length}</b></article><article class="card stat"><span>Categorías</span><b>{porCategoria.length}</b></article></section>
    <section class="card"><div class="section-head"><h2>Tiempo por proyecto</h2></div><div class="bars">{porProyecto.length ? porProyecto.map(([nombre, valor]) => <div class="bar-row"><div><span>{nombre}</span><b>{minutos(valor)}</b></div><div class="bar"><i style={{ width: Math.max(3, valor / max * 100) + '%' }} /></div></div>) : <p class="muted">Sin registros en este período.</p>}</div></section>
    <section class="card"><div class="section-head"><h2>Por categoría</h2></div><div class="category-list">{porCategoria.map(([nombre, valor]) => <div><span>{nombre}</span><b>{minutos(valor)}</b></div>)}</div></section>
  </>;
}
function agrupar(reg: Registro[], key: (r: Registro) => string): [string, number][] { const mapa = new Map<string, number>(); reg.forEach(r => mapa.set(key(r), (mapa.get(key(r)) ?? 0) + Number(r.tiempo_minutos))); return [...mapa.entries()].sort((a, b) => b[1] - a[1]); }

function Ajustes({ cat, ajuste, setAjuste, onChanged }: { cat: Catalogos | null; ajuste: Ajuste; setAjuste: (a: Ajuste) => void; onChanged: () => Promise<void> }) {
  if (ajuste === 'inicio') return <section class="settings-grid">{[['clientes','Clientes','Personas para asociar registros'],['categorias','Categorías','Clasificación y color'],['proyectos','Proyectos','Organización del trabajo']].map(([id,t,d]) => <button class="settings-card" onClick={() => setAjuste(id as Ajuste)}><span>{t === 'Clientes' ? '👤' : t === 'Categorías' ? '●' : '▣'}</span><b>{t}</b><small>{d}</small></button>)}</section>;
  return <section><button class="back" onClick={() => setAjuste('inicio')}>← Ajustes</button><div class="section-head"><div><div class="eyebrow">Administrar</div><h2>{ajuste[0].toUpperCase() + ajuste.slice(1)}</h2></div></div><Catalogo tipo={ajuste} cat={cat} onChanged={onChanged} /></section>;
}

function Catalogo({ tipo, cat, onChanged }: { tipo: 'clientes' | 'categorias' | 'proyectos'; cat: Catalogos | null; onChanged: () => Promise<void> }) {
  const [nombre, setNombre] = useState(''); const [extra, setExtra] = useState(tipo === 'categorias' ? '#d28a00' : ''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const items = tipo === 'clientes' ? cat?.clientes ?? [] : tipo === 'categorias' ? cat?.categorias ?? [] : cat?.proyectos ?? [];
  const guardar = async (e: Event) => { e.preventDefault(); setBusy(true); setMsg(''); try { if (!nombre.trim()) throw new Error('El nombre es obligatorio.'); if (tipo === 'clientes') await crearCliente({ nombre: nombre.trim(), contacto: extra.trim() || null }); if (tipo === 'categorias') await crearCategoria({ nombre: nombre.trim(), color: extra }); if (tipo === 'proyectos') await crearProyecto({ nombre: nombre.trim(), descripcion: extra.trim() || null }); setNombre(''); setExtra(tipo === 'categorias' ? '#d28a00' : ''); setMsg('Guardado.'); await onChanged(); } catch (e) { setMsg(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); } };
  return <><form class="inline-form" onSubmit={guardar}><label>Nombre<input value={nombre} onInput={e => setNombre(e.currentTarget.value)} /></label>{tipo === 'categorias' ? <label>Color<input type="color" value={extra} onInput={e => setExtra(e.currentTarget.value)} /></label> : <label>{tipo === 'clientes' ? 'Contacto' : 'Descripción'}<input value={extra} onInput={e => setExtra(e.currentTarget.value)} /></label>}<button disabled={busy}>{busy ? 'Guardando…' : 'Agregar'}</button></form>{msg && <p class="form-message">{msg}</p>}<div class="catalog-list">{items.map(item => <CatalogItem key={item.id} item={item} tipo={tipo} onChanged={onChanged} />)}</div></>;
}
function CatalogItem({ item, tipo, onChanged }: { item: any; tipo: 'clientes' | 'categorias' | 'proyectos'; onChanged: () => Promise<void> }) {
  const editar = async () => { const nombre = prompt('Nuevo nombre:', item.nombre); if (nombre === null || !nombre.trim()) return; try { if (tipo === 'clientes') await actualizarCliente(item.id, { nombre: nombre.trim(), contacto: item.contacto ?? null }); if (tipo === 'categorias') await actualizarCategoria(item.id, { nombre: nombre.trim(), color: item.color ?? '#d28a00' }); if (tipo === 'proyectos') await actualizarProyecto(item.id, { nombre: nombre.trim(), descripcion: item.descripcion ?? null }); await onChanged(); } catch (e) { alert(e instanceof Error ? e.message : 'No se pudo actualizar.'); } };
  return <article class="catalog-item"><span class={tipo === 'categorias' ? 'dot' : 'item-icon'} style={tipo === 'categorias' ? { background: item.color ?? '#999' } : {}}>{tipo === 'categorias' ? '' : tipo === 'clientes' ? '👤' : '▣'}</span><div><b>{item.nombre}</b><small>{tipo === 'clientes' ? item.contacto || 'Sin contacto' : tipo === 'categorias' ? 'Categoría' : item.descripcion || 'Sin descripción'}</small></div><button class="ghost" onClick={editar}>Editar</button></article>;
}

function Auth() { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const entrar = async (e: Event) => { e.preventDefault(); setBusy(true); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMsg(error.message); setBusy(false); }; return <main class="shell narrow auth-shell"><section class="card auth-card"><div class="eyebrow">EÓN 2.0</div><h1>Registro de Tiempos</h1><form class="login-form" onSubmit={entrar}><label>Email<input type="email" value={email} onInput={e => setEmail(e.currentTarget.value)} required /></label><label>Contraseña<input type="password" value={password} onInput={e => setPassword(e.currentTarget.value)} required /></label><button disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>{msg && <p class="error">{msg}</p>}</form><p class="muted small">EÓN 1.9 continúa siendo la versión estable.</p></section></main>; }