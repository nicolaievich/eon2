import { useEffect, useState } from 'preact/hooks';
import type { Catalogos, Categoria, Cliente, Proyecto } from './types';
import {
  actualizarCategoria, actualizarCliente, actualizarProyecto,
  crearCategoria, crearCliente, crearProyecto, cargarPreferencias, guardarPreferencias, guardarColor
} from './data';

type Tipo = 'categorias' | 'proyectos' | 'clientes';

export function Ajustes({ catalogos, onCatalogosChange }: { catalogos: Catalogos; onCatalogosChange: () => Promise<void> }) {
  const [tipo, setTipo] = useState<Tipo>('categorias');
  const [editando, setEditando] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#ed7622');
  const [colorProyecto, setColorProyecto] = useState('#ed7622');
  const [colorCliente, setColorCliente] = useState('#d7a514');
  const [predCategoria, setPredCategoria] = useState('');
  const [predProyecto, setPredProyecto] = useState('');
  const [predCliente, setPredCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contacto, setContacto] = useState('');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => { cargarPreferencias().then(p => { setPredCategoria(p.categoriaId ? String(p.categoriaId) : ''); setPredProyecto(p.proyectoId ? String(p.proyectoId) : ''); setPredCliente(p.clienteId ? String(p.clienteId) : ''); }).catch(() => {}); }, []);

  const limpiar = () => {
    setEditando(null); setNombre(''); setColor('#ed7622'); setDescripcion(''); setContacto(''); setActivo(true); setMensaje(null);
  };

  const seleccionarTipo = (nuevo: Tipo) => { setTipo(nuevo); limpiar(); };

  const editar = (item: Categoria | Proyecto | Cliente) => {
    setEditando(item.id); setNombre(item.nombre); setMensaje(null); setColorProyecto('color' in item ? (item.color || '#ed7622') : '#ed7622'); setColorCliente('color' in item ? (item.color || '#d7a514') : '#d7a514');
    if ('color' in item) setColor(item.color || '#ed7622');
    if ('descripcion' in item) setDescripcion(item.descripcion || '');
    if ('contacto' in item) setContacto(item.contacto || '');
    if ('activo' in item) setActivo(item.activo !== false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardar = async (event: Event) => {
    event.preventDefault(); setMensaje(null);
    if (!nombre.trim()) { setMensaje('El nombre es obligatorio.'); return; }
    setGuardando(true);
    try {
      if (tipo === 'categorias') {
        editando === null ? await crearCategoria(nombre, color) : await actualizarCategoria(editando, nombre, color);
      } else if (tipo === 'proyectos') {
        editando === null ? await crearProyecto(nombre, descripcion, colorProyecto) : await actualizarProyecto(editando, nombre, descripcion, activo, colorProyecto);
      } else {
        editando === null ? await crearCliente(nombre, contacto, colorCliente) : await actualizarCliente(editando, nombre, contacto, colorCliente);
      }
      if (tipo === 'categorias' && editando !== null) await guardarColor('categoria', editando, color);
      await onCatalogosChange();
      limpiar();
      setMensaje(editando === null ? 'Creado correctamente.' : 'Cambios guardados.');
    } catch (e: any) {
      const detalle = e?.message || e?.details || e?.hint || 'No se pudo guardar.';
      setMensaje(`No se pudo guardar: ${detalle}`);
    } finally { setGuardando(false); }
  };

  const titulo = tipo === 'categorias' ? 'Categorías' : tipo === 'proyectos' ? 'Proyectos' : 'Clientes';
  const items = tipo === 'categorias' ? catalogos.categorias : tipo === 'proyectos' ? catalogos.proyectos : catalogos.clientes;

  return <section class="settings">
    <section class="card settings-intro">
      <span class="eyebrow">AJUSTES</span>
      <h2>Organizar EÓN</h2>
      <p class="muted">Creá y editá los datos que después vas a usar al registrar y consultar tiempos.</p>
    </section>

    <section class="card">
      <div class="settings-tabs">
        <button class={tipo === 'categorias' ? 'selected' : ''} onClick={() => seleccionarTipo('categorias')}>Categorías</button>
        <button class={tipo === 'proyectos' ? 'selected' : ''} onClick={() => seleccionarTipo('proyectos')}>Proyectos</button>
        <button class={tipo === 'clientes' ? 'selected' : ''} onClick={() => seleccionarTipo('clientes')}>Clientes</button>
      </div>

      <form class="settings-form" onSubmit={guardar}>
        <div class="settings-form-heading">
          <div><span class="eyebrow">{editando === null ? 'NUEVO' : 'EDITAR'}</span><h3>{titulo.slice(0,-1)}{editando === null ? '' : ''}</h3></div>
          {editando !== null && <button type="button" class="settings-cancel" onClick={limpiar}>Cancelar</button>}
        </div>

        <label>Nombre<input value={nombre} onInput={e => setNombre((e.currentTarget as HTMLInputElement).value)} placeholder={tipo === 'categorias' ? 'Ej. Desarrollo' : tipo === 'proyectos' ? 'Ej. Web Hermanos' : 'Ej. Cliente nuevo'} /></label>

        {tipo === 'categorias' && <label>Color<div class="color-field"><input type="color" value={color} onInput={e => setColor((e.currentTarget as HTMLInputElement).value)} /><input value={color} onInput={e => setColor((e.currentTarget as HTMLInputElement).value)} pattern="^#[0-9A-Fa-f]{6}$" /></div></label>}
        {tipo === 'proyectos' && <label>Color<div class="color-field"><input type="color" value={colorProyecto} onInput={e => setColorProyecto((e.currentTarget as HTMLInputElement).value)} /><input value={colorProyecto} onInput={e => setColorProyecto((e.currentTarget as HTMLInputElement).value)} /></div></label>}
        {tipo === 'proyectos' && <label>Descripción<textarea rows={3} value={descripcion} onInput={e => setDescripcion((e.currentTarget as HTMLTextAreaElement).value)} placeholder="Descripción opcional" /></label>}
        {tipo === 'proyectos' && editando !== null && <label class="checkbox-field"><input type="checkbox" checked={activo} onChange={e => setActivo((e.currentTarget as HTMLInputElement).checked)} /> Proyecto activo</label>}
        {tipo === 'clientes' && <label>Color<div class="color-field"><input type="color" value={colorCliente} onInput={e => setColorCliente((e.currentTarget as HTMLInputElement).value)} /><input value={colorCliente} onInput={e => setColorCliente((e.currentTarget as HTMLInputElement).value)} /></div></label>}
        {tipo === 'clientes' && <label>Contacto<input value={contacto} onInput={e => setContacto((e.currentTarget as HTMLInputElement).value)} placeholder="Email, teléfono u otro dato" /></label>}

        <button class="guardar-button settings-save" disabled={guardando}>{guardando ? 'Guardando…' : editando === null ? 'Crear' : 'Guardar cambios'}</button>
        {mensaje && <p class={mensaje.includes('error') || mensaje.includes('No se pudo') ? 'error' : 'success'}>{mensaje}</p>}
      </form>
    </section>

    <section class="card">
      <div class="section-title"><div><span class="eyebrow">REGISTROS</span><h2>{titulo}</h2></div><span class="query-status">{items.length} {items.length === 1 ? 'elemento' : 'elementos'}</span></div>
      <div class="settings-list">
        {items.length ? items.map(item => <div class="settings-item" key={item.id}>
          <div class="settings-item-main">
            {tipo === 'categorias' && <span class="settings-color" style={{ background: (item as Categoria).color || '#b98500' }} />}{tipo === 'proyectos' && <span class="settings-color" style={{ background: (item as Proyecto).color || '#ed7622' }} />}{tipo === 'clientes' && <span class="settings-color" style={{ background: (item as Cliente).color || '#d7a514' }} />}
            <div><strong>{item.nombre}</strong>
              {tipo === 'proyectos' && (item as Proyecto).descripcion && <small>{(item as Proyecto).descripcion}</small>}
              {tipo === 'clientes' && (item as Cliente).contacto && <small>{(item as Cliente).contacto}</small>}
            </div>
          </div>
          <button class="settings-edit" onClick={() => editar(item as Categoria | Proyecto | Cliente)}>Editar</button>
        </div>) : <p class="empty">Todavía no hay {titulo.toLowerCase()} cargados.</p>}
      </div>
    </section>

    <section class="card defaults-card">
      <div class="section-title"><div><span class="eyebrow">PREFERENCIAS</span><h2>Valores por defecto</h2></div></div>
      <p class="muted">Estos valores aparecerán automáticamente al iniciar un nuevo registro.</p>
      <div class="defaults-grid">
        <label>Categoría<select value={predCategoria} onChange={e => setPredCategoria((e.currentTarget as HTMLSelectElement).value)}><option value="">Sin predeterminado</option>{catalogos.categorias.map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label>
        <label>Proyecto<select value={predProyecto} onChange={e => setPredProyecto((e.currentTarget as HTMLSelectElement).value)}><option value="">Sin predeterminado</option>{catalogos.proyectos.map(p => <option value={p.id} key={p.id}>{p.nombre}</option>)}</select></label>
        <label>Cliente<select value={predCliente} onChange={e => setPredCliente((e.currentTarget as HTMLSelectElement).value)}><option value="">Sin predeterminado</option>{catalogos.clientes.map(c => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label>
        <button class="guardar-button" type="button" onClick={async () => { await guardarPreferencias({ categoriaId: predCategoria ? Number(predCategoria) : null, proyectoId: predProyecto ? Number(predProyecto) : null, clienteId: predCliente ? Number(predCliente) : null }); setMensaje('Valores por defecto guardados.'); }}>Guardar valores por defecto</button>
      </div>
    </section>
  </section>;
}
