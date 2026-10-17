'use strict';
(() => {
if (window.top !== window.self) { document.documentElement.classList.add('framed'); return; }

const $ = s => document.querySelector(s);
const main = $('#main'), ov = $('#overlay');
const APP_VERSION = 1;
const CATS = [['electronicos','Electrónicos','#6FB7E8'],['electrodomesticos','Electrodomésticos','#4AC1C9'],['muebles','Muebles','#B58A5A'],['cocina','Cocina','#E8894A'],['libros','Libros','#C9A24A'],['estudio','Estudio y oficina','#8C9CE8'],['herramientas','Herramientas','#9AA3AD'],['deporte','Deporte','#5FD3A0'],['decoracion','Decoración','#E86AA0'],['juegos','Juegos y hobbies','#B07BE8'],['cuidado','Cuidado personal','#E8A0C9'],['otros','Otros','#8E8E96']];
const CAT = Object.fromEntries(CATS.map(([k, n, c]) => [k, {n, c}]));
const STATES = [['nuevo','Nuevo'],['bueno','Buen estado'],['usado','Usado'],['danado','Dañado']];
const I = {plus:'<path d="M12 5v14M5 12h14"/>',back:'<path d="m15 6-6 6 6 6"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',down:'<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',up:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',chev:'<path d="m9 6 6 6-6 6"/>',pin:'<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',hand:'<path d="M7 11V6a2 2 0 0 1 4 0v4M11 10V4a2 2 0 0 1 4 0v6M15 9V6a2 2 0 0 1 4 0v7a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a2 2 0 0 1 3.4-2L7 13"/>',grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'};
const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => (b % 36).toString(36)).join('');
const NO_SPELL = 'autocomplete="off" autocorrect="off" spellcheck="false"';
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
const pad2 = n => String(n).padStart(2, '0');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d, 12); };
const daysTo = s => Math.round((parse(s) - parse(todayKey())) / 864e5);
const fmtD = s => parse(s).toLocaleDateString('es-SV', {day:'numeric', month:'long', year:'numeric'});
const money = n => n == null ? '' : '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
const num = v => { const n = parseFloat(String(v ?? '').replace(/[$\s,]/g, '')); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null; };

/* ---------- Almacenamiento ---------- */
const DB = { db:null,
  open(){ return new Promise(res => { try { const r = indexedDB.open('mis-cosas', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('items', {keyPath:'id'}); d.createObjectStore('meta', {keyPath:'k'}); };
    r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = () => res(false); r.onblocked = () => res(false); } catch(e){ res(false); } }); },
  req(s, m, fn){ return new Promise((res, rej) => { try { const t = this.db.transaction(s, m), q = fn(t.objectStore(s)); let out;
    if (q) q.onsuccess = () => { out = q.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); } catch(e){ rej(e); } }); },
  get(s,k){ return this.req(s,'readonly',o=>o.get(k)); }, all(s){ return this.req(s,'readonly',o=>o.getAll()).then(r=>r||[]); }, put(s,v){ return this.req(s,'readwrite',o=>o.put(v)); }, del(s,k){ return this.req(s,'readwrite',o=>o.delete(k)); }, clear(s){ return this.req(s,'readwrite',o=>o.clear()); } };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, ID_RE = /^[a-z0-9]{6,40}$/, IMG_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
const dt = v => DATE_RE.test(v || '') ? v : '';
function clean(i){ if (!i || !ID_RE.test(i.id)) return null; const name = str(i.name, 100).trim(); if (!name) return null;
  const loan = i.loan && str(i.loan.who, 60).trim() ? {who:str(i.loan.who, 60).trim(), since:dt(i.loan.since) || todayKey(), back:dt(i.loan.back)} : null;
  return {id:i.id, name, cat:CAT[i.cat] ? i.cat : 'otros', loc:str(i.loc, 80).trim(), brand:str(i.brand, 40), model:str(i.model, 60), serial:str(i.serial, 80), qty:Math.max(1, Math.min(9999, parseInt(i.qty, 10) || 1)), state:STATES.some(s => s[0] === i.state) ? i.state : 'bueno',
    bought:dt(i.bought), price:num(i.price), warranty:dt(i.warranty), note:str(i.note, 1000), photo:typeof i.photo === 'string' && IMG_RE.test(i.photo) ? i.photo : null, loan, created:+i.created || Date.now()}; }
