import { supabase } from './lib/supabase';
import type { Catalogos, Registro } from './types';

/**
 * Capa de datos inicial de EÓN 2.0.
 * Durante esta etapa es SOLO LECTURA: no hay INSERT, UPDATE ni DELETE.
 */
export async function cargarCatalogos():Promise<Catalogos> {
  const [proyectos,categorias,clientes] = await Promise.all([
    supabase.from('proyectos').select('id,nombre,descripcion,activo').eq('activo',true).order('nombre'),
    supabase.from('categorias').select('id,nombre,color').order('nombre'),
    supabase.from('clientes').select('id,nombre,contacto').order('nombre')
  ]);
  if(proyectos.error) throw proyectos.error;
  if(categorias.error) throw categorias.error;
  if(clientes.error) throw clientes.error;
  return {proyectos:proyectos.data??[],categorias:categorias.data??[],clientes:clientes.data??[]};
}

export async function cargarUltimosRegistros(dias=90):Promise<Registro[]> {
  const d=new Date(); d.setDate(d.getDate()-dias);
  const desde=d.toISOString().slice(0,10);
  const result=await supabase.from('registros')
    .select('id,fecha,proyecto_id,categoria_id,cliente_id,tiempo_minutos,detalle,proyecto:proyectos(nombre),categoria:categorias(nombre,color),cliente:clientes(nombre)')
    .gte('fecha',desde).order('fecha',{ascending:false}).limit(10000);
  if(result.error) throw result.error;
  return (result.data??[]) as Registro[];
}
