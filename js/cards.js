// Render de la tarjeta de una semana, compartido por la vista de usuario y la de admin.
import { esc, fmtFecha, asignados, norm } from './common.js?v=20261117e';

import { icon } from './icons.js?v=20261117e';
import { badgeHTML, generoCupo, GENEROS } from './areas.js?v=20261117e';

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
    const vols = Array.from({ length: cupos }, (_, k) => String((t.voluntarios || [])[k] ?? '').trim());
    const n = vols.filter(Boolean).length;
    const estado = n === 0 ? 'vacia' : n < cupos ? 'parcial' : 'completa';
    const match = q && vols.some(v => v && norm(v).includes(q));
    const abierta = o.admin || match || o.abiertas?.has(`${s.id}:${i}`);
    const chips = vols.map((v, k) => {
      const g = generoCupo(t, k);
      const cls = (v ? `chip${q && norm(v).includes(q) ? ' match' : ''}` : 'chip libre') + (g ? ' con-g' : '');
      const txt = (g ? `<span class="g ${g}" title="Baño de ${GENEROS[g].label.toLowerCase()}">${icon(g)}</span>` : '') + (v ? esc(v) : 'Cupo libre');
      return o.admin
        ? `<button type="button" class="${cls}" data-act="slot" data-id="${s.id}" data-t="${i}" data-k="${k}" title="${v ? 'Cambiar voluntario' : 'Asignar voluntario'}">${txt}</button>`
        : `<span class="${cls}">${txt}</span>`;
    }).join('');
    const ring = `<span class="ring" style="--p:${cupos ? Math.round((n / cupos) * 100) : 0}" aria-label="${n} de ${cupos} asignados">${n}/${cupos}</span>`;
    const chipsBox = `<div class="chips">${chips || '<span class="chip libre">Sin cupos</span>'}</div>`;
    if (o.estatico) {
      return `<li class="task static ${estado}"><div class="task-row">${badgeHTML(t)}<span class="task-name">${esc(t.nombre)}</span>${ring}</div>${chipsBox}</li>`;
    }
    return `<li><details class="task ${estado}${match ? ' match' : ''}" data-key="${s.id}:${i}"${abierta ? ' open' : ''}>
      <summary>${badgeHTML(t)}<span class="task-name">${esc(t.nombre)}</span>${ring}${icon('chevron', 'chev')}</summary>
      ${chipsBox}
    </details></li>`;
  }).join('');

  const acciones = o.admin
    ? `<div class="card-actions">
        <button class="icon-btn share" data-act="compartir" data-id="${s.id}" title="Compartir imagen y enlace">${icon('share')}</button>
        <button class="icon-btn" data-act="editar" data-id="${s.id}" title="Editar">${icon('edit')}</button>
        <button class="icon-btn" data-act="duplicar" data-id="${s.id}" title="Duplicar">${icon('copy')}</button>
        <button class="icon-btn danger" data-act="eliminar" data-id="${s.id}" title="Eliminar">${icon('trash')}</button>
      </div>`
    : '';

  return `<article class="schedule-card${o.proxima ? ' proxima' : ''}${o.pasada ? ' pasada' : ''}" id="s-${s.id}">
    <div class="card-header">
      <span class="week-badge">${esc(s.titulo || 'Semana')}</span>
      ${(o.etiqueta ?? (o.proxima ? 'Próxima' : '')) ? `<span class="next-badge">${icon('star')} ${esc(o.etiqueta ?? 'Próxima')}</span>` : ''}
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
