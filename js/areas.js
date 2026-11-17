// Catálogo de áreas: ícono + color para identificar cada tarea de un vistazo.
// Si una tarea no tiene "icono" elegido, se deduce de su nombre (ej. "Baños mujeres" → baño de mujeres).
import { icon } from './icons.js?v=20261117f';
import { norm, esc } from './common.js?v=20261117f';

export const AREAS = {
  'bano-varones': { label: 'Baño de varones', icon: 'toilet', sub: 'mars', color: '#38bdf8' },
  'bano-mujeres': { label: 'Baño de mujeres', icon: 'toilet', sub: 'venus', color: '#f472b6' },
  'bano':         { label: 'Baños (general)', icon: 'toilet', color: '#22d3ee' },
  'auditorio':    { label: 'Auditorio', icon: 'armchair', color: '#fbbf24' },
  'plataforma':   { label: 'Plataforma', icon: 'mic', color: '#a78bfa' },
  'entrada':      { label: 'Pasillo / Entrada', icon: 'door', color: '#2dd4bf' },
  'lactantes':    { label: 'Sala B / Lactantes', icon: 'baby', color: '#fb7185' },
  'patio':        { label: 'Patio / Jardín', icon: 'trees', color: '#4ade80' },
  'proveedor':    { label: 'Proveedor de artículos', icon: 'package', color: '#fb923c' },
  'sonido':       { label: 'Sonido', icon: 'speaker', color: '#818cf8' },
  'vidrios':      { label: 'Vidrios / Ventanas', icon: 'droplets', color: '#67e8f9' },
  'cocina':       { label: 'Cocina', icon: 'utensils', color: '#facc15' },
  'biblioteca':   { label: 'Biblioteca / Literatura', icon: 'book', color: '#c084fc' },
  'estacionamiento': { label: 'Estacionamiento', icon: 'car', color: '#94a3b8' },
  'flores':       { label: 'Flores / Decoración', icon: 'flower', color: '#f9a8d4' },
  'luces':        { label: 'Luces', icon: 'lightbulb', color: '#fde047' },
  'general':      { label: 'Limpieza general', icon: 'spray', color: '#5eead4' }
};

const REGLAS = [
  [/bano|sanitario|servicio higienico/, n => (/varon|hombre|caballero/.test(n) ? 'bano-varones' : /mujer|dama/.test(n) ? 'bano-mujeres' : 'bano')],
  [/auditorio|salon principal/, 'auditorio'],
  [/plataforma|escenario|podio/, 'plataforma'],
  [/lactante|bebe|nino|sala b/, 'lactantes'],
  [/patio|jardin|exterior/, 'patio'],
  [/pasillo|entrada|puerta|recepcion/, 'entrada'],
  [/proveedor|articulo|insumo|material/, 'proveedor'],
  [/sonido|audio|microfono/, 'sonido'],
  [/vidrio|ventana/, 'vidrios'],
  [/cocina|comedor/, 'cocina'],
  [/biblioteca|libro|literatura/, 'biblioteca'],
  [/estacionamiento|cochera|parqueo/, 'estacionamiento'],
  [/flor|decoracion/, 'flores'],
  [/luz|luces|lampara/, 'luces']
];

/** Clave de área de una tarea: la elegida o la deducida del nombre. */
export function areaDe(t) {
  if (t?.icono && AREAS[t.icono]) return t.icono;
  const n = norm(t?.nombre);
  for (const [re, k] of REGLAS) if (re.test(n)) return typeof k === 'function' ? k(n) : k;
  return 'general';
}

export const GENEROS = {
  mars: { label: 'Varones', color: '#38bdf8', emoji: '🚹' },
  venus: { label: 'Mujeres', color: '#f472b6', emoji: '🚺' }
};

/** En la tarea "Baños" (general) con 2+ cupos: la primera mitad es el baño de varones y la segunda el de mujeres. */
export function generoCupo(t, k) {
  if (areaDe(t) !== 'bano') return null;
  const c = Number(t.cupos) || 0;
  if (c < 2) return null;
  return k < Math.ceil(c / 2) ? 'mars' : 'venus';
}

/** Insignia de color con el ícono del área (y el símbolo ♂/♀ en los baños). */
export function badgeHTML(t, extra = '') {
  const a = AREAS[areaDe(t)];
  return `<span class="area-badge ${extra}" style="--c:${a.color}" title="${esc(a.label)}">${icon(a.icon)}${a.sub ? `<span class="sub">${icon(a.sub)}</span>` : ''}</span>`;
}

/** <option>s para elegir el ícono (vacío = automático según el nombre). */
export function opcionesArea(sel = '') {
  return `<option value=""${!sel ? ' selected' : ''}>Ícono automático</option>` +
    Object.entries(AREAS).map(([k, a]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(a.label)}</option>`).join('');
}
