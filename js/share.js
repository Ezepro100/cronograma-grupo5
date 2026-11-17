// Compartir una semana: genera una imagen (canvas) con todo lo cargado + texto con enlace directo.
import { SHAPES, icon } from './icons.js?v=20261117d';
import { AREAS, areaDe } from './areas.js?v=20261117d';
import { fmtFecha, toast } from './common.js?v=20261117d';

const W = 1080;
const PAD = 56;
const FONT = `system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const C = { bg: '#0b1324', card: '#111c30', soft: '#17233a', border: '#22324d', text: '#f8fafc', muted: '#94a3b8', mint: '#2dd4bf', blue: '#38bdf8', amber: '#fbbf24' };

export const urlSemana = s => {
  const u = new URL('./', location.href);
  u.searchParams.set('s', s.id);
  return u.href;
};

const vols = t => Array.from({ length: Math.max(1, Number(t.cupos) || 1) }, (_, k) => String((t.voluntarios || [])[k] ?? '').trim());

/* ---------------- Texto para el mensaje ---------------- */
export function textoSemana(s) {
  const lineas = (s.tareas || []).map(t => {
    const v = vols(t);
    const nombres = v.filter(Boolean);
    const libres = v.length - nombres.length;
    return `• *${t.nombre}*: ${nombres.join(', ') || '—'}${libres ? ` (${libres} cupo${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''})` : ''}`;
  });
  return [
    `🧹 *Cronograma de Limpieza – Grupo 5*`,
    `📅 ${s.titulo} · ${fmtFecha(s.fecha)}`,
    `🛡️ Capitán: ${s.capitan || '—'}`,
    '',
    ...lineas,
    '',
    `👉 Ver online: ${urlSemana(s)}`
  ].join('\n');
}

/* ---------------- Dibujo en canvas ---------------- */
let fondo;
const cargarFondo = () => (fondo ??= new Promise(res => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = new URL('./fondo.webp', location.href).href;
}));

const parser = new DOMParser();
const cacheIconos = {};
function formas(name) {
  if (cacheIconos[name]) return cacheIconos[name];
  const doc = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${SHAPES[name] || ''}</svg>`, 'image/svg+xml');
  const n = (el, a) => parseFloat(el.getAttribute(a) || 0);
  return (cacheIconos[name] = [...doc.documentElement.children].map(el => {
    const p = new Path2D();
    switch (el.tagName) {
      case 'path': return new Path2D(el.getAttribute('d'));
      case 'circle': p.arc(n(el, 'cx'), n(el, 'cy'), n(el, 'r'), 0, Math.PI * 2); return p;
      case 'ellipse': p.ellipse(n(el, 'cx'), n(el, 'cy'), n(el, 'rx'), n(el, 'ry'), 0, 0, Math.PI * 2); return p;
      case 'rect':
        if (p.roundRect) p.roundRect(n(el, 'x'), n(el, 'y'), n(el, 'width'), n(el, 'height'), n(el, 'rx'));
        else p.rect(n(el, 'x'), n(el, 'y'), n(el, 'width'), n(el, 'height'));
        return p;
      case 'line': p.moveTo(n(el, 'x1'), n(el, 'y1')); p.lineTo(n(el, 'x2'), n(el, 'y2')); return p;
      case 'polyline': case 'polygon': {
        const pts = el.getAttribute('points').trim().split(/[\s,]+/).map(Number);
        for (let i = 0; i < pts.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, pts[i], pts[i + 1]);
        if (el.tagName === 'polygon') p.closePath();
        return p;
      }
      default: return null;
    }
  }).filter(Boolean));
}

