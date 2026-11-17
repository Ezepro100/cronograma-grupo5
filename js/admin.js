// Vista de administrador: login + CRUD de semanas, voluntarios y tareas base.
import { icon } from './icons.js';
import { MODE, subscribe, save, saveMany, remove, seed, onAuth, login, logout, isAdmin } from './db.js';
import { esc, norm, asignados, hoyISO, proximaId, toast, bannerModo } from './common.js';
import { cardHTML } from './cards.js';

bannerModo();

const $ = id => document.getElementById(id);
const state = { semanas: [], voluntarios: [], plantilla: [], editId: null };
const clampCupos = v => Math.min(10, Math.max(1, parseInt(v, 10) || 1));
const addDays = (iso, d) => {
  const f = new Date(`${iso}T12:00:00`);
  f.setDate(f.getDate() + d);
  return f.toISOString().slice(0, 10);
};
const fallo = err => { console.error(err); toast(err?.code === 'permission-denied' ? 'Sin permisos para esta acción' : 'Error al guardar', 'error'); };

/* ============================ Autenticación ============================ */
let iniciado = false;

onAuth(async user => {
  const admin = await isAdmin(user);
  $('login').hidden = admin;
  $('app').hidden = !admin;
  if (user && !admin) {
    const e = $('login-error');
    e.hidden = false;
    e.textContent = `La cuenta ${user.email} no tiene permisos de administrador.`;
    logout();
  }
  if (admin && !iniciado) {
    iniciado = true;
    $('user-email').textContent = user.local ? 'Modo local' : user.email;
    $('logout-btn').hidden = !!user.local;
    iniciar();
  }
});

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  $('login-error').hidden = true;
  try {
    await login(f.get('email').trim(), f.get('password'));
  } catch (err) {
    $('login-error').hidden = false;
    $('login-error').textContent = /invalid|wrong|not-found/.test(err.code) ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intenta de nuevo.';
  } finally {
    btn.disabled = false;
  }
});

$('logout-btn').addEventListener('click', async () => { await logout(); location.reload(); });

/* ============================ Tabs ============================ */
document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  document.querySelectorAll('.tabs [data-tab]').forEach(x => {
    x.setAttribute('aria-selected', x === b);
    $(`tab-${x.dataset.tab}`).hidden = x !== b;
  });
});

/* ============================ Datos en vivo ============================ */
function iniciar() {
  subscribe('semanas', d => { state.semanas = d; renderSemanas(); renderVoluntarios(); renderListas(); }, fallo);
  subscribe('voluntarios', d => { state.voluntarios = d; renderVoluntarios(); renderListas(); renderStats(); }, fallo);
  subscribe('plantilla', d => { state.plantilla = d; renderPlantilla(); }, fallo);
}

/* ---------- Capitanes y equipos ---------- */
// Un voluntario es capitán si tiene rol 'capitan'; los registros antiguos sin rol
// se consideran capitanes si figuran como capitán de alguna semana.
const capsSemanas = () => new Set(state.semanas.map(s => norm(s.capitan)).filter(Boolean));
const esCapitan = (v, cs = capsSemanas()) => (v.rol ? v.rol === 'capitan' : cs.has(norm(v.nombre)));

