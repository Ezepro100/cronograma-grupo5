import { MODE } from './db.js?v=20261117d';
import { icon } from './icons.js?v=20261117d';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapa texto ingresado por usuarios antes de insertarlo como HTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

const fmt = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtFecha = iso => {
  if (!iso) return 'Sin fecha';
  const t = fmt.format(new Date(`${iso}T12:00:00`));
  return t[0].toUpperCase() + t.slice(1);
};

export const hoyISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Id de la próxima semana (hoy o futura más cercana). */
export const proximaId = semanas => semanas.find(s => s.fecha >= hoyISO())?.id;

export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const asignados = t => (t.voluntarios || []).filter(v => v && v.trim());

export function toast(msg, tipo = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.setAttribute('role', 'status');
    document.body.append(box);
  }
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `${icon(tipo === 'error' ? 'alert' : 'check')}<span>${esc(msg)}</span>`;
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3000);
}

export function bannerModo() {
  if (MODE !== 'local') return;
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div class="banner">${icon('alert')} Modo local: los datos se guardan solo en este navegador. Configura Firebase en <code>js/firebase-config.js</code> para compartirlos.</div>`
  );
}
