// Popover panels: camera views and profiles.
import { VIEWS, FACE_NAME } from '../scene.js';

const spaced = (id) => id.split('').join(' ');

export function createViewPanel({ panel, button, grid, tabs, mirrorRow, hint, getSettings, onChange, drawThumbs }) {
  let editing = 'main';
  const thumbs = {}, canvases = {};
  for (const v of VIEWS) {
    const b = document.createElement('button');
    b.className = 'vbtn';
    b.title = v.id.split('').map((f) => FACE_NAME[f]).join(', ');
    b.innerHTML = `<canvas width="120" height="120"></canvas><span>${spaced(v.id)}</span>`;
    b.addEventListener('click', () => onChange(editing === 'main' ? { view: v.id } : { mirror: v.id }, `${editing} · ${spaced(v.id)}`));
    grid.appendChild(b);
    thumbs[v.id] = b;
    canvases[v.id] = b.querySelector('canvas');
  }
  tabs.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => { editing = b.dataset.edit; draw(); }));
  mirrorRow.querySelectorAll('[data-mirror]').forEach((b) => b.addEventListener('click', () =>
    onChange({ mirror: b.dataset.mirror }, b.dataset.mirror === 'off' ? 'mirror off' : 'mirror · opposite of main')));

  function draw() {
    const s = getSettings();
    const current = editing === 'main' ? s.view : s.mirror;
    for (const id in thumbs) thumbs[id].classList.toggle('on', id === current);
    tabs.querySelectorAll('[data-edit]').forEach((b) => b.classList.toggle('on', b.dataset.edit === editing));
    mirrorRow.querySelectorAll('[data-mirror]').forEach((b) => b.classList.toggle('on', b.dataset.mirror === s.mirror));
    mirrorRow.hidden = editing !== 'mirror';
    hint.textContent = editing === 'main' ? 'main view · words and notation follow this one' : 'mirror view · the small corner view';
  }
  return popover(panel, button, () => { draw(); drawThumbs(canvases); }, draw);
}

export function createProfilePanel({ panel, button, list, form, input, profiles, onChange }) {
  let confirming = null, renaming = null;

  function draw() {
    const active = profiles.active();
    button.textContent = active.name;
    list.innerHTML = '';
    for (const p of profiles.list()) {
      const row = document.createElement('div');
      row.className = 'prow' + (p.id === active.id ? ' on' : '');
      if (renaming === p.id) {
        row.innerHTML = `<input class="pname-input" maxlength="20" aria-label="new name"><button data-act="save">save</button>`;
        const inp = row.querySelector('input');
        inp.value = p.name;
        setTimeout(() => inp.focus(), 0);
        const save = () => { profiles.rename(p.id, inp.value); renaming = null; onChange(); draw(); };
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') save(); if (e.key === 'Escape') { renaming = null; draw(); } });
        row.querySelector('[data-act="save"]').addEventListener('click', save);
      } else if (confirming === p.id) {
        row.innerHTML = `<span class="pname">delete ${escapeHtml(p.name)} and all its stats?</span><button data-act="yes" class="danger">delete</button><button data-act="no">keep</button>`;
        row.querySelector('[data-act="yes"]').addEventListener('click', () => { profiles.remove(p.id); confirming = null; onChange(); draw(); });
        row.querySelector('[data-act="no"]').addEventListener('click', () => { confirming = null; draw(); });
      } else {
        const solves = p.records.filter((r) => r.mode === 'sprint').length;
        row.innerHTML = `<button class="pname" data-act="pick">${escapeHtml(p.name)} <span>${solves} solves</span></button>
          <button data-act="rename" aria-label="rename ${escapeHtml(p.name)}">rename</button>
          ${profiles.list().length > 1 ? `<button data-act="delete" aria-label="delete ${escapeHtml(p.name)}">delete</button>` : ''}`;
        row.querySelector('[data-act="pick"]').addEventListener('click', () => { profiles.select(p.id); onChange(); draw(); });
        row.querySelector('[data-act="rename"]').addEventListener('click', () => { renaming = p.id; draw(); });
        const del = row.querySelector('[data-act="delete"]');
        if (del) del.addEventListener('click', () => { confirming = p.id; draw(); });
      }
      list.appendChild(row);
    }
  }
  input.addEventListener('keydown', (e) => e.stopPropagation());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    profiles.create(input.value);
    input.value = '';
    onChange();
    draw();
  });
  draw();
  return popover(panel, button, draw, draw);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Shared open/close behavior for a popover tied to a nav button.
function popover(panel, button, onOpen, redraw) {
  const api = {
    get open() { return !panel.hidden; },
    toggle(open = panel.hidden) {
      panel.hidden = !open;
      button.classList.toggle('on', open);
      button.setAttribute('aria-expanded', String(open));
      if (open) onOpen();
    },
    contains: (el) => panel.contains(el) || el === button,
    redraw,
  };
  button.addEventListener('click', () => api.toggle());
  return api;
}
