// Vista pública: solo lectura, una tarjeta a la vez (Anterior · Actual · Próxima).
import './icons.js?v=20261117c';
import { subscribe } from './db.js?v=20261117c';
import { hoyISO, bannerModo } from './common.js?v=20261117c';
import { cardHTML } from './cards.js?v=20261117c';

bannerModo();

const $card = document.getElementById('schedule-container');
const $btns = [...document.querySelectorAll('.week-nav button')];
const corto = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

let semanas = [];
let rel = 0; // -1 anterior, 0 actual, 1 próxima

/** Índice del turno actual: el de hoy o el siguiente; si ya pasaron todos, el último. */
function indiceActual() {
  const hoy = hoyISO();
  const i = semanas.findIndex(s => s.fecha >= hoy);
  return i === -1 ? semanas.length - 1 : i;
}

function render() {
  if (!semanas.length) {
    $card.innerHTML = '<p class="no-results">Aún no hay turnos publicados.</p>';
    $btns.forEach(b => (b.disabled = true));
    return;
  }
  const base = indiceActual();
  $btns.forEach(b => {
    const s = semanas[base + Number(b.dataset.rel)];
    b.disabled = !s;
    b.setAttribute('aria-pressed', Number(b.dataset.rel) === rel);
    b.querySelector('small').textContent = s?.fecha ? corto.format(new Date(`${s.fecha}T12:00:00`)) : '—';
  });
  if (!semanas[base + rel]) rel = 0;
  const s = semanas[base + rel];
  const hoy = hoyISO();
  const etiqueta = rel === -1 ? 'Turno anterior' : rel === 1 ? 'Siguiente turno' : s.fecha === hoy ? 'Hoy' : s.fecha < hoy ? 'Último turno' : 'Turno actual';
  $card.innerHTML = cardHTML(s, { estatico: true, proxima: rel === 0, pasada: s.fecha < hoy, etiqueta });
}

function ir(nuevo) {
  if (nuevo < -1 || nuevo > 1 || !semanas[indiceActual() + nuevo] || nuevo === rel) return;
  rel = nuevo;
  render();
}

$btns.forEach(b => b.addEventListener('click', () => ir(Number(b.dataset.rel))));

// Flechas del teclado y deslizar en el celular
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') ir(rel - 1);
  if (e.key === 'ArrowRight') ir(rel + 1);
});
let x0 = null;
$card.addEventListener('touchstart', e => (x0 = e.touches[0].clientX), { passive: true });
$card.addEventListener('touchend', e => {
  if (x0 === null) return;
  const dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 60) ir(rel + (dx < 0 ? 1 : -1));
  x0 = null;
}, { passive: true });

subscribe('semanas', data => {
  semanas = data;
  render();
}, err => {
  console.error(err);
  $card.innerHTML = '<p class="no-results">No se pudo cargar el cronograma. Revisa tu conexión.</p>';
});