function capitanes() {
  const cs = capsSemanas();
  const m = new Map();
  state.voluntarios.filter(v => esCapitan(v, cs)).forEach(v => m.set(norm(v.nombre), v.nombre));
  state.semanas.forEach(s => s.capitan && !m.has(norm(s.capitan)) && m.set(norm(s.capitan), s.capitan));
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

const equipoDe = cap => {
  const cs = capsSemanas();
  return state.voluntarios.filter(v => !esCapitan(v, cs) && cap && norm(v.equipo) === norm(cap));
};

/** Datalists del editor: el equipo del capitán indicado aparece primero. */
function renderListas(cap = '') {
  const equipo = equipoDe(cap).map(v => v.nombre);
  const enEquipo = new Set(equipo.map(norm));
  const resto = state.voluntarios.map(v => v.nombre).filter(n => !enEquipo.has(norm(n)));
  $('vol-list').innerHTML = [
    ...equipo.map(n => `<option value="${esc(n)}">Equipo de ${esc(cap)}</option>`),
    ...resto.map(n => `<option value="${esc(n)}">`)
  ].join('');
  $('cap-list').innerHTML = capitanes().map(n => `<option value="${esc(n)}">`).join('');
}

const opcionesEquipo = (sel = '') => [
  `<option value="__cap"${sel === '__cap' ? ' selected' : ''}>★ Es capitán</option>`,
  `<option value=""${sel === '' ? ' selected' : ''}>Sin equipo</option>`,
  ...capitanes().map(c => `<option value="${esc(c)}"${norm(sel) === norm(c) && sel !== '__cap' ? ' selected' : ''}>Equipo de ${esc(c)}</option>`)
].join('');

function renderStats() {
  const hoy = hoyISO();
  const futuras = state.semanas.filter(s => s.fecha >= hoy);
  const libres = futuras.reduce((n, s) => n + (s.tareas || []).reduce((m, t) => m + Math.max(0, (+t.cupos || 0) - asignados(t).length), 0), 0);
  $('stats').innerHTML = `
    <span class="stat"><b>${state.semanas.length}</b>semanas</span>
    <span class="stat"><b>${futuras.length}</b>próximas</span>
    <span class="stat"><b>${libres}</b>cupos libres</span>
    <span class="stat"><b>${state.voluntarios.length}</b>voluntarios</span>`;
}

/* ============================ Semanas ============================ */
function renderSemanas() {
  renderStats();
  const hoy = hoyISO();
  const prox = proximaId(state.semanas);
  const vacio = !state.semanas.length;
  $('admin-grid').innerHTML = vacio
    ? `<div class="no-results">No hay semanas cargadas.<br><br>
         <button class="btn-primary" data-act="seed">${icon('star')} Cargar datos iniciales</button></div>`
    : state.semanas.map(s => cardHTML(s, { admin: true, proxima: s.id === prox, pasada: s.fecha < hoy })).join('');
}

$('admin-grid').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const s = state.semanas.find(x => x.id === b.dataset.id);
  switch (b.dataset.act) {
    case 'slot': return editarCupo(b, s);
    case 'editar': return abrirEditor(s);
    case 'duplicar': return abrirEditor({ ...structuredClone(s), id: null, ...siguiente() }, 'Duplicar semana');
    case 'eliminar':
      if (confirm(`¿Eliminar "${s.titulo}" (${s.fecha})? Esta acción no se puede deshacer.`)) {
        remove('semanas', s.id).then(() => toast('Semana eliminada')).catch(fallo);
      }
      return;
    case 'seed':
      b.disabled = true;
      return seed().then(() => toast('Datos iniciales cargados')).catch(fallo);
  }
});

/** Asignación rápida: tocar un cupo en la tarjeta abre un selector con el equipo del capitán primero. */
function editarCupo(chip, s) {
  const ti = +chip.dataset.t, k = +chip.dataset.k;
  const tarea = s.tareas[ti];
  const actual = (tarea.voluntarios || [])[k] || '';
  const equipo = equipoDe(s.capitan).map(v => v.nombre);
  const enEquipo = new Set(equipo.map(norm));
  const otros = state.voluntarios.map(v => v.nombre).filter(n => !enEquipo.has(norm(n)));
  const usados = new Set(s.tareas.flatMap(asignados).map(norm));
  const opt = n => `<option value="${esc(n)}"${norm(n) === norm(actual) ? ' selected' : ''}>${esc(n)}${usados.has(norm(n)) && norm(n) !== norm(actual) ? ' (ya asignado)' : ''}</option>`;

  const sel = document.createElement('select');
  sel.className = 'slot-select';
  sel.setAttribute('aria-label', `Voluntario para ${tarea.nombre}`);
  sel.innerHTML = `<option value="">— Cupo libre —</option>
    ${actual && !state.voluntarios.some(v => norm(v.nombre) === norm(actual)) ? opt(actual) : ''}
    <optgroup label="Equipo de ${esc(s.capitan || 'capitán')}">${equipo.map(opt).join('') || '<option disabled>(sin voluntarios en su equipo)</option>'}</optgroup>
    ${otros.length ? `<optgroup label="Otros voluntarios">${otros.map(opt).join('')}</optgroup>` : ''}`;
  chip.replaceWith(sel);
  sel.focus();
  try { sel.showPicker(); } catch { /* navegador sin showPicker */ }

  let guardando = false;
  sel.addEventListener('change', async () => {
    guardando = true;
    const tareas = structuredClone(s.tareas);
    const vols = Array.from({ length: clampCupos(tareas[ti].cupos) }, (_, i) => (tareas[ti].voluntarios || [])[i] || '');
    vols[k] = sel.value;
    tareas[ti].voluntarios = vols;
    try {
      await save('semanas', { ...s, tareas });
      toast(sel.value ? `${sel.value} → ${tareas[ti].nombre}` : 'Cupo liberado');
    } catch (err) { fallo(err); renderSemanas(); }
  });
  sel.addEventListener('blur', () => setTimeout(() => !guardando && renderSemanas(), 200));
}