let items = [], view = {name:'things'}, hist = [], tab = 'things', fCat = 'all', query = '', layout = 'grid', draft = null, installEvt = null;
async function saveItem(i){ await DB.put('items', i); const k = items.findIndex(x => x.id === i.id); k < 0 ? items.push(i) : items[k] = i; }
const places = () => { const m = new Map(); items.forEach(i => { const k = i.loc || 'Sin lugar'; m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a,b) => a[0] === 'Sin lugar' ? 1 : b[0] === 'Sin lugar' ? -1 : a[0].localeCompare(b[0], 'es')); };

/* ---------- Superposiciones y botón atrás ---------- */
let ovState = false, pendingBack = false, wantPush = false, pendingCb = null, sheetRes = null;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
function openOverlay(html, cls){ ov.className = cls; ov.innerHTML = html; ov.hidden = false; document.body.style.overflow = 'hidden'; if (!ovState){ ovState = true; if (pendingBack) wantPush = true; else history.pushState({ov:1}, ''); } }
function hideOverlay(){ ov.hidden = true; ov.innerHTML = ''; ov.className = ''; document.body.style.overflow = ''; }
function closeOverlay(cb){ hideOverlay(); if (ovState){ ovState = false; if (wantPush){ wantPush = false; if (cb) cb(); } else { pendingBack = true; pendingCb = cb || null; history.back(); } } else if (cb) cb(); }
function resolveSheet(v){ const r = sheetRes; sheetRes = null; closeOverlay(() => { if (r) r(v); }); }
function confirmBox(title, text, ok){ return new Promise(res => { sheetRes = v => res(!!v); openOverlay(`<div class="sheet" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(text)}</p><button class="btn btn-danger" data-act="sheetOk">${esc(ok)}</button><button class="btn btn-ghost" data-act="sheetNo">Cancelar</button></div>`, 'dim'); }); }
function go(v){ hist.push(Object.assign({}, view, {y:window.scrollY})); view = v; history.pushState({d:hist.length}, ''); render(); window.scrollTo(0,0); }
function back(){ if (ovState) return resolveSheet(null); if (hist.length) history.back(); }
window.addEventListener('popstate', () => {
  if (pendingBack){ pendingBack = false; if (wantPush){ wantPush = false; history.pushState({ov:1}, ''); } const cb = pendingCb; pendingCb = null; if (cb) cb(); return; }
  if (ovState){ ovState = false; hideOverlay(); const r = sheetRes; sheetRes = null; if (r) r(null); return; }
  if (!hist.length) return; const v = hist.pop(), y = v.y || 0; delete v.y; view = v; draft = null; render(); window.scrollTo(0, y); });

/* ---------- Vistas ---------- */
function topBar(){ const lent = items.filter(i => i.loan).length;
  return `<header class="bar"><h1 class="title">Mis cosas</h1><div class="bar-actions">${installEvt?'<button class="pill-btn" data-act="install">Instalar</button>':''}<button class="icon-btn" data-act="settings" aria-label="Ajustes">${ic('gear')}</button></div></header>
  <div class="seg" role="tablist">${[['things','Cosas'],['places','Lugares'],['lent','Prestadas']].map(([k, n]) => `<button role="tab" class="${tab===k?'on':''}" data-tab="${k}">${n}${k === 'lent' && lent ? ` <span class="count">${lent}</span>` : ''}</button>`).join('')}</div>`; }
