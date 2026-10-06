import { supabase } from './lib/supabase';
import type { Catalogos, Registro } from './types';

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

export async function crearRegistro(datos: {
  fecha: string;
  proyecto_id: number | null;
  categoria_id: number;
  cliente_id: number | null;
  tiempo_minutos: number;
  detalle: string | null;
}): Promise<void> {
  const result = await supabase.from('registros').insert(datos);
  if (result.error) throw result.error;
}

export async function crearCliente(datos: { nombre: string; contacto: string | null }): Promise<void> {
  const result = await supabase.from('clientes').insert(datos);
  if (result.error) throw result.error;
}

export async function crearCategoria(datos: { nombre: string; color: string }): Promise<void> {
  const result = await supabase.from('categorias').insert(datos);
  if (result.error) throw result.error;
}

export async function crearProyecto(datos: { nombre: string; descripcion: string | null }): Promise<void> {
  const result = await supabase.from('proyectos').insert({ ...datos, activo: true });
  if (result.error) throw result.error;
}