/** Título y fecha sugeridos para una semana nueva (cada 3 semanas, como el cronograma original). */
function siguiente() {
  const ult = state.semanas.at(-1);
  const nums = state.semanas.map(s => parseInt(String(s.titulo).match(/\d+/)?.[0], 10)).filter(Boolean);
  return {
    titulo: `Semana ${(nums.length ? Math.max(...nums) : 0) + 1}`,
    fecha: ult?.fecha ? addDays(ult.fecha, 21) : hoyISO()
  };
}

const tareasBase = () => state.plantilla.map(t => ({ nombre: t.nombre, cupos: clampCupos(t.cupos), voluntarios: Array(clampCupos(t.cupos)).fill('') }));

$('new-week').addEventListener('click', () => abrirEditor({ id: null, ...siguiente(), capitan: '', tareas: tareasBase() }, 'Nueva semana'));

/* ---------- Editor ---------- */
const $dlg = $('dlg-semana');
const $form = $('semana-form');
const $tasks = $('task-editors');

function slotsHTML(cupos, vols = []) {
  return Array.from({ length: cupos }, (_, i) =>
    `<input list="vol-list" placeholder="Voluntario ${i + 1}" value="${esc(vols[i] || '')}" maxlength="60" autocomplete="off" aria-label="Voluntario ${i + 1}">`).join('');
}

function taskEditorHTML(t) {
  const cupos = clampCupos(t.cupos);
  return `<div class="task-edit">
    <div class="top">
      <input name="nombre" value="${esc(t.nombre)}" placeholder="Nombre de la tarea" required maxlength="60" aria-label="Tarea">
      <input name="cupos" type="number" min="1" max="10" value="${cupos}" title="Cantidad de voluntarios" aria-label="Cupos">
      <button type="button" class="icon-btn" data-move="-1" title="Subir">${icon('up')}</button>
      <button type="button" class="icon-btn" data-move="1" title="Bajar">${icon('down')}</button>
      <button type="button" class="icon-btn danger" data-del title="Quitar tarea">${icon('trash')}</button>
    </div>
    <div class="slots">${slotsHTML(cupos, t.voluntarios)}</div>
  </div>`;
}

const leerTareas = () => [...$tasks.querySelectorAll('.task-edit')].map(el => ({
  nombre: el.querySelector('[name=nombre]').value.trim(),
  cupos: clampCupos(el.querySelector('[name=cupos]').value),
  voluntarios: [...el.querySelectorAll('.slots input')].map(i => i.value.trim())
}));

function pintarTareas(tareas) {
  $tasks.innerHTML = tareas.length ? tareas.map(taskEditorHTML).join('') : '<p class="meta">Sin tareas. Agrega una o usa las tareas base.</p>';
  revisarDuplicados();
}

function revisarDuplicados() {
  const inputs = [...$tasks.querySelectorAll('.slots input')];
  const cuenta = {};
  inputs.forEach(i => { const k = norm(i.value); if (k) cuenta[k] = (cuenta[k] || 0) + 1; });
  const dups = new Set(Object.keys(cuenta).filter(k => cuenta[k] > 1));
  inputs.forEach(i => i.classList.toggle('dup', dups.has(norm(i.value))));
  const w = $('dup-warn');
  w.hidden = !dups.size;
  if (dups.size) {
    const nombres = inputs.filter(i => dups.has(norm(i.value))).map(i => i.value.trim());
    w.innerHTML = `${icon('alert')} Asignado en más de una tarea: ${esc([...new Set(nombres)].join(', '))}`;
  }
  return dups.size;
}

function infoEquipo() {
  const cap = $form.capitan.value.trim();
  const eq = equipoDe(cap).map(v => v.nombre);
  $('team-info').innerHTML = !cap ? '' : eq.length
    ? `Equipo de ${esc(cap)} (${eq.length}): <b>${eq.map(esc).join(', ')}</b>`
    : `${esc(cap)} aún no tiene voluntarios en su equipo (asígnalos en la pestaña Voluntarios).`;
  renderListas(cap);
}