const fab = () => `<button class="fab" data-act="add" aria-label="Agregar">${ic('plus',28)}</button>`;
const thumb = (i, cls = 'thumb') => `<span class="${cls}" data-c="${CAT[i.cat].c}">${i.photo ? `<img src="${i.photo}" alt="">` : `<span class="ph">${esc(i.name.charAt(0).toUpperCase())}</span>`}</span>`;
function itemRow(i){ const sub = [i.loc || 'Sin lugar', i.qty > 1 ? `${i.qty} unidades` : ''].filter(Boolean).join(', ');
  return `<button class="item" data-open="${esc(i.id)}">${thumb(i)}<span class="it-main"><span class="it-name">${esc(i.name)}</span><span class="it-meta">${ic('pin',12)} ${esc(sub)}</span></span>${i.loan ? `<span class="lent-tag">${ic('hand',13)} ${esc(i.loan.who)}</span>` : ''}</button>`; }
const tile = i => `<button class="tile" data-open="${esc(i.id)}" aria-label="${esc(i.name)}">${i.photo ? `<img src="${i.photo}" alt="">` : `<span class="ph" data-c="${CAT[i.cat].c}">${esc(i.name)}</span>`}${i.loan ? `<span class="tile-lent">${ic('hand',13)}</span>` : ''}<span class="tile-name">${esc(i.name)}</span></button>`;
function filtered(list = items){ const q = norm(query.trim());
  return list.filter(i => (fCat === 'all' || i.cat === fCat) && (!q || norm([i.name, CAT[i.cat].n, i.loc, i.brand, i.model, i.serial, i.note, i.loan && i.loan.who].join(' ')).includes(q))).sort((a,b) => a.name.localeCompare(b.name, 'es')); }
function listBlock(l){ return l.length ? (layout === 'grid' ? `<div class="grid">${l.map(tile).join('')}</div>` : `<div class="list">${l.map(itemRow).join('')}</div>`) : '<p class="empty-sm">No hay nada que coincida.</p>'; }
function viewThings(){ let h = topBar();
  if (!items.length) return h + `<div class="empty"><div class="empty-mark">${ic('camera',30)}</div><h2>Empieza tu inventario</h2><p>Registra tus cosas con una foto y dónde las guardas. Así sabrás qué tienes y dónde está.</p><button class="btn btn-primary" data-act="add">Agregar mi primera cosa</button></div>` + fab();
  const cats = CATS.filter(([k]) => items.some(i => i.cat === k)); if (fCat !== 'all' && !cats.some(c => c[0] === fCat)) fCat = 'all';
  h += `<div class="tools"><div class="search-box">${ic('search',18)}<input id="q" type="search" placeholder="¿Qué buscas? ¿Dónde está…?" value="${esc(query)}" aria-label="Buscar" ${NO_SPELL}></div><button class="icon-btn lay" data-act="toggleLayout" aria-label="${layout === 'grid' ? 'Ver como lista' : 'Ver como cuadrícula'}">${ic(layout === 'grid' ? 'list' : 'grid')}</button></div>`;
  h += `<div class="chips">${[['all','Todo'], ...cats].map(([k, n]) => `<button class="chip ${fCat === k ? 'on' : ''}" data-fcat="${k}">${n}</button>`).join('')}</div>`;
  return h + `<div id="listWrap">${resultsHTML()}</div>` + fab(); }
function resultsHTML(){ const l = filtered(), q = query.trim();
  if (q && l.length && l.length <= 6) return `<div class="found">${l.map(i => `<button class="found-row" data-open="${esc(i.id)}">${thumb(i)}<span><b>${esc(i.name)}</b><span class="where">${ic('pin',14)} ${esc(i.loc || 'Sin lugar anotado')}</span>${i.loan ? `<span class="where lent">${ic('hand',14)} Prestado a ${esc(i.loan.who)}</span>` : ''}</span></button>`).join('')}</div>`;
  return `<p class="toolbar">${plural(l.reduce((s,i) => s + i.qty, 0), 'cosa', 'cosas')}</p>` + listBlock(l); }
