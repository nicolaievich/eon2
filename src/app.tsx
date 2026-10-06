import { useEffect, useMemo, useState } from 'preact/hooks';
import { supabase } from './lib/supabase';
import {
  actualizarCategoria, actualizarCliente, actualizarProyecto, actualizarRegistro,
  cargarCatalogos, cargarRegistros, crearCategoria, crearCliente, crearProyecto, crearRegistro
} from './data';
import type { Catalogos, Registro } from './types';

type Vista = 'hoy' | 'balances' | 'ajustes';
type Periodo = 'hoy' | 'semana' | 'mes';
type Ajuste = 'inicio' | 'clientes' | 'categorias' | 'proyectos';

const minutos = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inicioSemana = (d: Date) => { const x = new Date(d); const day = x.getDay() || 7; x.setDate(x.getDate() - day + 1); return x; };
const inicioMes = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const fechaLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export function App() {
  const [iniciando, setIniciando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [reg, setReg] = useState<Registro[]>([]);
  const [vista, setVista] = useState<Vista>('hoy');
  const [periodo, setPeriodo] = useState<Periodo>('hoy');
  const [ajuste, setAjuste] = useState<Ajuste>('inicio');
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    const [catalogos, registros] = await Promise.all([
      cargarCatalogos(),
      cargarRegistros(iso(inicioMes(new Date())))
    ]);
    setCat(catalogos);
    setReg(registros);
    setError(null);
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!vivo) return;
        setEmail(session?.user.email ?? null);
        if (session) await cargar();
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        if (vivo) setIniciando(false);
      }
    })();
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setEmail(session?.user.email ?? null);
      if (session) {
        try { await cargar(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Error desconocido'); }
      } else { setCat(null); setReg([]); }
    });
    return () => { vivo = false; data.subscription.unsubscribe(); };
  }, []);

  if (iniciando) return <main class="shell narrow"><section class="card splash"><b>EÓN 2.1</b><h1>Registro de Tiempos</h1><p>Iniciando…</p></section></main>;
  if (!email) return <Auth />;

  return <main class="shell">
    <header class="topbar">
      <div><div class="eyebrow">EÓN 2.1</div><h1>{vista === 'hoy' ? 'Hoy' : vista === 'balances' ? 'Balances' : 'Ajustes'}</h1><p class="muted">{email}</p></div>
      <button class="ghost" onClick={() => supabase.auth.signOut()}>Salir</button>
    </header>
    <nav class="main-nav">
      {([['hoy','Hoy'],['balances','Balances'],['ajustes','Ajustes']] as [Vista,string][]).map(([v,label]) =>
        <button class={vista === v ? 'active' : ''} onClick={() => setVista(v)}>{label}</button>
      )}
    </nav>
    {error && <section class="card error">{error}</section>}
    {vista === 'hoy' && <Hoy cat={cat} reg={reg} onSaved={cargar} />}
    {vista === 'balances' && <Balances reg={reg} cat={cat} periodo={periodo} setPeriodo={setPeriodo} onQuery={async (desde, hasta) => setReg(await cargarRegistros(desde, hasta))} onChanged={cargar} />}
    {vista === 'ajustes' && <Ajustes cat={cat} ajuste={ajuste} setAjuste={setAjuste} onChanged={cargar} />}
  </main>;
}

function Hoy({ cat, reg, onSaved }: { cat: Catalogos | null; reg: Registro[]; onSaved: () => Promise<void> }) {
  const hoy = fechaLocal();
  const registros = reg.filter(r => r.fecha === hoy);
  const total = registros.reduce((s, r) => s + Number(r.tiempo_minutos), 0);
  const categorias = useMemo(() => agrupar(registros, r => r.categoria?.nombre ?? 'Sin categoría'), [registros]);

  return <>
    <RegistroForm cat={cat} onSaved={onSaved} />
    <section class="today-summary">
      <div class="today-total"><span>Tiempo registrado hoy</span><strong>{minutos(total)}</strong><small>{registros.length} {registros.length === 1 ? 'registro' : 'registros'}</small></div>
      <PieChart data={categorias} title="Hoy por categoría" />
    </section>
    <RegistroTable title="Registros de hoy" rows={registros} cat={cat} onChanged={onSaved} />
  </>;
}