function abrirEditor(s, titulo = 'Editar semana') {
  state.editId = s.id || null;
  $('dlg-title').textContent = titulo;
  $form.titulo.value = s.titulo || '';
  $form.fecha.value = s.fecha || '';
  $form.capitan.value = s.capitan || '';
  pintarTareas(s.tareas || []);
  infoEquipo();
  $dlg.showModal();
}

$form.capitan.addEventListener('input', infoEquipo);

$('fill-team').addEventListener('click', () => {
  const inputs = [...$tasks.querySelectorAll('.slots input')];
  const usados = new Set(inputs.map(i => norm(i.value)).filter(Boolean));
  const libres = equipoDe($form.capitan.value.trim()).map(v => v.nombre).filter(n => !usados.has(norm(n)));
  if (!libres.length) return toast('No quedan voluntarios del equipo sin asignar', 'error');
  let n = 0;
  inputs.filter(i => !i.value.trim()).forEach(i => { if (libres.length) { i.value = libres.shift(); n++; } });
  revisarDuplicados();
  toast(n ? `${n} cupo(s) completados con el equipo` : 'No hay cupos vacíos');
});

$tasks.addEventListener('input', e => {
  if (e.target.name === 'cupos') {
    const el = e.target.closest('.task-edit');
    const actuales = [...el.querySelectorAll('.slots input')].map(i => i.value);
    el.querySelector('.slots').innerHTML = slotsHTML(clampCupos(e.target.value), actuales);
  }
  revisarDuplicados();
});

$tasks.addEventListener('click', e => {
  const el = e.target.closest('.task-edit');
  if (!el) return;
  if (e.target.closest('[data-del]')) {
    const nombre = el.querySelector('[name=nombre]').value || 'esta tarea';
    if (confirm(`¿Quitar "${nombre}" de la semana?`)) { el.remove(); revisarDuplicados(); }
  }
  const mv = e.target.closest('[data-move]');
  if (mv) {
    const sib = mv.dataset.move === '-1' ? el.previousElementSibling : el.nextElementSibling;
    if (sib) mv.dataset.move === '-1' ? sib.before(el) : sib.after(el);
  }
});

$('add-task').addEventListener('click', () => {
  const ts = leerTareas();
  ts.push({ nombre: '', cupos: 1, voluntarios: [''] });
  pintarTareas(ts);
  $tasks.lastElementChild.querySelector('[name=nombre]').focus();
});

$('use-tpl').addEventListener('click', () => {
  if (!state.plantilla.length) return toast('No hay tareas base definidas', 'error');
  const actuales = leerTareas();
  if (actuales.some(t => asignados(t).length) && !confirm('Se reemplazarán las tareas actuales y sus asignaciones. ¿Continuar?')) return;
  pintarTareas(tareasBase());
});

$dlg.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === $dlg) $dlg.close(); });

$form.addEventListener('submit', async e => {
  e.preventDefault();
  const tareas = leerTareas().filter(t => t.nombre);
  if (!tareas.length) return toast('Agrega al menos una tarea', 'error');
  if (revisarDuplicados() && !confirm('Hay voluntarios repetidos en varias tareas. ¿Guardar igual?')) return;

  const semana = {
    id: state.editId,
    titulo: $form.titulo.value.trim(),
    fecha: $form.fecha.value,
    capitan: $form.capitan.value.trim(),
    tareas
  };
  const btn = $('save-week');
  btn.disabled = true;
  try {
    await save('semanas', semana);
    // Los nombres nuevos se suman solos al catálogo de voluntarios
    const conocidos = new Set(state.voluntarios.map(v => norm(v.nombre)));
    const nuevos = [];
    if (semana.capitan && !conocidos.has(norm(semana.capitan))) nuevos.push({ nombre: semana.capitan, rol: 'capitan', equipo: '' });
    [...new Set(tareas.flatMap(asignados))].filter(n => !conocidos.has(norm(n)) && norm(n) !== norm(semana.capitan))
      .forEach(nombre => nuevos.push({ nombre, rol: 'voluntario', equipo: semana.capitan }));
    if (nuevos.length) await saveMany('voluntarios', nuevos);
    $dlg.close();
    toast(nuevos.length ? `Semana guardada · ${nuevos.length} voluntario(s) nuevo(s) en el catálogo` : 'Semana guardada');
  } catch (err) {
    fallo(err);
  } finally {
    btn.disabled = false;
  }
});

