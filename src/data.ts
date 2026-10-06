import { supabase } from './lib/supabase';
import type { Catalogos, Registro } from './types';

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
  return { proyectos: proyectos.data ?? [], categorias: categorias.data ?? [], clientes: clientes.data ?? [] };
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

export async function crearProyecto(nombre: string, descripcion: string) {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('proyectos').insert({
    user_id: userId,
    nombre: nombre.trim(),
    descripcion: descripcion.trim() || null,
    activo: true
  });
  if (error) throw error;
}

export async function actualizarProyecto(id: number, nombre: string, descripcion: string, activo: boolean) {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('proyectos')
    .update({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, activo })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function crearCliente(nombre: string, contacto: string) {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('clientes').insert({
    user_id: userId,
    nombre: nombre.trim(),
    contacto: contacto.trim() || null
  });
  if (error) throw error;
}

export async function actualizarCliente(id: number, nombre: string, contacto: string) {
  const userId = await usuarioActualId();
  const { error } = await supabase.from('clientes')
    .update({ nombre: nombre.trim(), contacto: contacto.trim() || null })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
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