function RegistroForm({ cat, onSaved }: { cat: Catalogos | null; onSaved: () => Promise<void> }) {
  const [fecha, setFecha] = useState(fechaLocal());
  const [proyecto, setProyecto] = useState(''); const [categoria, setCategoria] = useState(''); const [cliente, setCliente] = useState('');
  const [horas, setHoras] = useState('00'); const [mins, setMins] = useState('00'); const [detalle, setDetalle] = useState('');
  const [busy, setBusy] = useState(false); const [mensaje, setMensaje] = useState('');

  const guardar = async (e: Event) => {
    e.preventDefault(); setMensaje(''); setBusy(true);
    try {
      const h = Number(horas), m = Number(mins);
      if (!categoria) throw new Error('Seleccioná una categoría.');
      if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59 || h * 60 + m <= 0) throw new Error('Ingresá un tiempo válido.');
      await crearRegistro({
        fecha, proyecto_id: proyecto ? Number(proyecto) : null, categoria_id: Number(categoria),
        cliente_id: cliente ? Number(cliente) : null, tiempo_minutos: h * 60 + m, detalle: detalle.trim() || null
      });
      setHoras('00'); setMins('00'); setDetalle('');
      setMensaje('Registro guardado correctamente.');
      await onSaved();
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  };

  return <section class="card form-card">
    <div class="section-head"><div><div class="eyebrow">REGISTRO</div><h2>Cargar tiempo</h2><p class="muted">Registrá lo que hiciste, cuánto tiempo llevó y guardalo.</p></div></div>
    <form onSubmit={guardar} class="form-grid">
      <label>Fecha<input type="date" value={fecha} onInput={e => setFecha(e.currentTarget.value)} required /></label>
      <label>Proyecto<select value={proyecto} onChange={e => setProyecto(e.currentTarget.value)}><option value="">Sin proyecto</option>{cat?.proyectos.map(p => <option value={p.id}>{p.nombre}</option>)}</select></label>
      <label>Categoría<select value={categoria} onChange={e => setCategoria(e.currentTarget.value)} required><option value="">Seleccionar categoría…</option>{cat?.categorias.map(c => <option value={c.id}>{c.nombre}</option>)}</select></label>
      <label>Cliente<select value={cliente} onChange={e => setCliente(e.currentTarget.value)}><option value="">Sin cliente</option>{cat?.clientes.map(c => <option value={c.id}>{c.nombre}</option>)}</select></label>
      <label>Horas<input inputMode="numeric" value={horas} onInput={e => setHoras(e.currentTarget.value.replace(/\D/g, '').slice(0, 2))} /></label>
      <label>Minutos<input inputMode="numeric" value={mins} onInput={e => setMins(e.currentTarget.value.replace(/\D/g, '').slice(0, 2))} /></label>
      <label class="wide">Detalle<textarea value={detalle} onInput={e => setDetalle(e.currentTarget.value)} rows={3} placeholder="¿Qué hiciste?" /></label>
      <div class="wide form-actions"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar registro'}</button>{mensaje && <span class="form-message">{mensaje}</span>}</div>
    </form>
  </section>;
}