/* ============================ Voluntarios ============================ */
function filaVoluntario(v, esCap) {
  const n = usos(v.nombre);
  const sel = esCap ? '__cap' : v.equipo || '';
  return `<div class="row${esCap ? ' cap' : ''}" data-id="${v.id}">
    <div class="grow"><input value="${esc(v.nombre)}" data-field="nombre" maxlength="60" aria-label="Nombre"></div>
    <select data-field="equipo" aria-label="Rol o equipo">${opcionesEquipo(sel)}</select>
    <span class="meta">${n ? `${n} semana${n > 1 ? 's' : ''}` : 'Sin asignar'}</span>
    <button class="icon-btn danger" data-del title="Eliminar">${icon('trash')}</button>
  </div>`;
}

function renderVoluntarios() {
  const cs = capsSemanas();
  const caps = capitanes();
  const total = state.voluntarios.length;
  $('vol-count').textContent = `${caps.length} capitanes · ${total - state.voluntarios.filter(v => esCapitan(v, cs)).length} voluntarios`;

  const grupos = caps.map(c => {
    const capDoc = state.voluntarios.find(v => norm(v.nombre) === norm(c));
    const miembros = equipoDe(c);
    return `<div class="group">
      <div class="group-head">${icon('captain')} ${esc(c)} <span class="meta">${miembros.length} en su equipo</span></div>
      ${capDoc ? filaVoluntario(capDoc, true) : ''}
      ${miembros.map(v => filaVoluntario(v, false)).join('') || '<p class="meta" style="padding:0 .3rem">Sin voluntarios aún.</p>'}
    </div>`;
  });
  const capsN = new Set(caps.map(norm));
  const sueltos = state.voluntarios.filter(v => !esCapitan(v, cs) && !capsN.has(norm(v.equipo)));
  if (sueltos.length) grupos.push(`<div class="group sin-equipo">
      <div class="group-head">${icon('users')} Sin equipo <span class="meta">${sueltos.length}</span></div>
      ${sueltos.map(v => filaVoluntario(v, false)).join('')}
    </div>`);

  $('vol-list-rows').innerHTML = grupos.join('') || '<p class="meta">Aún no hay voluntarios.</p>';
  const $eq = $('vol-equipo');
  const prev = $eq.value;
  $eq.innerHTML = opcionesEquipo(prev || '');
}

const rolDe = valor => (valor === '__cap' ? { rol: 'capitan', equipo: '' } : { rol: 'voluntario', equipo: valor });

$('vol-form').addEventListener('submit', e => {
  e.preventDefault();
  const nombre = e.target.nombre.value.trim();
  if (!nombre) return;
  if (state.voluntarios.some(v => norm(v.nombre) === norm(nombre))) return toast('Ese nombre ya existe', 'error');
  save('voluntarios', { nombre, ...rolDe(e.target.equipo.value) })
    .then(() => { e.target.nombre.value = ''; e.target.nombre.focus(); toast('Agregado'); }).catch(fallo);
});

function usos(nombre) {
  const k = norm(nombre);
  return state.semanas.filter(s => norm(s.capitan) === k || (s.tareas || []).some(t => asignados(t).some(v => norm(v) === k))).length;
}

/** Reemplaza un nombre en todas las semanas (capitán y asignaciones). */
async function reemplazarEnSemanas(viejo, nuevo) {
  const k = norm(viejo);
  const afectadas = state.semanas.filter(s => norm(s.capitan) === k || (s.tareas || []).some(t => (t.voluntarios || []).some(v => norm(v) === k)));
  if (!afectadas.length) return 0;
  await saveMany('semanas', afectadas.map(s => ({
    ...s,
    capitan: norm(s.capitan) === k ? nuevo : s.capitan,
    tareas: s.tareas.map(t => ({ ...t, voluntarios: (t.voluntarios || []).map(v => (norm(v) === k ? nuevo : v)) }))
  })));
  return afectadas.length;
}

/** Cambia el campo equipo de los miembros de un capitán (renombre o baja del capitán). */
const moverEquipo = (cap, nuevo) => {
  const miembros = equipoDe(cap);
  return miembros.length ? saveMany('voluntarios', miembros.map(m => ({ ...m, equipo: nuevo }))) : null;
};

