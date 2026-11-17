// Datos iniciales (los que tenía la versión anterior), usados para poblar la BD vacía.
export const PLANTILLA = [
  { nombre: 'Baños', cupos: 2 },
  { nombre: 'Auditorio principal', cupos: 2 },
  { nombre: 'Plataforma', cupos: 1 },
  { nombre: 'Pasillo y entrada principal', cupos: 1 },
  { nombre: 'Sala B y lactantes', cupos: 1 },
  { nombre: 'Patio trasero y pasillo', cupos: 1 },
  { nombre: 'Proveedor de artículos', cupos: 1 }
];

const tareasVacias = () => PLANTILLA.map(t => ({ ...t, voluntarios: Array(t.cupos).fill('') }));

export const SEMANAS = [
  { titulo: 'Semana 1', fecha: '2026-11-19', capitan: 'Daniel Casique' },
  { titulo: 'Semana 2', fecha: '2026-12-10', capitan: 'Alberto Bardalez' },
  { titulo: 'Semana 3', fecha: '2026-12-31', capitan: 'Marco Yovera' },
  { titulo: 'Semana 4', fecha: '2027-01-21', capitan: 'Rodolfo Medrano' }
].map(s => ({ ...s, tareas: tareasVacias() }));

export const VOLUNTARIOS = ['Daniel Casique', 'Alberto Bardalez', 'Marco Yovera', 'Rodolfo Medrano']
  .map(nombre => ({ nombre }));
