// Vista pública (solo lectura).
import './icons.js';
import { subscribe } from './db.js';
import { esc, hoyISO, proximaId, norm, asignados, bannerModo } from './common.js';
import { cardHTML } from './cards.js';

bannerModo();

const $grid = document.getElementById('schedule-container');
const $select = document.getElementById('week-select');
const $search = document.getElementById('search');
const $result = document.getElementById('search-result');
const $toggle = document.getElementById('toggle-all');

let semanas = [];
const abiertas = new Set(); // tareas expandidas por el usuario (se conservan al llegar cambios en vivo)

function llenarSelector() {
  const actual = $select.value;
  $select.querySelectorAll('option[data-week]').forEach(o => o.remove());
  semanas.forEach(s => {
    const o = new Option(`${s.titulo} · ${s.fecha?.split('-').reverse().slice(0, 2).join('/')} · Cap. ${s.capitan}`, s.id);
    o.dataset.week = '1';
    $select.add(o);
  });
  $select.value = [...$select.options].some(o => o.value === actual) ? actual : 'proximas';
}

function render() {
  const sel = $select.value;
  const q = norm($search.value);
  const hoy = hoyISO();
  const prox = proximaId(semanas);

  let lista = sel === 'all' ? semanas : sel === 'proximas' ? semanas.filter(s => s.fecha >= hoy) : semanas.filter(s => s.id === sel);
  if (sel === 'proximas' && !lista.length) lista = semanas; // si ya pasaron todas, mostrar todo

  if (q) {
    const hits = [];
    lista = lista.filter(s => {
      const tareas = (s.tareas || []).filter(t => asignados(t).some(v => norm(v).includes(q))).map(t => t.nombre);
      const cap = norm(s.capitan).includes(q);
      if (tareas.length || cap) hits.push(`<strong>${esc(s.titulo)}</strong>: ${[cap && 'Capitán', ...tareas].filter(Boolean).map(esc).join(', ')}`);
      return tareas.length || cap;
    });
    $result.hidden = false;
    $result.innerHTML = hits.length ? hits.join(' · ') : 'No hay asignaciones para ese nombre en las semanas mostradas.';
  } else {
    $result.hidden = true;
  }

  $grid.innerHTML = lista.length
    ? lista.map(s => cardHTML(s, { proxima: s.id === prox, pasada: s.fecha < hoy, abiertas, buscar: q })).join('')
    : '<p class="no-results">No hay turnos para mostrar.</p>';

  if (sel !== 'all' && sel !== 'proximas') document.getElementById(`s-${sel}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Recordar qué tareas abrió el usuario
$grid.addEventListener('toggle', e => {
  const key = e.target.dataset?.key;
  if (!key) return;
  e.target.open ? abiertas.add(key) : abiertas.delete(key);
}, true);

$toggle.addEventListener('click', () => {
  const abrir = $toggle.classList.toggle('on');
  $grid.querySelectorAll('details.task').forEach(d => (d.open = abrir));
  $toggle.textContent = abrir ? 'Ocultar nombres' : 'Ver todos los nombres';
});

$select.addEventListener('change', render);
let t;
$search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 150); });

subscribe('semanas', data => {
  semanas = data;
  llenarSelector();
  render();
}, err => {
  console.error(err);
  $grid.innerHTML = '<p class="no-results">No se pudo cargar el cronograma. Revisa tu conexión.</p>';
});