function viewPlaces(){ let h = topBar(); const p = places();
  if (!items.length) return h + `<p class="hint">Cuando agregues cosas, aquí verás todos los lugares donde las guardas.</p>` + fab();
  return h + `<p class="fine">Toca un lugar para ver qué hay ahí.</p><div class="box">${p.map(([n, c]) => `<button class="place" data-place="${esc(n)}"><span>${ic('pin',18)}<b>${esc(n)}</b></span><span class="muted">${c}</span>${ic('chev',16)}</button>`).join('')}</div>` + fab(); }
function viewPlace(){ const p = view.place, l = items.filter(i => (i.loc || 'Sin lugar') === p).sort((a,b) => a.name.localeCompare(b.name, 'es'));
  return `<header class="bar"><button class="icon-btn" data-act="back" aria-label="Volver">${ic('back')}</button><h1 class="title title-sm">${esc(p)}</h1><span class="spacer"></span></header><p class="toolbar">${plural(l.length, 'cosa', 'cosas')}</p>${listBlock(l)}${p !== 'Sin lugar' ? `<button class="btn btn-secondary mt" data-act="renamePlace">Cambiar el nombre de este lugar</button>` : ''}` + fab(); }
function viewLent(){ let h = topBar(); const l = items.filter(i => i.loan).sort((a,b) => a.loan.since.localeCompare(b.loan.since));
  if (!l.length) return h + `<div class="empty"><div class="empty-mark">${ic('hand',30)}</div><h2>No has prestado nada</h2><p>Cuando le prestes algo a alguien, ábrelo y toca «Lo presté». Aquí verás quién lo tiene y desde cuándo.</p></div>` + fab();
  return h + `<div class="list">${l.map(i => { const d = -daysTo(i.loan.since), late = i.loan.back && daysTo(i.loan.back) < 0;
    return `<button class="item" data-open="${esc(i.id)}">${thumb(i)}<span class="it-main"><span class="it-name">${esc(i.name)}</span><span class="it-meta">${esc(i.loan.who)}, ${d === 0 ? 'desde hoy' : d === 1 ? 'desde ayer' : `hace ${d} días`}</span></span>${i.loan.back ? `<span class="when ${late ? 'bad' : ''}">${late ? 'Debía volver' : 'Vuelve'} ${parse(i.loan.back).toLocaleDateString('es-SV', {day:'numeric', month:'short'}).replace(/\./g, '')}</span>` : ''}</button>`; }).join('')}</div>` + fab(); }