function dibujarIcono(ctx, name, x, y, size, color, grosor = 2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  formas(name).forEach(p => ctx.stroke(p));
  ctx.restore();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

/** Dibuja la semana. Con dry=true solo calcula el alto total. */
function pintar(ctx, s, dry) {
  const d = fn => { if (!dry) fn(); };
  let y = 0;

  // Encabezado
  y = 70;
  d(() => {
    dibujarIcono(ctx, 'broom', PAD, y - 4, 58, C.mint, 2.2);
    ctx.fillStyle = C.text;
    ctx.font = `800 54px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.fillText('Cronograma de Limpieza', PAD + 76, y);
    ctx.fillStyle = C.mint;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText('GRUPO 5  •  ORGANIZACIÓN Y TURNOS', PAD + 78, y + 66);
  });
  y += 140;

  // Tarjeta
  const cardX = PAD - 16, cardW = W - (PAD - 16) * 2, cardY = y;
  const inX = cardX + 40, inW = cardW - 80;
  y += 40;

  // Semana + fecha
  ctx.font = `800 26px ${FONT}`;
  const tw = ctx.measureText(s.titulo || 'Semana').width;
  d(() => {
    ctx.fillStyle = alpha(C.blue, 0.2);
    rrect(ctx, inX, y, tw + 40, 46, 23); ctx.fill();
    ctx.fillStyle = C.blue;
    ctx.fillText(s.titulo || 'Semana', inX + 20, y + 10);
    dibujarIcono(ctx, 'calendar', inX + tw + 64, y + 9, 28, C.muted);
    ctx.fillStyle = C.muted;
    ctx.font = `500 28px ${FONT}`;
    ctx.fillText(fmtFecha(s.fecha), inX + tw + 104, y + 9);
  });
  y += 76;

  // Capitán
  d(() => {
    dibujarIcono(ctx, 'captain', inX, y + 2, 40, C.mint, 2.2);
    ctx.fillStyle = C.muted;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText('CAPITÁN', inX + 56, y - 4);
    ctx.fillStyle = C.text;
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(s.capitan || 'Sin capitán', inX + 56, y + 22);
  });
  y += 88;

  // Progreso
  const tareas = s.tareas || [];
  const total = tareas.reduce((n, t) => n + vols(t).length, 0);
  const llenos = tareas.reduce((n, t) => n + vols(t).filter(Boolean).length, 0);
  d(() => {
    ctx.fillStyle = '#26354f';
    rrect(ctx, inX, y, inW - 170, 12, 6); ctx.fill();
    if (llenos) {
      ctx.fillStyle = C.mint;
      rrect(ctx, inX, y, Math.max(12, (inW - 170) * (llenos / Math.max(1, total))), 12, 6); ctx.fill();
    }
    ctx.fillStyle = C.muted;
    ctx.font = `600 24px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${llenos}/${total} cupos`, inX + inW, y - 6);
    ctx.textAlign = 'left';
  });
  y += 44;

  // Tareas
  for (const t of tareas) {
    const a = AREAS[areaDe(t)];
    const v = vols(t);
    const n = v.filter(Boolean).length;
    const rowY = y;
    const chipX0 = inX + 112;
    const chipMax = inX + inW - 24;

    // Distribuir chips en líneas
    ctx.font = `600 26px ${FONT}`;
    const chips = v.map(nombre => ({ nombre, w: ctx.measureText(nombre || 'Cupo libre').width + (nombre ? 56 : 44) }));
    let cx = chipX0, cy = rowY + 70;
    chips.forEach(c => {
      if (cx + c.w > chipMax && cx > chipX0) { cx = chipX0; cy += 58; }
      c.x = cx; c.y = cy; cx += c.w + 12;
    });
    const rowH = cy - rowY + 48 + 22;

    d(() => {
      // Fondo de la fila
      ctx.fillStyle = C.soft;
      rrect(ctx, inX, rowY, inW, rowH, 18); ctx.fill();
      ctx.strokeStyle = alpha(a.color, 0.35); ctx.lineWidth = 2; ctx.stroke();

      // Insignia del área
      ctx.fillStyle = alpha(a.color, 0.16);
      rrect(ctx, inX + 22, rowY + 20, 60, 60, 16); ctx.fill();
      ctx.strokeStyle = alpha(a.color, 0.55); ctx.lineWidth = 2; ctx.stroke();
      dibujarIcono(ctx, a.icon, inX + 34, rowY + 32, 36, a.color, 2.1);
      if (a.sub) {
        ctx.fillStyle = C.card;
        ctx.beginPath(); ctx.arc(inX + 80, rowY + 78, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = a.color; ctx.lineWidth = 2; ctx.stroke();
        dibujarIcono(ctx, a.sub, inX + 70, rowY + 68, 20, a.color, 2.8);
      }

      // Nombre de la tarea + contador
      ctx.fillStyle = C.text;
      ctx.font = `700 32px ${FONT}`;
      ctx.fillText(t.nombre, inX + 112, rowY + 22);
      const col = n === 0 ? C.muted : n < v.length ? C.amber : C.mint;
      ctx.font = `800 24px ${FONT}`;
      const lbl = `${n}/${v.length}`;
      const lw = ctx.measureText(lbl).width + 30;
      ctx.fillStyle = alpha(col.length === 7 ? col : C.muted, 0.16);
      rrect(ctx, inX + inW - 22 - lw, rowY + 20, lw, 40, 20); ctx.fill();
      ctx.fillStyle = col;
      ctx.fillText(lbl, inX + inW - 22 - lw + 15, rowY + 28);

      // Chips
      chips.forEach(c => {
        rrect(ctx, c.x, c.y, c.w, 46, 23);
        if (c.nombre) {
          ctx.fillStyle = alpha(C.mint, 0.18); ctx.fill();
          ctx.strokeStyle = alpha(C.mint, 0.5); ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = C.mint;
          ctx.beginPath(); ctx.arc(c.x + 22, c.y + 23, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ccfbf1';
          ctx.font = `600 26px ${FONT}`;
          ctx.fillText(c.nombre, c.x + 38, c.y + 9);
        } else {
          ctx.setLineDash([7, 6]);
          ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = C.muted;
          ctx.font = `500 24px ${FONT}`;
          ctx.fillText('Cupo libre', c.x + 22, c.y + 11);
        }
      });
    });
    y += rowH + 16;
  }
  y += 24;
  const cardH = y - cardY;

  // Pie con el enlace
  const url = urlSemana(s);
  y += 34;
  d(() => {
    dibujarIcono(ctx, 'link', PAD, y, 30, C.mint);
    ctx.fillStyle = C.text;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText('Ver online:', PAD + 44, y);
    ctx.fillStyle = C.mint;
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText(url.replace(/^https?:\/\//, ''), PAD + 44, y + 36);
  });
  y += 100;

  // La tarjeta se dibuja al final por debajo (destination-over) para conocer su alto
  d(() => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = C.card;
    rrect(ctx, cardX, cardY, cardW, cardH, 28); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = alpha(C.mint, 0.6); ctx.lineWidth = 3;
    rrect(ctx, cardX, cardY, cardW, cardH, 28); ctx.stroke();
  });
  return y;
}

/** Genera la imagen PNG de una semana. */
export async function imagenSemana(s) {
  const medir = document.createElement('canvas').getContext('2d');
  const H = Math.ceil(pintar(medir, s, true));
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  pintar(ctx, s, false);

  // Fondo: foto atenuada arriba + degradado (debajo de todo lo dibujado)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  const g = ctx.createLinearGradient(0, 0, 0, 420);
  g.addColorStop(0, 'rgba(11,19,36,.55)');
  g.addColorStop(1, C.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const img = await cargarFondo();
  if (img) {
    const k = W / img.width;
    ctx.drawImage(img, 0, 0, W, img.height * k);
  }
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  return new Promise(res => cv.toBlob(res, 'image/png'));
}

/* ---------------- Diálogo de compartir ---------------- */
let dlg, actual = { blob: null, url: '', texto: '', semana: null, objUrl: '' };

function crearDialogo() {
  document.body.insertAdjacentHTML('beforeend', `
  <dialog id="dlg-share" class="share-dlg">
    <div class="dlg-head">
      <h2>${icon('share')} Compartir semana</h2>
      <button type="button" class="icon-btn" data-close title="Cerrar">${icon('x')}</button>
    </div>
    <div class="dlg-body">
      <div class="share-preview"><img id="share-img" alt="Vista previa de la imagen"><p class="meta" id="share-loading">Generando imagen…</p></div>
      <label class="field"><span>Mensaje (se envía junto a la imagen)</span><textarea id="share-text" rows="7"></textarea></label>
      <div class="link-row">
        <input id="share-url" readonly aria-label="Enlace">
        <button type="button" class="btn-secondary" id="share-copy-link">${icon('link')} Copiar enlace</button>
      </div>
    </div>
    <div class="dlg-foot share-actions">
      <button type="button" class="btn-secondary" id="share-download">${icon('download')} Descargar</button>
      <button type="button" class="btn-secondary" id="share-copy-img">${icon('image')} Copiar imagen</button>
      <button type="button" class="btn-secondary" id="share-wa">${icon('send')} WhatsApp</button>
      <button type="button" class="btn-primary" id="share-native">${icon('share')} Compartir…</button>
    </div>
  </dialog>`);
  dlg = document.getElementById('dlg-share');
  const $ = id => document.getElementById(id);

  dlg.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { if (actual.objUrl) URL.revokeObjectURL(actual.objUrl); });

  const texto = () => $('share-text').value;
  const archivo = () => new File([actual.blob], nombreArchivo(actual.semana), { type: 'image/png' });

  $('share-copy-link').addEventListener('click', () => copiarTexto(actual.url, 'Enlace copiado'));

  $('share-download').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = actual.objUrl;
    a.download = nombreArchivo(actual.semana);
    a.click();
  });

  $('share-copy-img').addEventListener('click', async () => {
    if (await copiarImagen()) toast('Imagen copiada: pégala en el chat con Ctrl+V');
    else toast('Tu navegador no permite copiar imágenes; usa Descargar', 'error');
  });

  // WhatsApp: abre el chat con el texto y deja la imagen en el portapapeles para pegarla
  $('share-wa').addEventListener('click', async () => {
    const ok = await copiarImagen();
    window.open(`https://wa.me/?text=${encodeURIComponent(texto())}`, '_blank', 'noopener');
    toast(ok ? 'Elige el chat y pega la imagen con Ctrl+V' : 'Elige el chat; adjunta la imagen descargada');
  });

  $('share-native').addEventListener('click', async () => {
    const datos = { title: `Cronograma ${actual.semana.titulo}`, text: texto(), files: [archivo()] };
    try {
      if (navigator.canShare?.(datos)) await navigator.share(datos);
      else await navigator.share({ title: datos.title, text: texto() });
    } catch (err) {
      if (err?.name !== 'AbortError') toast('No se pudo compartir; usa WhatsApp o Descargar', 'error');
    }
  });
}

const nombreArchivo = s => `cronograma-${String(s.titulo || 'semana').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${s.fecha}.png`;

async function copiarTexto(t, msg) {
  try { await navigator.clipboard.writeText(t); toast(msg); } catch { toast('No se pudo copiar', 'error'); }
}

async function copiarImagen() {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': actual.blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function abrirCompartir(s) {
  if (!dlg) crearDialogo();
  const $ = id => document.getElementById(id);
  actual = { ...actual, semana: s, url: urlSemana(s), texto: textoSemana(s) };
  $('share-text').value = actual.texto;
  $('share-url').value = actual.url;
  $('share-img').hidden = true;
  $('share-loading').hidden = false;
  dlg.querySelectorAll('.share-actions button').forEach(b => (b.disabled = true));
  // Compartir con archivos solo existe en celulares y algunos navegadores de escritorio
  $('share-native').hidden = !navigator.share;
  dlg.showModal();

  actual.blob = await imagenSemana(s);
  if (actual.objUrl) URL.revokeObjectURL(actual.objUrl);
  actual.objUrl = URL.createObjectURL(actual.blob);
  $('share-img').src = actual.objUrl;
  $('share-img').hidden = false;
  $('share-loading').hidden = true;
  dlg.querySelectorAll('.share-actions button').forEach(b => (b.disabled = false));
}

