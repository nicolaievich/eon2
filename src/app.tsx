import { useEffect,useState } from 'preact/hooks';
import { supabase } from './lib/supabase';
import { cargarCatalogos,cargarUltimosRegistros } from './data';
import type { Catalogos,Registro } from './types';

const tiempo=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

export function App(){
 const [cargando,setCargando]=useState(true),[email,setEmail]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null),[cat,setCat]=useState<Catalogos|null>(null);
 const [reg,setReg]=useState<Registro[]>([]);
 useEffect(()=>{let vivo=true;
  (async()=>{try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session){setCargando(false);return}
   setEmail(session.user.email??null);
   const [catalogos,registros]=await Promise.all([cargarCatalogos(),cargarUltimosRegistros()]);
   if(vivo){setCat(catalogos);setReg(registros)}
  }catch(e){if(vivo)setError(e instanceof Error?e.message:'Error desconocido')}
  finally{if(vivo)setCargando(false)}})();
  const {data}=supabase.auth.onAuthStateChange((_e,s)=>setEmail(s?.user.email??null));
  return()=>{vivo=false;data.subscription.unsubscribe()}
 },[]);
 if(cargando)return <main class="shell"><section class="card">Cargando EÓN 2.0…</section></main>;
 if(!email)return <main class="shell narrow"><section class="card"><b>EÓN 2.0 · ALPHA</b><h1>Registro de Tiempos</h1><p>Etapa inicial de solo lectura.</p><p class="muted">EÓN 1.9 continúa siendo la versión estable.</p></section></main>;
 const total=reg.reduce((s,r)=>s+Number(r.tiempo_minutos||0),0);
 return <main class="shell">
  <header class="topbar"><div><b>EÓN 2.0 · ALPHA 1</b><h1>Hoy</h1><p class="muted">{email}</p></div></header>
  {error&&<section class="card error">{error}</section>}
  <section class="card hero"><div><span class="muted">Últimos 90 días</span><strong>{tiempo(total)}</strong></div><span class="badge">SOLO LECTURA</span></section>
  <section class="grid">{[['Proyectos',cat?.proyectos.length],['Categorías',cat?.categorias.length],['Clientes',cat?.clientes.length],['Registros',reg.length]].map(([n,v])=><article class="card"><span class="muted">{n}</span><strong>{v??0}</strong></article>)}</section>
  <section class="card"><b>Actividad reciente</b><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Proyecto</th><th>Categoría</th><th>Cliente</th><th>Tiempo</th></tr></thead><tbody>{reg.slice(0,25).map(r=><tr><td>{r.fecha}</td><td>{r.proyecto?.nombre??'—'}</td><td>{r.categoria?.nombre??'—'}</td><td>{r.cliente?.nombre??'—'}</td><td>{tiempo(r.tiempo_minutos)}</td></tr>)}</tbody></table></div></section>
 </main>
}