function viewDetail(){ const i = items.find(x => x.id === view.id); if (!i){ view = {name:tab}; return viewThings(); }
  let h = `<header class="bar"><button class="icon-btn" data-act="back" aria-label="Volver">${ic('back')}</button><h1 class="title title-sm">${esc(CAT[i.cat].n)}</h1><button class="pill-btn ghost" data-act="edit">Editar</button></header>`;
  h += i.photo ? `<img class="hero-photo" src="${i.photo}" alt="">` : '';
  h += `<h1 class="d-name">${esc(i.name)}</h1><button class="where-big" data-place="${esc(i.loc || 'Sin lugar')}">${ic('pin',20)}<span><small>Dónde está</small><b>${esc(i.loc || 'Sin lugar anotado')}</b></span></button>`;
  if (i.loan){ const late = i.loan.back && daysTo(i.loan.back) < 0; h += `<div class="loan${late ? ' late' : ''}">${ic('hand',20)}<span><small>Prestado a</small><b>${esc(i.loan.who)}</b><small>Desde el ${fmtD(i.loan.since)}${i.loan.back ? `. ${late ? 'Debía volver' : 'Vuelve'} el ${fmtD(i.loan.back)}` : ''}</small></span></div>`; }
  if (i.warranty){ const n = daysTo(i.warranty); h += `<div class="warr ${n < 0 ? 'off' : n <= 30 ? 'soon' : ''}">${ic('shield',20)}<span><small>Garantía</small><b>${n < 0 ? 'Ya venció' : n === 0 ? 'Vence hoy' : `Quedan ${plural(n, 'día', 'días')}`}</b><small>Hasta el ${fmtD(i.warranty)}</small></span></div>`; }
  const rows = [['Cantidad', i.qty > 1 ? String(i.qty) : ''], ['Marca', i.brand], ['Modelo', i.model], ['Número de serie', i.serial], ['Estado', STATES.find(s => s[0] === i.state)[1]], ['Comprado', i.bought ? fmtD(i.bought) : ''], ['Precio', i.price != null ? money(i.price) : '']].filter(r => r[1]);
  h += `<div class="box">${rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
  if (i.note) h += `<div class="box"><p class="fine">${esc(i.note)}</p></div>`;
  h += i.loan ? `<button class="btn btn-primary" data-act="returned">Ya me lo devolvieron</button>` : `<button class="btn btn-secondary" data-act="lend">${ic('hand',18)} Lo presté</button>`;
  return h + `<button class="btn btn-danger-text mt" data-act="delete">Eliminar</button>`; }
function photoSlot(){ return `<div class="photo-big" id="photoSlot">${draft.photo ? `<img src="${draft.photo}" alt=""><button type="button" class="photo-x" data-act="rmPhoto" aria-label="Quitar foto">${ic('x',16)}</button>` : `<label class="photo-pick big">${ic('camera',28)}<span>Tomar o elegir foto</span><input type="file" accept="image/*" id="f_photo" hidden></label>`}</div>`; }
function viewForm(){ const d = draft, edit = items.some(i => i.id === d.id), locs = places().map(p => p[0]).filter(p => p !== 'Sin lugar');
  return `<header class="bar"><button class="icon-btn" data-act="back" aria-label="Cancelar">${ic('x')}</button><h1 class="title title-sm">${edit ? 'Editar' : 'Agregar'}</h1><button class="btn-save" data-act="save">Guardar</button></header>
  ${photoSlot()}
  <label class="field"><span>Qué es</span><input id="f_name" value="${esc(d.name)}" maxlength="100" placeholder="Cargador de laptop, taladro, libro…" ${NO_SPELL}><em class="err" id="e_name"></em></label>
  <label class="field"><span>Dónde está</span><input id="f_loc" value="${esc(d.loc)}" maxlength="80" list="locs" placeholder="Cuarto, gaveta del escritorio" ${NO_SPELL}><datalist id="locs">${locs.map(l => `<option value="${esc(l)}">`).join('')}</datalist>${locs.length ? `<div class="loc-sugg">${locs.slice(0, 8).map(l => `<button type="button" class="chip" data-loc="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}</label>
  <div class="field"><span>Categoría</span><div class="pick">${CATS.map(([k, n, c]) => `<button type="button" class="pick-chip${d.cat === k ? ' on' : ''}" data-cat="${k}"><i data-c="${c}"></i>${n}</button>`).join('')}</div></div>
  <div class="two"><label class="field"><span>Cantidad</span><input id="f_qty" type="number" inputmode="numeric" min="1" value="${d.qty || 1}"></label><div class="field"><span>Estado</span><select id="f_state">${STATES.map(([k, n]) => `<option value="${k}" ${d.state === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
  <button type="button" class="more-btn" data-act="toggleMore">${d._more ? 'Menos detalles' : 'Más detalles: marca, modelo, serie, compra, garantía'}</button>
  <div id="more" ${d._more ? '' : 'hidden'}>
  <div class="two"><label class="field"><span>Marca</span><input id="f_brand" value="${esc(d.brand)}" maxlength="40" ${NO_SPELL}></label><label class="field"><span>Modelo</span><input id="f_model" value="${esc(d.model)}" maxlength="60" ${NO_SPELL}></label></div>
  <label class="field"><span>Número de serie</span><input id="f_serial" value="${esc(d.serial)}" maxlength="80" ${NO_SPELL}></label>
  <div class="two"><label class="field"><span>Fecha de compra</span><input id="f_bought" type="date" value="${d.bought || ''}"></label><label class="field"><span>Precio</span><div class="money"><input id="f_price" type="text" inputmode="decimal" value="${d.price != null ? d.price : ''}" placeholder="0.00" ${NO_SPELL}></div></label></div>
  <label class="field"><span>Garantía hasta</span><input id="f_warranty" type="date" value="${d.warranty || ''}"></label>
  </div>
  <label class="field"><span>Nota (opcional)</span><textarea id="f_note" rows="2" maxlength="1000" ${NO_SPELL}>${esc(d.note)}</textarea></label>
  ${edit ? '' : `<label class="check"><input type="checkbox" id="f_again"> Agregar otra en el mismo lugar</label>`}`; }
function viewSettings(){ const standalone = window.matchMedia('(display-mode: standalone)').matches, val = items.reduce((s,i) => s + (i.price || 0) * i.qty, 0), warr = items.filter(i => i.warranty && daysTo(i.warranty) >= 0 && daysTo(i.warranty) <= 60);
  return `<header class="bar"><button class="icon-btn" data-act="back" aria-label="Volver">${ic('back')}</button><h1 class="title title-sm">Ajustes</h1><span class="spacer"></span></header>
  ${items.length ? `<h2 class="section">Resumen</h2><div class="box"><div class="row"><span>Cosas registradas</span><b>${items.reduce((s,i) => s + i.qty, 0)}</b></div><div class="row"><span>Lugares</span><b>${places().length}</b></div>${val ? `<div class="row"><span>Valor de lo que tiene precio</span><b>${money(val)}</b></div>` : ''}${warr.length ? `<div class="row"><span>Garantías que vencen pronto</span><b>${warr.length}</b></div>` : ''}</div>` : ''}
  <h2 class="section">Instalación</h2><div class="box">${standalone?'<p class="fine">Ya estás usando la app instalada.</p>':installEvt?`<button class="set-row" data-act="install"><span>Instalar Mis cosas en el celular</span><span class="chev">${ic('down',18)}</span></button>`:'<p class="fine">Chrome todavía no ofrece instalarla. Abre la app en Chrome con internet, espera unos segundos y vuelve a entrar aquí.</p>'}</div>
  <h2 class="section">Copia de seguridad</h2><div class="box"><button class="set-row" data-act="exportBk"><span>Descargar copia<small>Tus cosas con sus fotos</small></span><span class="chev">${ic('down',18)}</span></button><label class="set-row"><span>Restaurar una copia<small>Agrega lo que tenga el archivo</small></span><span class="chev">${ic('up',18)}</span><input type="file" accept="application/json,.json" id="f_import" hidden></label></div>
  <h2 class="section">Privacidad</h2><div class="box"><p class="fine">Todo se guarda solo en este celular, incluidos los números de serie. La app no se conecta a internet.</p></div>
  <button class="btn btn-danger-text mt" data-act="wipe">Borrar todo</button><p class="ver">Versión ${APP_VERSION}</p>`; }
function paint(){ document.querySelectorAll('[data-c]').forEach(e => e.style.setProperty('--c', e.dataset.c)); }
function render(){ main.innerHTML = ({things:viewThings, places:viewPlaces, place:viewPlace, lent:viewLent, detail:viewDetail, form:viewForm, settings:viewSettings}[view.name] || viewThings)(); paint(); }

/* ---------- Acciones ---------- */
function compress(file){ return new Promise((res, rej) => { if (file.size > 40e6) return rej(); const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => { const m = 900, s = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .8)); };
  img.onerror = () => { URL.revokeObjectURL(url); rej(); }; img.src = url; }); }
const newDraft = (loc = '') => ({id:null, name:'', cat:fCat !== 'all' ? fCat : 'otros', loc, brand:'', model:'', serial:'', qty:1, state:'bueno', bought:'', price:null, warranty:'', note:'', photo:null, loan:null, _more:false});
function keepForm(){ if (!draft || view.name !== 'form') return; const v = id => $(id) ? $(id).value : '';
  Object.assign(draft, {name:v('#f_name'), loc:v('#f_loc'), qty:v('#f_qty'), state:v('#f_state'), brand:v('#f_brand'), model:v('#f_model'), serial:v('#f_serial'), bought:v('#f_bought'), price:num(v('#f_price')), warranty:v('#f_warranty'), note:v('#f_note')}); }
function lendBox(){ return new Promise(res => { sheetRes = res; openOverlay(`<div class="sheet" role="dialog" aria-modal="true"><h2>¿A quién se lo prestaste?</h2><label class="field"><input id="l_who" maxlength="60" placeholder="Nombre" ${NO_SPELL}><em class="err" id="l_err"></em></label><label class="field"><span>¿Cuándo debe volver? (opcional)</span><input id="l_back" type="date" min="${todayKey()}"></label><button class="btn btn-primary" data-act="lendOk">Guardar</button><button class="btn btn-ghost" data-act="sheetNo">Cancelar</button></div>`, 'dim'); setTimeout(() => { const i = $('#l_who'); if (i) i.focus(); }, 80); }); }
function textBox(title, value){ return new Promise(res => { sheetRes = res; openOverlay(`<div class="sheet" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><label class="field"><input id="t_val" value="${esc(value)}" maxlength="80" ${NO_SPELL}></label><button class="btn btn-primary" data-act="textOk">Guardar</button><button class="btn btn-ghost" data-act="sheetNo">Cancelar</button></div>`, 'dim'); setTimeout(() => { const i = $('#t_val'); if (i){ i.focus(); i.select(); } }, 80); }); }
const A = {
  add(){ draft = newDraft(view.name === 'place' && view.place !== 'Sin lugar' ? view.place : ''); go({name:'form'}); },
  edit(){ const i = items.find(x => x.id === view.id); if (!i) return; draft = Object.assign(JSON.parse(JSON.stringify(i)), {_more:!!(i.brand || i.model || i.serial || i.bought || i.price != null || i.warranty)}); go({name:'form'}); },
  back(){ back(); },
  settings(){ go({name:'settings'}); },
  toggleLayout(){ layout = layout === 'grid' ? 'list' : 'grid'; DB.put('meta', {k:'layout', v:layout}).catch(() => {}); render(); },
  toggleMore(){ keepForm(); draft._more = !draft._more; render(); },
  rmPhoto(){ draft.photo = null; $('#photoSlot').outerHTML = photoSlot(); },
  async save(){ keepForm(); if (!draft.name.trim()){ $('#e_name').textContent = 'Escribe qué es.'; $('#f_name').focus(); return; }
    const ex = items.find(i => i.id === draft.id), rec = clean(Object.assign({}, ex || {}, draft, {id:ex ? ex.id : uid(), created:ex ? ex.created : Date.now()}));
    await saveItem(rec); const again = $('#f_again') && $('#f_again').checked;
    if (again){ draft = Object.assign(newDraft(rec.loc), {cat:rec.cat}); render(); window.scrollTo(0,0); toast('Guardado. Agrega la siguiente.'); setTimeout(() => { const n = $('#f_name'); if (n) n.focus(); }, 60); return; }
    draft = null; back(); toast('Guardado'); },
  async lend(){ const i = items.find(x => x.id === view.id); if (!i) return; const r = await lendBox(); if (!r) return; i.loan = {who:r.who, since:todayKey(), back:r.back}; await saveItem(i); render(); toast(`Prestado a ${r.who}`); },
  lendOk(){ const who = $('#l_who').value.trim(); if (!who){ $('#l_err').textContent = 'Escribe el nombre.'; return; } resolveSheet({who, back:dt($('#l_back').value)}); },
  async returned(){ const i = items.find(x => x.id === view.id); if (!i) return; i.loan = null; await saveItem(i); render(); toast('¡Qué bien que volvió!'); },
  async renamePlace(){ const old = view.place, v = await textBox('Nuevo nombre del lugar', old); const nv = (v || '').trim(); if (!nv || nv === old) return;
    for (const i of items.filter(x => x.loc === old)){ i.loc = nv.slice(0, 80); await saveItem(i); } view.place = nv; render(); toast('Lugar actualizado'); },
  textOk(){ resolveSheet($('#t_val').value); },
  async delete(){ const i = items.find(x => x.id === view.id); if (!i) return; if (!await confirmBox(`¿Eliminar ${i.name}?`, 'Se borra con su foto.', 'Eliminar')) return; await DB.del('items', i.id); items = items.filter(x => x.id !== i.id); back(); toast('Eliminado'); },
  sheetOk(){ resolveSheet(true); }, sheetNo(){ resolveSheet(null); },
  async install(){ if (!installEvt) return; const e = installEvt; installEvt = null; try { await e.prompt(); await e.userChoice; } catch(err){} render(); },
  exportBk(){ const url = URL.createObjectURL(new Blob([JSON.stringify({app:'mis-cosas', v:1, created:new Date().toISOString(), items})], {type:'application/json'})), a = document.createElement('a'); a.href = url; a.download = `mis-cosas-copia-${todayKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); toast('Copia descargada'); },
  async wipe(){ if (!await confirmBox('¿Borrar todo?', 'Se eliminan todas tus cosas y fotos de este celular.', 'Borrar todo')) return; await DB.clear('items'); items = []; toast('Todo borrado'); back(); }
};
async function importBk(file){ let d; try { d = JSON.parse(await file.text()); } catch(e){ return toast('Ese archivo no es una copia válida.'); }
  if (!d || d.app !== 'mis-cosas' || !Array.isArray(d.items)) return toast('Ese archivo no es una copia válida.');
  let n = 0; for (const r of d.items){ const i = clean(r); if (!i) continue; await saveItem(i); n++; } render(); toast(`${plural(n, 'cosa restaurada', 'cosas restauradas')}`); }

/* ---------- Eventos ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act],[data-open],[data-tab],[data-fcat],[data-cat],[data-place],[data-loc]'); if (!t) return; const ds = t.dataset;
  if (ds.tab){ tab = ds.tab; view = {name:tab}; render(); window.scrollTo(0,0); return; }
  if (ds.open) return go({name:'detail', id:ds.open});
  if (ds.place !== undefined) return go({name:'place', place:ds.place});
  if (ds.fcat){ fCat = ds.fcat; render(); return; }
  if (ds.cat){ draft.cat = ds.cat; document.querySelectorAll('[data-cat]').forEach(b => b.classList.toggle('on', b === t)); return; }
  if (ds.loc){ $('#f_loc').value = ds.loc; document.querySelectorAll('[data-loc]').forEach(b => b.classList.toggle('on', b === t)); return; }
  if (ds.act && A[ds.act]) A[ds.act](t);
});
document.addEventListener('input', e => { const t = e.target; if (t.id === 'q'){ query = t.value; const w = $('#listWrap'); if (w){ w.innerHTML = resultsHTML(); paint(); } } if (t.id === 'f_name') $('#e_name').textContent = ''; if (t.id === 'l_who') $('#l_err').textContent = ''; });
document.addEventListener('change', async e => { const t = e.target;
  if (t.id === 'f_photo'){ const f = t.files && t.files[0]; if (!f || !draft) return; try { draft.photo = await compress(f); $('#photoSlot').outerHTML = photoSlot(); } catch(err){ toast('No se pudo cargar la foto.'); } }
  if (t.id === 'f_import'){ const f = t.files && t.files[0]; t.value = ''; if (f) importBk(f); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ovState) resolveSheet(null); });
document.addEventListener('contextmenu', e => { if (e.target.closest('img')) e.preventDefault(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (['things','settings'].includes(view.name)) render(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast('Mis cosas instalada'); render(); });

/* ---------- Inicio ---------- */
(async () => {
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js', {scope:'./'}).catch(() => {});
  if (!window.indexedDB || !await DB.open()){ main.innerHTML = '<div class="empty"><h2>No se puede guardar</h2><p>Este navegador no permite guardar datos. Si estás en modo incógnito, abre la app en una pestaña normal.</p></div>'; return; }
  try { items = (await DB.all('items')).map(clean).filter(Boolean); } catch(e){ items = []; }
  try { const l = await DB.get('meta', 'layout'); if (l && ['grid','list'].includes(l.v)) layout = l.v; } catch(e){}
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  history.replaceState({root:1}, ''); render();
})();
})();
