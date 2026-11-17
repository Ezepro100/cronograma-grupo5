// Render de la tarjeta de una semana, compartido por la vista de usuario y la de admin.
import { esc, fmtFecha, asignados, norm } from './common.js';
import { icon } from './icons.js';

/**
 * @param {object} s semana
 * @param {object} o { admin, proxima, abiertas:Set, buscar:string }
 */
export function cardHTML(s, o = {}) {
  const q = norm(o.buscar);
  const tareas = s.tareas || [];
  const total = tareas.reduce((n, t) => n + (Number(t.cupos) || 0), 0);
  const llenos = tareas.reduce((n, t) => n + Math.min(asignados(t).length, Number(t.cupos) || 0), 0);
  const capMatch = q && norm(s.capitan).includes(q);

  const items = tareas.map((t, i) => {
    const cupos = Number(t.cupos) || 0;
    const nombres = asignados(t);
    const n = Math.min(nombres.length, cupos);
    const estado = n === 0 ? 'vacia' : n < cupos ? 'parcial' : 'completa';
    const match = q && nombres.some(v => norm(v).includes(q));
    const abierta = o.admin || match || o.abiertas?.has(`${s.id}:${i}`);
    const chips = [
      ...nombres.map(v => `<span class="chip${q && norm(v).includes(q) ? ' match' : ''}">${esc(v)}</span>`),
      ...Array(Math.max(0, cupos - nombres.length)).fill(`<span class="chip libre">Cupo libre</span>`)
    ].join('');
    return `<li><details class="task ${estado}${match ? ' match' : ''}" data-key="${s.id}:${i}"${abierta ? ' open' : ''}>
      <summary>
        <span class="ring" style="--p:${cupos ? Math.round((n / cupos) * 100) : 0}" aria-label="${n} de ${cupos} asignados">${n}/${cupos}</span>
        <span class="task-name">${esc(t.nombre)}</span>
        ${icon('chevron', 'chev')}
      </summary>
      <div class="chips">${chips || '<span class="chip libre">Sin cupos</span>'}</div>
    </details></li>`;
  }).join('');

  const acciones = o.admin
    ? `<div class="card-actions">
        <button class="icon-btn" data-act="editar" data-id="${s.id}" title="Editar">${icon('edit')}</button>
        <button class="icon-btn" data-act="duplicar" data-id="${s.id}" title="Duplicar">${icon('copy')}</button>
        <button class="icon-btn danger" data-act="eliminar" data-id="${s.id}" title="Eliminar">${icon('trash')}</button>
      </div>`
    : '';

  return `<article class="schedule-card${o.proxima ? ' proxima' : ''}${o.pasada ? ' pasada' : ''}" id="s-${s.id}">
    <div class="card-header">
      <span class="week-badge">${esc(s.titulo || 'Semana')}</span>
      ${o.proxima ? `<span class="next-badge">${icon('star')} Próxima</span>` : ''}
      ${acciones}
    </div>
    <p class="date-text">${icon('calendar')} ${esc(fmtFecha(s.fecha))}</p>
    <h3 class="${capMatch ? 'match' : ''}">${icon('captain')} ${esc(s.capitan || 'Sin capitán')}</h3>
    <div class="progress" title="${llenos} de ${total} cupos asignados">
      <div class="bar"><span style="width:${total ? (llenos / total) * 100 : 0}%"></span></div>
      <small>${llenos}/${total} cupos</small>
    </div>
    <ul class="tasks-list">${items || '<li class="empty">Sin tareas</li>'}</ul>
  </article>`;
}