function Balances({ reg, cat, periodo, setPeriodo, onQuery, onChanged }: { reg: Registro[]; cat: Catalogos | null; periodo: Periodo; setPeriodo: (p: Periodo) => void; onQuery: (desde:string, hasta:string) => Promise<void>; onChanged: () => Promise<void> }) {
  const hoy = fechaLocal();
  const [desde, setDesde] = useState(iso(inicioMes(new Date())));
  const [hasta, setHasta] = useState(hoy);
  const [texto, setTexto] = useState('');
  const [campo, setCampo] = useState('todos');
  const [aplicado, setAplicado] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (periodo === 'hoy') { setDesde(hoy); setHasta(hoy); }
    if (periodo === 'semana') { setDesde(iso(inicioSemana(now))); setHasta(hoy); }
    if (periodo === 'mes') { setDesde(iso(inicioMes(now))); setHasta(hoy); }
    setAplicado(true);
  }, [periodo]);

  const filtrados = useMemo(() => {
    const base = reg.filter(r => r.fecha >= desde && r.fecha <= hasta);
    const q = texto.trim().toLowerCase();
    if (!q) return base;
    return base.filter(r => {
      const valores: Record<string,string> = {
        fecha:r.fecha, proyecto:r.proyecto?.nombre ?? '', categoria:r.categoria?.nombre ?? '',
        cliente:r.cliente?.nombre ?? '', detalle:r.detalle ?? '', tiempo:minutos(Number(r.tiempo_minutos))
      };
      return campo === 'todos' ? Object.values(valores).some(v => v.toLowerCase().includes(q)) : valores[campo].toLowerCase().includes(q);
    });
  }, [reg, desde, hasta, texto, campo, aplicado]);

  const total = filtrados.reduce((s, r) => s + Number(r.tiempo_minutos), 0);
  const categorias = useMemo(() => agrupar(filtrados, r => r.categoria?.nombre ?? 'Sin categoría'), [filtrados]);

  return <>
    <div class="period-tabs">{([['hoy','Hoy'],['semana','Semana'],['mes','Mes']] as [Periodo,string][]).map(([p,label]) =>
      <button class={periodo === p ? 'active' : ''} onClick={() => setPeriodo(p)}>{label}</button>
    )}</div>
    <section class="card filters">
      <div class="filter-row">
        <label>Buscar<input value={texto} onInput={e => setTexto(e.currentTarget.value)} placeholder="Proyecto, cliente, detalle…" /></label>
        <label>Campo<select value={campo} onChange={e => setCampo(e.currentTarget.value)}><option value="todos">Todos los campos</option><option value="fecha">Fecha</option><option value="proyecto">Proyecto</option><option value="categoria">Categoría</option><option value="cliente">Cliente</option><option value="detalle">Detalle</option><option value="tiempo">Tiempo</option></select></label>
        <label>Desde<input type="date" value={desde} onInput={e => setDesde(e.currentTarget.value)} /></label>
        <label>Hasta<input type="date" value={hasta} onInput={e => setHasta(e.currentTarget.value)} /></label>
        <button class="secondary" onClick={async () => { setAplicado(v => !v); await onQuery(desde, hasta); }}>Aplicar consulta</button>
      </div>
    </section>
    <section class="balance-hero"><span>Resultado</span><strong>{minutos(total)}</strong><small>{filtrados.length} registros · {desde} → {hasta}</small></section>
    <PieChart data={categorias} title="Distribución por categoría" />
    <RegistroTable title="Detalle de registros" rows={filtrados} cat={cat} onChanged={onChanged} />
  </>;
}

function PieChart({ data, title }: { data: [string,number][]; title: string }) {
  const total = data.reduce((s, [,v]) => s + v, 0);
  if (!data.length) return <section class="card"><div class="section-head"><h2>{title}</h2></div><p class="muted">Sin registros para mostrar.</p></section>;
  let acumulado = 0;
  const stops = data.map(([,value], i) => {
    const start = total ? acumulado / total * 360 : 0; acumulado += value; const end = acumulado / total * 360;
    return `var(--chart-${(i % 6) + 1}) ${start}deg ${end}deg`;
  }).join(', ');
  return <section class="card chart-card"><div class="section-head"><h2>{title}</h2><span class="muted">{minutos(total)}</span></div>
    <div class="pie-layout"><div class="pie" style={{ background: `conic-gradient(${stops})` }}><div class="pie-hole">{data.length}<small>categorías</small></div></div>
      <div class="legend">{data.map(([name,value], i) => <div><i style={{ background: `var(--chart-${(i % 6) + 1})` }} /><span>{name}</span><b>{minutos(value)}</b></div>)}</div>
    </div>
  </section>;
}

