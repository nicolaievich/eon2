import { supabase } from './lib/supabase';
import type { Catalogos, Preferencias, Registro } from './types';

const PREFERENCIAS_KEY = 'eon2-preferencias';
const colorClave = (tipo: 'categoria'|'proyecto'|'cliente', id: number) => `${tipo}:${id}`;
const preferenciasBase = (): Preferencias => ({ categoriaId: null, proyectoId: null, clienteId: null, colores: {} });

function leerPreferencias(userId: string): Preferencias {
  try { return { ...preferenciasBase(), ...(JSON.parse(localStorage.getItem(PREFERENCIAS_KEY + ':' + userId) || '{}')) }; }
  catch { return preferenciasBase(); }
}

async function cargarPreferenciasCuenta(userId: string): Promise<Preferencias> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return leerPreferencias(userId);
  const remotas = user.user_metadata?.eon2_preferencias;
  if (remotas && typeof remotas === 'object') {
    const preferencias = { ...preferenciasBase(), ...remotas, colores: { ...((remotas as any).colores || {}) } };
    localStorage.setItem(PREFERENCIAS_KEY + ':' + userId, JSON.stringify(preferencias));
    return preferencias;
  }
  return leerPreferencias(userId);
}

async function escribirPreferencias(userId: string, preferencias: Preferencias) {
  localStorage.setItem(PREFERENCIAS_KEY + ':' + userId, JSON.stringify(preferencias));
  const { error } = await supabase.auth.updateUser({ data: { eon2_preferencias: preferencias } });
  if (error) throw error;
}

async function usuarioActualId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No estás autenticado.');
  return user.id;
}

export async function cargarCatalogos(): Promise<Catalogos> {
  const userId = await usuarioActualId();
  const [proyectos, categorias, clientes] = await Promise.all([
    supabase.from('proyectos').select('id,nombre,descripcion,activo').eq('user_id', userId).eq('activo', true).order('nombre'),
    supabase.from('categorias').select('id,nombre,color').eq('user_id', userId).order('nombre'),
    supabase.from('clientes').select('id,nombre,contacto').eq('user_id', userId).order('nombre')
  ]);
  if (proyectos.error) throw proyectos.error;
  if (categorias.error) throw categorias.error;
  if (clientes.error) throw clientes.error;
  const preferencias = await cargarPreferenciasCuenta(userId);
  const proyectosData = (proyectos.data ?? []).map(p => ({ ...p, color: preferencias.colores[colorClave('proyecto', p.id)] || '#ed7622' }));
  const clientesData = (clientes.data ?? []).map(c => ({ ...c, color: preferencias.colores[colorClave('cliente', c.id)] || '#d7a514' }));
  return { proyectos: proyectosData, categorias: categorias.data ?? [], clientes: clientesData };
}

export async function crearCategoria(nombre: string, color: string) {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('categorias').insert({
    user_id: userId,
    nombre: nombre.trim(),
    color: color || null
  });
  if (error) throw error;
}

export async function actualizarCategoria(id: number, nombre: string, color: string) {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('categorias')
    .update({ nombre: nombre.trim(), color: color || null })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function crearProyecto(nombre: string, descripcion: string, color = '#ed7622') {
  const userId = await usuarioActualId();
  const { data: creado, error } = await supabase.from('proyectos').insert({
    user_id: userId,
    nombre: nombre.trim(),
    descripcion: descripcion.trim() || null,
    activo: true
  }).select('id').single();
  if (error) throw error;
  if (creado) { const p = await cargarPreferenciasCuenta(userId); p.colores[colorClave('proyecto', creado.id)] = color; await escribirPreferencias(userId, p); }
}

export async function actualizarProyecto(id: number, nombre: string, descripcion: string, activo: boolean, color = '#ed7622') {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('proyectos')
    .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, activo })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) { const p = await cargarPreferenciasCuenta(user.id); p.colores[colorClave('proyecto', id)] = color; await escribirPreferencias(user.id, p); }
}

export async function crearCliente(nombre: string, contacto: string, color = '#d7a514') {
  const userId = await usuarioActualId();
  const { data: creado, error } = await supabase.from('clientes').insert({
    user_id: userId,
    nombre: nombre.trim(),
    contacto: contacto.trim() || null
  }).select('id').single();
  if (error) throw error;
  if (creado) { const p = await cargarPreferenciasCuenta(userId); p.colores[colorClave('cliente', creado.id)] = color; await escribirPreferencias(userId, p); }
}

export async function actualizarCliente(id: number, nombre: string, contacto: string, color = '#d7a514') {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('clientes')
    .update({ nombre: nombre.trim(), contacto: contacto.trim() || null })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) { const p = await cargarPreferenciasCuenta(user.id); p.colores[colorClave('cliente', id)] = color; await escribirPreferencias(user.id, p); }
}

export async function cargarRegistros(desde: string, hasta?: string): Promise<Registro[]> {
  let query = supabase.from('registros')
    .select('id,fecha,proyecto_id,categoria_id,cliente_id,tiempo_minutos,detalle,proyecto:proyectos(nombre),categoria:categorias(nombre,color),cliente:clientes(nombre)')
    .gte('fecha', desde).order('fecha', { ascending: false }).limit(10000);
  if (hasta) query = query.lte('fecha', hasta);
  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    ...row,
    proyecto: Array.isArray(row.proyecto) ? (row.proyecto[0] ?? null) : row.proyecto,
    categoria: Array.isArray(row.categoria) ? (row.categoria[0] ?? null) : row.categoria,
    cliente: Array.isArray(row.cliente) ? (row.cliente[0] ?? null) : row.cliente
  })) as Registro[];
}


export async function cargarPreferencias(): Promise<Preferencias> {
  const userId = await usuarioActualId();
  return cargarPreferenciasCuenta(userId);
}

export async function guardarPreferencias(parcial: Partial<Preferencias>) {
  const userId = await usuarioActualId();
  const actuales = await cargarPreferenciasCuenta(userId);
  const nuevas = { ...actuales, ...parcial, colores: { ...actuales.colores, ...(parcial.colores || {}) } };
  await escribirPreferencias(userId, nuevas);
}

export async function guardarColor(tipo: 'categoria'|'proyecto'|'cliente', id: number, color: string) {
  const userId = await usuarioActualId();
  const p = await cargarPreferenciasCuenta(userId);
  p.colores[colorClave(tipo, id)] = color;
  await escribirPreferencias(userId, p);
}
