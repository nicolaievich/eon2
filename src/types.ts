export interface Proyecto { id:number; nombre:string; descripcion?:string|null; activo?:boolean; color?:string|null; }
export interface Categoria { id:number; nombre:string; color?:string|null; }
export interface Cliente { id:number; nombre:string; contacto?:string|null; color?:string|null; }

export interface Preferencias {
  categoriaId: number|null;
  proyectoId: number|null;
  clienteId: number|null;
  colores: Record<string, string>;
}
export interface Registro {
  id:number; fecha:string; proyecto_id:number|null; categoria_id:number; cliente_id:number|null;
  tiempo_minutos:number; detalle:string|null;
  proyecto?:{nombre:string}|null;
  categoria?:{nombre:string;color?:string|null}|null;
  cliente?:{nombre:string}|null;
}
export interface Catalogos { proyectos:Proyecto[]; categorias:Categoria[]; clientes:Cliente[]; }