function RegistroTable({ title, rows, cat, onChanged }: { title:string; rows:Registro[]; cat:Catalogos|null; onChanged:()=>Promise<void> }) {
  const [editando, setEditando] = useState<number|null>(null);
  const [draft, setDraft] = useState<Partial<Registro>>({});
  const [busy, setBusy] = useState(false);

  const iniciar = (r: Registro) => { setEditando(r.id); setDraft({...r}); };
  const guardar = async () => {
    if (!editando) return;
    setBusy(true);
    try {
      const d = draft as Registro;
      if (!d.fecha || !d.categoria_id || Number(d.tiempo_minutos) <= 0) throw new Error('Fecha, categoría y tiempo son obligatorios.');
      await actualizarRegistro(editando, {
        fecha:d.fecha, proyecto_id:d.proyecto_id ?? null, categoria_id:Number(d.categoria_id),
        cliente_id:d.cliente_id ?? null, tiempo_minutos:Number(d.tiempo_minutos), detalle:d.detalle ?? null
      });
      setEditando(null); await onChanged();
    } catch(e) { alert(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    finally { setBusy(false); }
  };

  return <section class="card table-card"><div class="section-head"><h2>{title}</h2><span class="muted">{rows.length}</span></div>
    {!rows.length ? <p class="muted">No hay registros.</p> :
    <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Tiempo</th><th>Detalle</th><th></th></tr></thead><tbody>
      {rows.map(r => editando === r.id
        ? <tr>
            <td><input type="date" value={String(draft.fecha ?? r.fecha)} onInput={e=>setDraft({...draft,fecha:e.currentTarget.value})}/></td>
            <td><select value={String(draft.proyecto_id ?? '')} onChange={e=>setDraft({...draft,proyecto_id:e.currentTarget.value ? Number(e.currentTarget.value):null})}><option value="">Sin proyecto</option>{cat?.proyectos.map(p=><option value={p.id}>{p.nombre}</option>)}</select></td>
            <td><select value={String(draft.categoria_id ?? r.categoria_id)} onChange={e=>setDraft({...draft,categoria_id:Number(e.currentTarget.value)})}>{cat?.categorias.map(c=><option value={c.id}>{c.nombre}</option>)}</select></td>
            <td><select value={String(draft.cliente_id ?? '')} onChange={e=>setDraft({...draft,cliente_id:e.currentTarget.value ? Number(e.currentTarget.value):null})}><option value="">Sin cliente</option>{cat?.clientes.map(c=><option value={c.id}>{c.nombre}</option>)}</select></td>
            <td><input class="time-input" inputMode="numeric" value={String(draft.tiempo_minutos ?? r.tiempo_minutos)} onInput={e=>setDraft({...draft,tiempo_minutos:Number(e.currentTarget.value.replace(/\D/g,''))})}/></td>
            <td><input value={String(draft.detalle ?? '')} onInput={e=>setDraft({...draft,detalle:e.currentTarget.value})}/></td>
            <td class="actions"><button class="save" disabled={busy} onClick={guardar}>✓</button><button class="ghost" onClick={()=>setEditando(null)}>×</button></td>
          </tr>
        : <tr>
            <td>{r.fecha}</td><td>{r.proyecto?.nombre ?? '—'}</td><td>{r.categoria?.nombre ?? '—'}</td><td>{r.cliente?.nombre ?? '—'}</td><td><b>{minutos(Number(r.tiempo_minutos))}</b></td><td>{r.detalle ?? '—'}</td>
            <td><button class="ghost" onClick={()=>iniciar(r)}>Editar</button></td>
          </tr>
      )}
    </tbody></table></div>}
  </section>;
}

function agrupar(reg: Registro[], key: (r: Registro) => string): [string, number][] {
  const mapa = new Map<string, number>();
  reg.forEach(r => mapa.set(key(r), (mapa.get(key(r)) ?? 0) + Number(r.tiempo_minutos)));
  return [...mapa.entries()].sort((a,b) => b[1]-a[1]);
}

function Ajustes({ cat, ajuste, setAjuste, onChanged }: { cat: Catalogos|null; ajuste:Ajuste; setAjuste:(a:Ajuste)=>void; onChanged:()=>Promise<void> }) {
  if (ajuste === 'inicio') return <section class="settings-grid">{[['clientes','Clientes','Personas para asociar registros'],['categorias','Categorías','Clasificación y color'],['proyectos','Proyectos','Organización del trabajo']].map(([id,t,d]) =>
    <button class="settings-card" onClick={()=>setAjuste(id as Ajuste)}><span>{t === 'Clientes' ? '👤' : t === 'Categorías' ? '●' : '▣'}</span><b>{t}</b><small>{d}</small></button>
  )}</section>;
  return <section><button class="back" onClick={()=>setAjuste('inicio')}>← Ajustes</button><div class="section-head"><div><div class="eyebrow">ADMINISTRAR</div><h2>{ajuste[0].toUpperCase()+ajuste.slice(1)}</h2></div></div><Catalogo tipo={ajuste} cat={cat} onChanged={onChanged}/></section>;
}

function Catalogo({ tipo, cat, onChanged }: { tipo:'clientes'|'categorias'|'proyectos'; cat:Catalogos|null; onChanged:()=>Promise<void> }) {
  const [nombre,setNombre]=useState(''); const [extra,setExtra]=useState(tipo==='categorias'?'#d28a00':''); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  const items=tipo==='clientes'?cat?.clientes??[]:tipo==='categorias'?cat?.categorias??[]:cat?.proyectos??[];
  const guardar=async(e:Event)=>{e.preventDefault();setBusy(true);setMsg('');try{if(!nombre.trim())throw new Error('El nombre es obligatorio.');if(tipo==='clientes')await crearCliente({nombre:nombre.trim(),contacto:extra.trim()||null});if(tipo==='categorias')await crearCategoria({nombre:nombre.trim(),color:extra});if(tipo==='proyectos')await crearProyecto({nombre:nombre.trim(),descripcion:extra.trim()||null});setNombre('');setExtra(tipo==='categorias'?'#d28a00':'');setMsg('Guardado.');await onChanged();}catch(e){setMsg(e instanceof Error?e.message:'No se pudo guardar.')}finally{setBusy(false)}};
  return <><form class="inline-form" onSubmit={guardar}><label>Nombre<input value={nombre} onInput={e=>setNombre(e.currentTarget.value)}/></label>{tipo==='categorias'?<label>Color<input type="color" value={extra} onInput={e=>setExtra(e.currentTarget.value)}/></label>:<label>{tipo==='clientes'?'Contacto':'Descripción'}<input value={extra} onInput={e=>setExtra(e.currentTarget.value)}/></label>}<button disabled={busy}>{busy?'Guardando…':'Agregar'}</button></form>{msg&&<p class="form-message">{msg}</p>}<div class="catalog-list">{items.map(item=><CatalogItem key={item.id} item={item} tipo={tipo} onChanged={onChanged}/>)}</div></>;
}
function CatalogItem({item,tipo,onChanged}:{item:any;tipo:'clientes'|'categorias'|'proyectos';onChanged:()=>Promise<void>}) {
  const editar=async()=>{const nombre=prompt('Nuevo nombre:',item.nombre);if(nombre===null||!nombre.trim())return;try{if(tipo==='clientes')await actualizarCliente(item.id,{nombre:nombre.trim(),contacto:item.contacto??null});if(tipo==='categorias')await actualizarCategoria(item.id,{nombre:nombre.trim(),color:item.color??'#d28a00'});if(tipo==='proyectos')await actualizarProyecto(item.id,{nombre:nombre.trim(),descripcion:item.descripcion??null});await onChanged()}catch(e){alert(e instanceof Error?e.message:'No se pudo actualizar.')}};
  return <article class="catalog-item"><span class={tipo==='categorias'?'dot':'item-icon'} style={tipo==='categorias'?{background:item.color??'#999'}:{}}>{tipo==='categorias'?'':tipo==='clientes'?'👤':'▣'}</span><div><b>{item.nombre}</b><small>{tipo==='clientes'?item.contacto||'Sin contacto':tipo==='categorias'?'Categoría':item.descripcion||'Sin descripción'}</small></div><button class="ghost" onClick={editar}>Editar</button></article>;
}

function Auth() {
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');
  const entrar=async(e:Event)=>{e.preventDefault();setBusy(true);const{error}=await supabase.auth.signInWithPassword({email,password});if(error)setMsg(error.message);setBusy(false)};
  return <main class="shell narrow auth-shell"><section class="card auth-card"><div class="eyebrow">EÓN 2.1</div><h1>Registro de Tiempos</h1><form class="login-form" onSubmit={entrar}><label>Email<input type="email" value={email} onInput={e=>setEmail(e.currentTarget.value)} required/></label><label>Contraseña<input type="password" value={password} onInput={e=>setPassword(e.currentTarget.value)} required/></label><button disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button>{msg&&<p class="error">{msg}</p>}</form><p class="muted small">EÓN 1.9 continúa siendo la versión estable.</p></section></main>;
}
