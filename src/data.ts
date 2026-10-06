import { supabase } from './lib/supabase';
import type { Catalogos, Registro } from './types';

export async function cargarCatalogos(): Promise<Catalogos> {
  const [proyectos, categorias, clientes] = await Promise.all([
    supabase.from('proyectos').select('id,nombre,descripcion,activo').eq('activo', true).order('nombre'),
    supabase.from('categorias').select('id,nombre,color').order('nombre'),
    supabase.from('clientes').select('id,nombre,contacto').order('nombre')
  ]);
  if (proyectos.error) throw proyectos.error;
  if (categorias.error) throw categorias.error;
  if (clientes.error) throw clientes.error;
  return { proyectos: proyectos.data ?? [], categorias: categorias.data ?? [], clientes: clientes.data ?? [] };
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
