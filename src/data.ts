import { supabase } from './lib/supabase';
import type { Catalogos, Registro } from './types';

async function usuarioId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('No hay una sesión autenticada.');
  return data.user.id;
}

export async function cargarCatalogos(): Promise<Catalogos> {
  const [proyectos, categorias, clientes] = await Promise.all([
    supabase.from('proyectos').select('id,nombre,descripcion,activo').eq('activo', true).order('nombre'),
    supabase.from('categorias').select('id,nombre,color').order('nombre'),
    supabase.from('clientes').select('id,nombre,contacto').order('nombre'),
  ]);
  if (proyectos.error) throw proyectos.error;
  if (categorias.error) throw categorias.error;
  if (clientes.error) throw clientes.error;
  return { proyectos: proyectos.data ?? [], categorias: categorias.data ?? [], clientes: clientes.data ?? [] };
}

export async function cargarRegistros(desde: string, hasta?: string): Promise<Registro[]> {
  let query = supabase
    .from('registros')
    .select('id,fecha,proyecto_id,categoria_id,cliente_id,tiempo_minutos,detalle,proyecto:proyectos(nombre),categoria:categorias(nombre,color),cliente:clientes(nombre)')
    .gte('fecha', desde)
    .order('fecha', { ascending: false })
    .limit(10000);
  if (hasta) query = query.lte('fecha', hasta);
  const result = await query;
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    ...row,
    proyecto: Array.isArray(row.proyecto) ? (row.proyecto[0] ?? null) : row.proyecto,
    categoria: Array.isArray(row.categoria) ? (row.categoria[0] ?? null) : row.categoria,
    cliente: Array.isArray(row.cliente) ? (row.cliente[0] ?? null) : row.cliente,
  })) as Registro[];
}

export async function cargarUltimosRegistros(dias = 90): Promise<Registro[]> {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return cargarRegistros(d.toISOString().slice(0, 10));
}

export async function crearRegistro(datos: Omit<Registro, 'id' | 'proyecto' | 'categoria' | 'cliente'>): Promise<void> {
  const user_id = await usuarioId();
  const result = await supabase.from('registros').insert({ ...datos, user_id });
  if (result.error) throw result.error;
}

export async function crearCliente(datos: { nombre: string; contacto: string | null }): Promise<void> {
  const result = await supabase.from('clientes').insert({ ...datos, user_id: await usuarioId() });
  if (result.error) throw result.error;
}

export async function crearCategoria(datos: { nombre: string; color: string }): Promise<void> {
  const result = await supabase.from('categorias').insert({ ...datos, user_id: await usuarioId() });
  if (result.error) throw result.error;
}

export async function crearProyecto(datos: { nombre: string; descripcion: string | null }): Promise<void> {
  const result = await supabase.from('proyectos').insert({ ...datos, activo: true, user_id: await usuarioId() });
  if (result.error) throw result.error;
}

export async function actualizarCliente(id: number, datos: { nombre: string; contacto: string | null }): Promise<void> {
  const result = await supabase.from('clientes').update(datos).eq('id', id).eq('user_id', await usuarioId());
  if (result.error) throw result.error;
}

export async function actualizarCategoria(id: number, datos: { nombre: string; color: string }): Promise<void> {
  const result = await supabase.from('categorias').update(datos).eq('id', id).eq('user_id', await usuarioId());
  if (result.error) throw result.error;
}

export async function actualizarProyecto(id: number, datos: { nombre: string; descripcion: string | null; activo?: boolean }): Promise<void> {
  const result = await supabase.from('proyectos').update(datos).eq('id', id).eq('user_id', await usuarioId());
  if (result.error) throw result.error;
}