$('vol-list-rows').addEventListener('change', async e => {
  const row = e.target.closest('.row');
  const v = state.voluntarios.find(x => x.id === row?.dataset.id);
  if (!v) return;
  const eraCap = esCapitan(v);
  try {
    if (e.target.dataset.field === 'equipo') {
      const cambio = rolDe(e.target.value);
      if (eraCap && cambio.rol !== 'capitan' && equipoDe(v.nombre).length &&
          !confirm(`${v.nombre} dejará de ser capitán y su equipo quedará "Sin equipo". ¿Continuar?`)) return renderVoluntarios();
      if (eraCap && cambio.rol !== 'capitan') await moverEquipo(v.nombre, '');
      await save('voluntarios', { ...v, ...cambio });
      return toast(cambio.rol === 'capitan' ? `${v.nombre} ahora es capitán` : cambio.equipo ? `${v.nombre} → equipo de ${cambio.equipo}` : `${v.nombre} quedó sin equipo`);
    }
    const nuevo = e.target.value.trim();
    if (!nuevo || nuevo === v.nombre) { e.target.value = v.nombre; return; }
    const n = usos(v.nombre);
    const propagar = n && confirm(`"${v.nombre}" está en ${n} semana(s). ¿Actualizar el nombre también allí?`);
    if (eraCap) await moverEquipo(v.nombre, nuevo);
    await save('voluntarios', { ...v, nombre: nuevo });
    if (propagar) await reemplazarEnSemanas(v.nombre, nuevo);
    toast('Actualizado');
  } catch (err) { fallo(err); }
});

$('vol-list-rows').addEventListener('click', async e => {
  if (!e.target.closest('[data-del]')) return;
  const v = state.voluntarios.find(x => x.id === e.target.closest('.row').dataset.id);
  if (!v || !confirm(`¿Eliminar a "${v.nombre}"?`)) return;
  try {
    if (esCapitan(v)) await moverEquipo(v.nombre, '');
    await remove('voluntarios', v.id);
    const n = usos(v.nombre);
    if (n && confirm(`También está asignado en ${n} semana(s). ¿Quitarlo de esas asignaciones?`)) await reemplazarEnSemanas(v.nombre, '');
    toast('Eliminado');
  } catch (err) { fallo(err); }
});

/* ============================ Tareas base ============================ */
function renderPlantilla() {
  $('tpl-rows').innerHTML = state.plantilla.map((t, i) => `<div class="row" data-id="${t.id}">
      <div class="grow"><input value="${esc(t.nombre)}" data-field="nombre" maxlength="60" aria-label="Tarea"></div>
      <input type="number" min="1" max="10" value="${clampCupos(t.cupos)}" data-field="cupos" title="Voluntarios" aria-label="Cupos">
      <button class="icon-btn" data-move="-1" title="Subir" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
      <button class="icon-btn" data-move="1" title="Bajar" ${i === state.plantilla.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
      <button class="icon-btn danger" data-del title="Eliminar">${icon('trash')}</button>
    </div>`).join('') || '<p class="meta">No hay tareas base.</p>';
}

$('tpl-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const orden = state.plantilla.reduce((m, t) => Math.max(m, t.orden ?? 0), -1) + 1;
  save('plantilla', { nombre: f.nombre.value.trim(), cupos: clampCupos(f.cupos.value), orden })
    .then(() => { f.reset(); toast('Tarea base agregada'); }).catch(fallo);
});

$('tpl-rows').addEventListener('change', e => {
  const t = state.plantilla.find(x => x.id === e.target.closest('.row')?.dataset.id);
  if (!t) return;
  const campo = e.target.dataset.field;
  const valor = campo === 'cupos' ? clampCupos(e.target.value) : e.target.value.trim();
  if (!valor) { e.target.value = t[campo]; return; }
  save('plantilla', { ...t, [campo]: valor }).then(() => toast('Tarea base actualizada')).catch(fallo);
});

$('tpl-rows').addEventListener('click', e => {
  const row = e.target.closest('.row');
  const i = state.plantilla.findIndex(x => x.id === row?.dataset.id);
  if (i < 0) return;
  const t = state.plantilla[i];
  if (e.target.closest('[data-del]')) {
    if (confirm(`¿Eliminar la tarea base "${t.nombre}"? Las semanas ya creadas no cambian.`)) remove('plantilla', t.id).then(() => toast('Tarea base eliminada')).catch(fallo);
    return;
  }
  const mv = e.target.closest('[data-move]');
  if (mv) {
    const j = i + Number(mv.dataset.move);
    const lista = [...state.plantilla];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    saveMany('plantilla', lista.map((x, k) => ({ ...x, orden: k }))).catch(fallo);
  }
});

if (MODE === 'local') console.info('Cronograma en modo local (sin Firebase).');
