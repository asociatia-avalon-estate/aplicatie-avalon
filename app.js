// Aplicația Asociației de Proprietari Avalon Estate – v0.1
// Date și login: Supabase. Cheia de mai jos e cheia PUBLICĂ (sigură în browser);
// accesul la date e controlat în baza de date prin Row Level Security.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://jeourriidsohbptrppac.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LcS1AfZDqXco4wfHCsgMMQ_80AhjovO';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const root = document.getElementById('root');
const S = { session: null, me: null, units: [], route: 'acasa', param: null, loginEmail: '', loginStep: 'parola', mustSetPassword: false, busy: false, cache: {} };

/* ---------- utilitare ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => { d = new Date(d); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
const fmtTime = d => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDT = d => d ? `${fmtDate(d)} ${fmtTime(d)}` : '–';
const toLocalInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayStart = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const isAdmin = () => S.me?.access === 'admin';
const isGuard = () => S.me?.access === 'paza' || isAdmin();
const fullName = p => `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || p?.email || '–';
const plateNorm = p => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}
function errMsg(e) {
  const m = e?.message || String(e);
  if (e?.code === '23P01' || /fara_suprapunere_cu_pauza/.test(m)) return 'Locul e ocupat în intervalul ales (între două rezervări trebuie să rămână o pauză de 1 oră). Alege alt loc sau altă oră.';
  if (/max_7_zile/.test(m)) return 'O rezervare poate dura cel mult 7 zile.';
  if (/interval_valid/.test(m)) return 'Ora de sfârșit trebuie să fie după ora de început.';
  if (/Token has expired|invalid/i.test(m) && S.loginStep === 'code') return 'Codul nu e corect sau a expirat. Cere un cod nou.';
  if (/Invalid login credentials/i.test(m)) return 'Email sau parolă greșită. Dacă intri prima dată sau ai uitat parola, apasă „Prima dată aici / Am uitat parola”.';
  if (/Email not confirmed/i.test(m)) return 'Contul nu e încă activat. Apasă „Prima dată aici” și intră cu codul primit pe email.';
  if (/rate limit|security purposes/i.test(m)) return 'Ai cerut prea multe coduri într-un timp scurt. Încearcă din nou peste un minut.';
  return m;
}

const ICON = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  ticket: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4zM10 5v14',
  parking: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 17V7h4a3 3 0 0 1 0 6H9',
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6',
  contacts: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  mega: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12',
  gate: 'M4 21V8M4 11h17M8 11l2-3M13 11l2-3M18 11l2-3M2 21h4',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  menu: 'M4 6h16M4 12h16M4 18h16',
  car: 'M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 13h18M7 16h.01M17 16h.01'
};
const ic = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
const logo = (s = 44) => `<img src="logo.png" alt="" style="height:${s}px;width:auto;display:block">`;
const brand = (s = 44) => `<a class="brand" href="#acasa">${logo(s)}<span><span class="t1">ASOCIAȚIA DE PROPRIETARI</span><br><span class="t2">AVALON ESTATE</span></span></a>`;
const plateHTML = p => `<span class="plate" aria-label="Număr ${esc(p)}"><span class="eu">RO</span><span class="num">${esc(p)}</span></span>`;

const TICKET_ST = { nou: ['Nou', 'gold'], in_lucru: ['În lucru', 'warn'], in_asteptare: ['În așteptare', 'line'], rezolvat: ['Rezolvat', 'ok'], inchis: ['Închis', 'line'], respins: ['Respins', 'bad'] };
const stChip = s => { const [l, c] = TICKET_ST[s] || [s, 'line']; return `<span class="chip ${c}">${l}</span>`; };
const PERSON_ST = { neinvitat: 'Neinvitat încă', invitat: 'Invitat', inregistrat: 'Înregistrat', in_asteptare: 'În așteptare', dezactivat: 'Dezactivat', fost: 'Fost' };
const REL = { proprietar: 'Proprietar', chirias: 'Chiriaș', membru_familie: 'Membru de familie', fara_apartament: '–' };

/* ---------- navigare ---------- */
function menu() {
  const m = [['acasa', 'Acasă', 'home'], ['parcare', 'Parcare vizitatori', 'parking'], ['istoric', 'Rezervările mele', 'doc'], ['vehicule', 'Vehiculele mele', 'car'], ['tichete', 'Tichete', 'ticket'], ['anunturi', 'Anunțuri', 'mega'], ['documente', 'Documente', 'doc'], ['contacte', 'Contacte', 'contacts']];
  if (isGuard()) m.splice(4, 0, ['paza', 'Pază', 'gate']);
  if (isAdmin()) m.push(['utilizatori', 'Utilizatori', 'users']);
  m.push(['profil', 'Profilul meu', 'user']);
  return m;
}
function parseHash() {
  const h = location.hash.replace(/^#/, '') || 'acasa';
  const [r, p] = h.split('/');
  S.route = r; S.param = p ? decodeURIComponent(p) : null;
}
window.addEventListener('hashchange', () => { parseHash(); render(); });

/* ---------- login ----------
   Pași: 'parola' (email + parolă, implicit) → sau 'email' (cer cod) → 'code' (introduc codul)
   După intrarea cu cod, dacă utilizatorul nu are parolă (sau a cerut resetare), apare ecranul „Creează parola”. */
function loginView() {
  const step = S.loginStep;
  const head = {
    parola: ['Intră în aplicație', 'Intră cu adresa de email și parola ta.'],
    email: ['Prima intrare sau parolă uitată', 'Scrie adresa de email cu care ești înregistrat la asociație. Îți trimitem un cod de 6 cifre, apoi îți alegi parola.'],
    code: ['Verifică emailul', `Am trimis un cod de 6 cifre la <b>${esc(S.loginEmail)}</b>. Verifică și folderul Spam.`]
  }[step];
  let form;
  if (step === 'parola') form = `
    <label class="f">Email<input id="lg-email" type="email" autocomplete="username" required value="${esc(S.loginEmail)}"></label>
    <label class="f">Parola<input id="lg-pass" type="password" autocomplete="current-password" required></label>
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Se verifică…' : 'Intră'}</button>
    <button class="btn quiet" type="button" data-act="login-code">Prima dată aici / Am uitat parola</button>`;
  else if (step === 'email') form = `
    <label class="f">Email<input id="lg-email" type="email" autocomplete="email" required value="${esc(S.loginEmail)}"></label>
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Se trimite…' : 'Trimite codul'}</button>
    <button class="btn quiet" type="button" data-act="login-pass">Am deja parolă</button>`;
  else form = `
    <label class="f">Codul primit<input id="lg-code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Se verifică…' : 'Continuă'}</button>
    <button class="btn quiet" type="button" data-act="login-code">Altă adresă / cod nou</button>`;
  return `<div class="login"><div class="card">
    ${brand(52)}
    <div><h2>${head[0]}</h2><p class="muted small">${head[1]}</p></div>
    <form id="login-form" class="stack">${form}<p class="err" id="lg-err" role="alert"></p></form>
    <p class="muted small">Probleme la intrare? Scrie-ne la aplicatie.avalonestate@gmail.com.</p>
  </div></div>`;
}
async function onLoginSubmit(e) {
  e.preventDefault();
  S.busy = true;
  try {
    if (S.loginStep === 'parola') {
      S.loginEmail = document.getElementById('lg-email').value.trim().toLowerCase();
      const password = document.getElementById('lg-pass').value;
      render();
      const { error } = await sb.auth.signInWithPassword({ email: S.loginEmail, password });
      if (error) throw error;
    } else if (S.loginStep === 'email') {
      S.loginEmail = document.getElementById('lg-email').value.trim().toLowerCase();
      render();
      const { error } = await sb.auth.signInWithOtp({ email: S.loginEmail, options: { shouldCreateUser: true } });
      if (error) throw error;
      S.loginStep = 'code';
    } else {
      const token = document.getElementById('lg-code').value.trim();
      render();
      const { error } = await sb.auth.verifyOtp({ email: S.loginEmail, token, type: 'email' });
      if (error) throw error;
      S.mustSetPassword = true;   // după intrarea cu cod își (re)face parola
      S.loginStep = 'parola';
    }
    S.busy = false; render();
  } catch (err) {
    S.busy = false; render();
    const el = document.getElementById('lg-err'); if (el) el.textContent = errMsg(err);
  }
}
const needsPassword = () => S.mustSetPassword || !S.session?.user?.user_metadata?.has_password;
function setPasswordView() {
  return `<div class="login"><div class="card">
    ${brand(52)}
    <div><h2>Creează-ți parola</h2><p class="muted small">Data viitoare intri direct cu emailul <b>${esc(S.session.user.email)}</b> și parola, fără cod.</p></div>
    <form id="pw-form" class="stack">
      <label class="f">Parola nouă (minim 8 caractere)<input id="pw-1" type="password" autocomplete="new-password" minlength="8" required></label>
      <label class="f">Repetă parola<input id="pw-2" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Se salvează…' : 'Salvează parola și intră'}</button>
      <p class="err" id="pw-err" role="alert"></p>
    </form>
  </div></div>`;
}
async function onSetPassword(e) {
  e.preventDefault();
  const p1 = document.getElementById('pw-1').value, p2 = document.getElementById('pw-2').value, err = document.getElementById('pw-err');
  if (p1.length < 8) { err.textContent = 'Parola trebuie să aibă cel puțin 8 caractere.'; return; }
  if (p1 !== p2) { err.textContent = 'Cele două parole nu coincid.'; return; }
  S.busy = true;
  const { data, error } = await sb.auth.updateUser({ password: p1, data: { has_password: true } });
  S.busy = false;
  if (error) { err.textContent = /same|different/i.test(error.message) ? 'Alege o parolă diferită de cea veche.' : /weak|short|characters/i.test(error.message) ? 'Parola e prea simplă. Alege una mai lungă.' : errMsg(error); return; }
  if (data?.user) S.session.user = data.user;
  S.mustSetPassword = false;
  toast('Parola a fost salvată.'); render();
}

/* ---------- încărcare profil ---------- */
async function loadMe() {
  const uid = S.session?.user?.id;
  const { data, error } = await sb.from('people').select('*').eq('auth_user_id', uid).maybeSingle();
  if (error) throw error;
  S.me = data;
  if (!data) return;
  const { data: um } = await sb.from('unit_members').select('unit_code, relation, units(code, building, kind)').eq('person_id', data.id);
  S.units = (um || []).map(x => ({ code: x.unit_code, relation: x.relation, building: x.units?.building, kind: x.units?.kind }));
}

/* ---------- schelet ---------- */
function shell(inner, wide = false) {
  const m = menu();
  const nav = m.map(([r, l, i]) => `<a href="#${r}" ${S.route === r ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`).join('');
  const tabs = [['acasa', 'Acasă', 'home'], ['parcare', 'Parcare', 'parking'], ['tichete', 'Tichete', 'ticket'], ['anunturi', 'Anunțuri', 'mega']];
  const tabHTML = tabs.map(([r, l, i]) => `<a href="#${r}" ${S.route === r ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`).join('') + `<button type="button" data-act="more">${ic('menu')}<span>Mai mult</span></button>`;
  return `<div class="app">
    <aside class="side">${brand(46)}<nav class="nav" aria-label="Meniu">${nav}</nav>
      <div class="role"><span class="small">${esc(fullName(S.me))}</span><span class="small muted">${esc(S.units.map(u => u.code).join(', ') || '')}</span><button class="btn quiet sm" data-act="logout">${ic('out')} Ieșire</button></div>
    </aside>
    <div class="main">
      <header class="top">${brand(38)}<span class="demo-pill">Versiune de test</span></header>
      <main class="content ${wide ? 'wide' : ''}">${inner}</main>
    </div>
    <nav class="tabbar" aria-label="Meniu rapid">${tabHTML}</nav>
  </div>`;
}
const loading = () => `<div class="loading">Se încarcă…</div>`;

/* ---------- pagini ---------- */
async function pageHome() {
  const now = new Date().toISOString();
  const [res, tic, ann] = await Promise.all([
    sb.from('reservations').select('*').eq('status', 'activa').gt('ends_at', now).order('starts_at').limit(5),
    sb.from('tickets').select('id, code, title, status, updated_at').in('status', ['nou', 'in_lucru', 'in_asteptare']).order('updated_at', { ascending: false }).limit(isAdmin() ? 8 : 5),
    sb.from('announcements').select('id, title_ro, published_at').order('published_at', { ascending: false }).limit(3)
  ]);
  const myUnits = S.units.length ? S.units.map(u => `<span class="chip line">${esc(u.code)} · ${REL[u.relation] || ''}</span>`).join(' ') : '<span class="muted">Nu ai încă nicio unitate legată. Scrie administrației.</span>';
  const rList = (res.data || []).map(r => `<div class="item"><span class="chip gold">${esc(r.spot_code)}</span><div class="grow"><div>${plateHTML(r.plate)} ${r.guest_name ? esc(r.guest_name) : ''}</div><div class="small muted">${fmtDT(r.starts_at)} → ${fmtDT(r.ends_at)}</div></div></div>`).join('') || '<p class="muted">Nicio rezervare activă.</p>';
  const tList = (tic.data || []).map(t => `<a class="item" href="#tichet/${t.id}" style="color:inherit;text-decoration:none"><div class="grow"><div class="title">${esc(t.title)}</div><div class="small muted">${esc(t.code || '')} · ${fmtDate(t.updated_at)}</div></div>${stChip(t.status)}</a>`).join('') || '<p class="muted">Niciun tichet deschis.</p>';
  const aList = (ann.data || []).map(a => `<a class="item" href="#anunturi" style="color:inherit;text-decoration:none"><div class="grow">${esc(a.title_ro)}</div><span class="small muted">${fmtDate(a.published_at)}</span></a>`).join('') || '<p class="muted">Niciun anunț încă.</p>';
  return `<div class="head"><div><h1>Bună, ${esc(S.me.first_name || '')}!</h1><p class="muted">${myUnits}</p></div></div>
  <div class="grid g2">
    <section class="card stack"><div class="row between"><h3>Rezervări parcare</h3><a class="btn sm" href="#parcare">${ic('plus')} Rezervă</a></div><div class="list">${rList}</div></section>
    <section class="card stack"><div class="row between"><h3>${isAdmin() ? 'Tichete deschise' : 'Tichetele mele deschise'}</h3><a class="btn sm" href="#tichet-nou">${ic('plus')} Tichet nou</a></div><div class="list">${tList}</div></section>
    <section class="card stack"><h3>Anunțuri recente</h3><div class="list">${aList}</div></section>
  </div>`;
}

/* parcare – hartă, rezervare în fereastră, istoric, vehicule
   Locurile de pe hartă sunt ORIENTATIVE: după rezervare vizitatorul poate parca pe orice loc liber de vizitatori. */
const SPOTS_N = 15, LEFT_N = 7, ALL_SPOTS = Array.from({ length: SPOTS_N }, (_, i) => 'V' + (i + 1));
const GAP_MS = 30 * 60000; // 30 min înainte + 30 min după = pauză de 1 oră între rezervări pe același loc
const ORIENT = 'Locul ales e orientativ: după rezervare, vizitatorul poate parca pe orice loc liber marcat pentru vizitatori.';
const hhmm = d => fmtTime(d);
const roundUp30 = d => { const x = new Date(d); x.setSeconds(0, 0); const m = x.getMinutes(); if (m === 0) return x; x.setMinutes(m <= 30 ? 30 : 60); return x; };
const dateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lei = n => `${(Math.round(n * 100) / 100).toFixed(2).replace('.', ',')} lei`;
const hTxt = h => { const x = Math.round(h * 100) / 100; return `${String(x).replace('.', ',')} ${x === 1 ? 'oră' : 'ore'}`; };
let TARIF = null;
async function tarif() { if (TARIF) return TARIF; const { data } = await sb.from('settings').select('value').eq('key', 'tarif').maybeSingle(); TARIF = data?.value || { lei_pe_ora: 5 }; return TARIF; }
const clashes = (o, s, e) => new Date(o.starts_at).getTime() - GAP_MS < e.getTime() + GAP_MS && s.getTime() - GAP_MS < new Date(o.ends_at).getTime() + GAP_MS;

function carSVG(x, y, w, h) {
  const cw = Math.min(w * .62, 24), ch = Math.min(h * .84, 42), l = x + (w - cw) / 2, t = y + (h - ch) / 2, r = l + cw, b = t + ch, cx = x + w / 2, f = t + ch * .3, k = b - ch * .2;
  return `<g class="car"><rect x="${l}" y="${t}" width="${cw}" height="${ch}" rx="${cw * .38}"/><path d="M${l + 2} ${f + 2} Q${cx} ${f - 5} ${r - 2} ${f + 2} M${l + 2.5} ${k} Q${cx} ${k + 4} ${r - 2.5} ${k} M${l + 2} ${f + 2} V${k} M${r - 2} ${f + 2} V${k} M${l} ${f} h-2.5 M${r} ${f} h2.5"/></g>`;
}
function mapSVG({ busy = new Set(), sel = null, interactive = true } = {}) {
  const W = 360, AX = 298, AW = 58, CX = AX + AW / 2, x0 = 8, cw = AX - x0 - 8, H = 660, sw = 32, sg = 4, sh = 50, TOPY = 88;
  let g = '';
  const RX = 155, RY = 70, JY = 200;
  g += `<rect x="0" y="0" width="${W}" height="22" class="m-street"/><text x="${x0}" y="16" class="m-cap">Stradă</text>`;
  g += `<path class="m-roadline" style="stroke-width:${AW}px" d="M${RX} 0 V${RY} L${CX} ${JY} V${H}"/>`;
  g += `<path class="m-lane" d="M${RX} 46 V${RY} L${CX} ${JY} V${H - 6}"/>`;
  g += `<line x1="${RX - 27}" y1="32" x2="${RX + 27}" y2="32" class="m-bar"/><circle cx="${RX - 27}" cy="32" r="3" class="m-post"/><circle cx="${RX + 27}" cy="32" r="3" class="m-post"/><text x="${RX}" y="16" class="m-cap m-cap-on" text-anchor="middle">Acces complex</text>`;
  g += `<path class="m-dir m-dir-sm" d="M${RX - 14} 46 V60 M${RX - 18} 56 L${RX - 14} 60 L${RX - 10} 56"/><path class="m-dir m-dir-sm" d="M${RX + 14} 60 V46 M${RX + 10} 50 L${RX + 14} 46 L${RX + 18} 50"/>`;
  g += `<rect x="8" y="30" width="86" height="44" rx="8" class="m-gate"/><text x="51" y="59" class="m-bl" text-anchor="middle" style="font-size:20px">Pază</text>`;
  g += `<rect x="200" y="4" width="${W - 204}" height="62" rx="8" class="m-gate"/><text x="${(200 + W - 4) / 2}" y="43" class="m-bl" text-anchor="middle">Gatehouse</text>`;
  const arr = (x, y, dir) => `<path class="m-dir m-dir-sm" d="M${x} ${y - 7} V${y + 7} M${x - 4} ${dir > 0 ? y + 3 : y - 3} L${x} ${dir > 0 ? y + 7 : y - 7} L${x + 4} ${dir > 0 ? y + 3 : y - 3}"/>`;
  [240, 330, 520, 625].forEach(y => { g += arr(AX + AW / 4, y, 1) + arr(AX + 3 * AW / 4, y, -1); });
  g += `<text class="m-lbl" transform="translate(${AX + 10} 415) rotate(90)" text-anchor="middle">Aleea principală</text>`;
  g += `<g transform="translate(0 ${TOPY - 40})">`;
  const offRow = (y, n, pre, label) => { let r = `<text x="${x0}" y="${y - 6}" class="m-cap">${label}</text>`; for (let i = 0; i < n; i++) { const x = x0 + i * (sw + sg), lbl = `${pre}${i + 1}, nu se poate rezerva`; r += `<g class="sp off" role="img" aria-label="${lbl}"><title>${lbl}</title><rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="6"/><text x="${x + sw / 2}" y="${y + sh / 2}" dominant-baseline="central" text-anchor="middle" transform="rotate(90 ${x + sw / 2} ${y + sh / 2})">${pre}${i + 1}</text></g>`; } return r; };
  g += offRow(94, 4, 'AD', 'Administrație · nu se rezervă');
  g += `<g transform="translate(0 38)">`;
  g += offRow(170, 6, 'PK', 'PK · nu se rezervă momentan');
  g += `<rect x="${x0}" y="232" width="${cw}" height="72" rx="10" class="m-bld"/><text x="${x0 + cw / 2}" y="276" class="m-bl" text-anchor="middle">Bloc A1a</text>`;
  g += `<text x="${x0}" y="326" class="m-cap m-cap-on">${interactive ? 'Vizitatori · atinge un loc ca să rezervi' : 'Vizitatori'}</text>`;
  const ay = sh + 336, ah = 34;
  g += `<rect x="${x0}" y="${ay}" width="${AX - x0}" height="${ah}" class="m-aisle"/><line x1="${x0 + 6}" y1="${ay + ah / 2}" x2="${AX - 6}" y2="${ay + ah / 2}" class="m-dash"/>`;
  ALL_SPOTS.forEach((s, i) => {
    const top = i < LEFT_N, col = top ? i : i - LEFT_N, x = x0 + col * (sw + sg), y = top ? ay - sh - 2 : ay + ah + 2;
    const st = busy.has(s) ? 'busy' : sel === s ? 'sel' : 'free', lbl = `Locul ${s}, ${st === 'busy' ? 'ocupat acum' : st === 'sel' ? 'ales' : 'liber'}`;
    const act = interactive ? `role="button" tabindex="0" data-act="pick-spot" data-s="${s}"` : 'role="img"';
    g += `<g class="sp ${st}" ${act} aria-label="${lbl}"><title>${lbl}</title><rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="6"/>${st === 'busy' ? carSVG(x, y, sw, sh) : ''}<text x="${x + sw / 2}" y="${y + sh / 2}" dominant-baseline="central" text-anchor="middle" transform="rotate(90 ${x + sw / 2} ${y + sh / 2})">${s}</text></g>`;
  });
  const by = ay + ah + sh + 16;
  g += `<rect x="${x0}" y="${by}" width="${cw}" height="72" rx="10" class="m-bld"/><text x="${x0 + cw / 2}" y="${by + 44}" class="m-bl" text-anchor="middle">Bloc A1b</text></g></g>`;
  return `<svg class="map" viewBox="0 0 ${H} ${W}" role="group" aria-label="Harta parcării pentru vizitatori"><g transform="translate(0 ${W}) rotate(-90)">${g}</g></svg>`;
}

async function pageParking() {
  const now = new Date(), from = new Date(now.getTime() - 86400000), to = new Date(now.getTime() + 31 * 86400000 - 86400000);
  const { data: occ, error } = await sb.rpc('spot_occupancy', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw error;
  S.cache.occ = occ || [];
  const active = S.cache.occ.filter(o => new Date(o.starts_at) <= now && new Date(o.ends_at) > now);
  const busy = new Set(active.map(o => o.spot_code)), free = SPOTS_N - busy.size;
  const occList = ALL_SPOTS.map(sp => { const o = active.find(x => x.spot_code === sp); return o ? `<div class="item occ-now"><b style="font-family:var(--display);font-size:22px;width:42px">${sp}</b><span class="grow">Ocupat · până la ${hhmm(o.ends_at)}</span></div>` : `<div class="item"><b style="font-family:var(--display);font-size:22px;width:42px">${sp}</b><span class="grow" style="color:var(--ok)">Liber</span></div>`; }).join('');
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Parcare vizitatori</h1><p class="muted">15 locuri (V1–V15), între blocurile A1a și A1b. Atinge un loc pe hartă ca să rezervi. Și locurile ocupate acum se pot rezerva pentru mai târziu.</p></div><a class="btn quiet" href="#istoric">Rezervările mele</a></div>
  <div class="note"><span><b>Locurile sunt orientative.</b> Rezervarea îți garantează un loc în parcarea de vizitatori, nu un loc anume: după rezervare, vizitatorul poate parca pe orice loc liber marcat pentru vizitatori.</span></div>
  <div class="card stack">
    <div class="mapwrap"><div class="mapscroll">${mapSVG({ busy, interactive: S.units.length > 0 })}</div>
    <div class="mapinfo">
      <div class="stat"><span class="muted small">Libere acum</span><span class="n">${free}<span class="muted" style="font-size:24px"> / ${SPOTS_N}</span></span></div>
      <div class="legend" style="flex-direction:column;gap:6px"><span><i style="background:var(--paper);border:1.5px dashed var(--muted)"></i>liber acum</span><span><i style="background:var(--bad-soft)"></i>ocupat acum (se poate rezerva pentru mai târziu)</span><span><i style="background:var(--line)"></i>administrație și PK (nu se rezervă)</span></div>
      <p class="muted small">Maximum 3 rezervări active pe apartament. Între două rezervări rămâne 1 oră liberă, ca vizitatorul următor să găsească loc.</p>
      ${S.units.length ? '' : '<p class="err">Nu ai nicio unitate legată de cont, deci nu poți rezerva încă.</p>'}
    </div></div>
  </div>
  <div class="card stack"><h3>Ocupare acum</h3><div class="occgrid">${occList}</div></div>`;
}

/* fereastra de rezervare */
function nextFree(spot, start, durMs) {
  let s = new Date(start);
  for (let i = 0; i < 60; i++) {
    const e = new Date(s.getTime() + durMs), c = (S.cache.occ || []).filter(o => o.spot_code === spot && clashes(o, s, e));
    if (!c.length) return s;
    s = roundUp30(new Date(Math.max(...c.map(o => new Date(o.ends_at).getTime())) + 2 * GAP_MS));
  }
  return s;
}
function openPk(spot) {
  const s = nextFree(spot, roundUp30(new Date()), 3 * 3600000), e = new Date(s.getTime() + 3 * 3600000);
  S.pk = { spot, mode: 'ore', date: dateInput(s), from: hhmm(s), endDate: dateInput(e), to: dateInput(e) === dateInput(s) ? hhmm(e) : '23:30', plate: '', guest: '', unit: S.units[0]?.code };
  showPk();
}
function pkRange() {
  const p = S.pk, s = new Date(`${p.date}T${p.from || '00:00'}`), e = new Date(`${p.mode === 'zile' ? (p.endDate || p.date) : p.date}T${p.to || '00:00'}`);
  return { s, e };
}
function pkStatusHTML() {
  const p = S.pk, { s, e } = pkRange();
  if (!(p.from && p.to) || !(s < e)) return '<p class="err">Plecarea trebuie să fie după sosire.</p>';
  if (e - s > 7 * 86400000) return '<p class="err">Poți rezerva maximum 7 zile.</p>';
  if (e <= new Date()) return '<p class="err">Intervalul ales e deja în trecut.</p>';
  const c = (S.cache.occ || []).filter(o => o.spot_code === p.spot && clashes(o, s, e));
  if (!c.length) return `<div class="note" style="background:var(--ok-soft)"><span><b style="color:var(--ok)">Locul ${p.spot} e liber</b> în intervalul ales.</span></div>`;
  const nk = nextFree(p.spot, s, e - s);
  return `<div class="note" style="background:var(--bad-soft)"><span><b style="color:var(--bad)">Locul ${p.spot} e ocupat</b> ${c.map(o => `${fmtDT(o.starts_at)}–${hhmm(o.ends_at)}`).join(', ')}. Între două rezervări rămâne o pauză de 1 oră. Primul interval liber începe ${fmtDT(nk)}. <button type="button" class="btn ghost sm" data-act="pk-next" data-k="${nk.toISOString()}">Mută rezervarea acolo</button></span></div>`;
}
async function pkModalHTML() {
  const p = S.pk;
  if (!S.cache.myPlates) {
    const { data } = await sb.from('vehicles').select('plate, active').eq('person_id', S.me.id);
    S.cache.myPlates = [...new Set((data || []).filter(v => v.active).map(v => v.plate))];
  }
  const now = new Date(), cur = (S.cache.occ || []).find(o => o.spot_code === p.spot && new Date(o.starts_at) <= now && new Date(o.ends_at) > now);
  const up = (S.cache.occ || []).filter(o => o.spot_code === p.spot && new Date(o.starts_at) > now).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).slice(0, 4);
  const today = dateInput(new Date()), max = dateInput(new Date(Date.now() + 30 * 86400000));
  return `<div class="modal-bg" data-act="pk-close"></div><form class="modal pkmodal" id="pk-form" role="dialog" aria-modal="true" aria-labelledby="pk-h">
  <div class="row between"><h2 id="pk-h">Rezervă locul ${p.spot}</h2><button type="button" class="btn quiet sm" data-act="pk-close" aria-label="Închide">${ic('x')}</button></div>
  <p class="small">${cur ? `<span class="chip bad">Ocupat acum, până la ${hhmm(cur.ends_at)}</span>` : '<span class="chip ok">Liber acum</span>'}${up.length ? ` <span class="muted">Urmează pe acest loc: ${up.map(o => `${fmtDT(o.starts_at)}–${hhmm(o.ends_at)}`).join(', ')}</span>` : ''}</p>
  <p class="small muted">${ORIENT}</p>
  ${S.units.length > 1 ? `<label class="f">Pentru apartamentul<select id="pm-unit">${S.units.map(u => `<option ${u.code === p.unit ? 'selected' : ''}>${esc(u.code)}</option>`).join('')}</select></label>` : ''}
  <div class="row" style="gap:12px"><span class="muted small">Cât timp?</span><div class="seg" style="min-width:240px">${[['ore', 'Câteva ore'], ['zile', 'Mai multe zile']].map(([k, l]) => `<button type="button" data-act="pk-mode" data-m="${k}" aria-pressed="${p.mode === k}">${l}</button>`).join('')}</div></div>
  ${p.mode === 'zile' ? `<div class="form-grid"><label class="f">Ziua sosirii<input type="date" id="pm-date" class="pm-f" value="${p.date}" min="${today}" max="${max}"></label><label class="f">Ora sosirii<input type="time" id="pm-from" class="pm-f" value="${p.from}" step="1800"></label>
   <label class="f">Ziua plecării<input type="date" id="pm-end" class="pm-f" value="${p.endDate}" min="${p.date}"></label><label class="f">Ora plecării<input type="time" id="pm-to" class="pm-f" value="${p.to}" step="1800"></label></div>`
    : `<div class="form-grid fg3"><label class="f">Ziua<input type="date" id="pm-date" class="pm-f" value="${p.date}" min="${today}" max="${max}"></label><label class="f">De la<input type="time" id="pm-from" class="pm-f" value="${p.from}" step="1800"></label><label class="f">Până la<input type="time" id="pm-to" class="pm-f" value="${p.to}" step="1800"></label></div>
   <div class="row" style="gap:6px">${[1, 2, 3, 4, 6].map(h => `<button type="button" class="chip pick" data-act="pk-dur" data-h="${h}">${h} ${h === 1 ? 'oră' : 'ore'}</button>`).join('')}</div>`}
  <div id="pk-status">${pkStatusHTML()}</div>
  <div class="stack" style="gap:6px"><span class="muted small">Numărul mașinii</span>
   ${S.cache.myPlates.length ? `<div class="row">${S.cache.myPlates.map(pl => `<button type="button" class="chip pick" data-act="pk-plate" data-p="${esc(pl)}" aria-pressed="${plateNorm(p.plate) === pl}">${esc(pl)}</button>`).join('')}</div>` : ''}
   <div class="form-grid"><label class="f">Sau scrie numărul vizitatorului<input id="pm-plate" class="pm-f" value="${esc(p.plate)}" placeholder="ex. B 123 ABC" autocomplete="off"></label><label class="f">Cine vine? (opțional)<input id="pm-guest" class="pm-f" value="${esc(p.guest)}" placeholder="ex. părinții, instalator"></label></div></div>
  <p class="err" id="pm-err"></p>
  <div class="row" style="justify-content:flex-end"><button type="button" class="btn quiet" data-act="pk-close">Renunță</button><button class="btn" type="submit">${ic('parking')} Rezervă</button></div></form>`;
}
async function showPk() {
  document.getElementById('pk-wrap')?.remove();
  if (!S.pk) return;
  const w = document.createElement('div'); w.id = 'pk-wrap'; w.innerHTML = await pkModalHTML(); document.body.appendChild(w);
  w.querySelector('#pk-form').addEventListener('submit', onPkSubmit);
  w.querySelectorAll('.pm-f').forEach(el => el.addEventListener('change', () => { readPk(); if (el.id === 'pm-date' || el.id === 'pm-from' || el.id === 'pm-to' || el.id === 'pm-end') document.getElementById('pk-status').innerHTML = pkStatusHTML(); }));
}
function readPk() {
  const p = S.pk, g = id => document.getElementById(id); if (!p || !g('pm-date')) return;
  p.date = g('pm-date').value || p.date; p.from = g('pm-from').value; p.to = g('pm-to').value;
  if (g('pm-end')) p.endDate = g('pm-end').value || p.date; p.plate = g('pm-plate').value; p.guest = g('pm-guest').value;
  if (g('pm-unit')) p.unit = g('pm-unit').value;
}
async function onPkSubmit(e) {
  e.preventDefault(); readPk();
  const p = S.pk, err = document.getElementById('pm-err'), { s, e: en } = pkRange(), plate = plateNorm(p.plate);
  err.textContent = '';
  if (!(s < en)) { err.textContent = 'Plecarea trebuie să fie după sosire.'; return; }
  if (plate.length < 4) { err.textContent = 'Alege sau scrie numărul mașinii.'; return; }
  // locul ales e orientativ: dacă e ocupat, luăm automat alt loc liber în același interval
  const ok = sp => !(S.cache.occ || []).some(o => o.spot_code === sp && clashes(o, s, en));
  const spot = ok(p.spot) ? p.spot : ALL_SPOTS.find(ok);
  if (!spot) { err.textContent = 'Nu mai e niciun loc liber în intervalul ales. Alege altă oră.'; return; }
  const { error } = await sb.from('reservations').insert({ spot_code: spot, unit_code: p.unit || S.units[0]?.code, created_by: S.me.id, source: isAdmin() ? 'admin' : 'app', plate, guest_name: p.guest.trim() || null, starts_at: s.toISOString(), ends_at: en.toISOString() });
  if (error) { err.textContent = errMsg(error); return; }
  S.pk = null; document.getElementById('pk-wrap')?.remove();
  toast(`Rezervare făcută pentru ${plate}. Vizitatorul poate parca pe orice loc liber de vizitatori.`);
  location.hash = '#istoric'; if (S.route === 'istoric') render();
}

/* istoric rezervări */
async function pageHistory() {
  const t = await tarif();
  const codes = S.units.map(u => u.code);
  if (!codes.length) return '<div class="head"><h1>Rezervările mele</h1></div><p class="muted">Nu ai nicio unitate legată.</p>';
  const { data, error } = await sb.from('reservations').select('*').in('unit_code', codes).eq('status', 'activa').order('starts_at', { ascending: false }).limit(300);
  if (error) throw error;
  const now = new Date(), H = r => (new Date(r.ends_at) - new Date(r.starts_at)) / 3600000;
  const cost = r => Math.max(0, H(r) - (t.ore_gratuite || 0)) * (t.lei_pe_ora || 0);
  const up = data.filter(r => new Date(r.ends_at) > now).reverse(), past = data.filter(r => new Date(r.ends_at) <= now);
  const row = (r, canCancel) => `<div class="item"><span class="grow stack" style="gap:2px"><span>${fmtDT(r.starts_at)} → ${dateInput(new Date(r.starts_at)) === dateInput(new Date(r.ends_at)) ? hhmm(r.ends_at) : fmtDT(r.ends_at)}</span><span class="muted small">${esc(r.guest_name || 'Vizitator')}${r.source === 'link' ? ' · rezervat prin link' : ''} · ${esc(r.unit_code)}</span></span>${plateHTML(r.plate)}
    <span class="hcost"><span class="small muted">${canCancel ? 'rezervat ' : ''}${hTxt(H(r))}</span><b>${canCancel ? '≈ ' : ''}${lei(cost(r))}</b></span>
    ${canCancel ? `<button class="btn quiet sm" data-act="res-cancel" data-id="${r.id}">Anulează</button>` : ''}</div>`;
  const tot = (l, label, est) => { const h = l.reduce((a, r) => a + H(r), 0), c = l.reduce((a, r) => a + cost(r), 0); return `<div class="tot"><span><b>${label}</b> <span class="muted small">· ${l.length} ${l.length === 1 ? 'rezervare' : 'rezervări'}</span></span><span class="row" style="gap:16px"><span>${hTxt(h)}</span><b style="font-size:20px">${est ? '≈ ' : ''}${lei(c)}</b></span></div>`; };
  const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const byMonth = {}; past.forEach(r => { const d = new Date(r.starts_at), k = `${LUNI[d.getMonth()]} ${d.getFullYear()}`; (byMonth[k] ||= []).push(r); });
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Rezervările mele</h1><p class="muted">Rezervările viitoare și cele trecute, cu orele și costul (${t.lei_pe_ora} lei/oră). Deocamdată se afișează orele rezervate; orele reale de la barieră se adaugă după legătura cu Metrici. Suma apare pe întreținere.</p></div><a class="btn" href="#parcare">${ic('plus')} Rezervare nouă</a></div>
  <div class="card stack"><h3>Urmează (${up.length})</h3><div class="list">${up.map(r => row(r, true)).join('') || '<p class="muted">Nicio rezervare viitoare.</p>'}</div>${up.length ? tot(up, 'Total estimat', true) : ''}</div>
  <div class="card stack"><h3>Trecute (${past.length})</h3>${Object.keys(byMonth).length ? Object.entries(byMonth).map(([m, l]) => `<h4 class="muted" style="margin:6px 0 0;text-transform:capitalize">${m}</h4><div class="list">${l.map(r => row(r, false)).join('')}</div>${tot(l, 'Total ' + m, false)}`).join('') : '<p class="muted">Încă nimic.</p>'}</div>`;
}

/* vehiculele mele */
async function pageVehicles() {
  const [{ data: veh, error }, { data: acc }] = await Promise.all([
    sb.from('vehicles').select('*, parking_accounts(metrici_name, spaces, location)').eq('person_id', S.me.id).order('plate'),
    sb.from('parking_accounts').select('*').eq('person_id', S.me.id)
  ]);
  if (error) throw error;
  const accounts = acc || [], spaces = accounts.reduce((a, x) => a + (x.spaces || 0), 0), inside = (veh || []).filter(v => v.inside).length;
  const st = v => !v.active ? ['Inactiv', 'line'] : v.expires_at && new Date(v.expires_at) < new Date() ? ['Expirat', 'bad'] : ['Activ', 'ok'];
  const rows = (veh || []).map(v => { const s = st(v); return `<tr><td>${plateHTML(v.plate)}</td><td class="small">${esc(v.parking_accounts?.metrici_name || 'adăugat din aplicație')}<br><span class="muted">${v.parking_accounts?.location === 'Avalon-Interior' ? 'parcarea subterană' : v.parking_accounts ? 'parcarea de afară' : ''}</span></td>
    <td style="white-space:nowrap">${v.expires_at ? fmtDate(v.expires_at) : '<span class="muted">Nu expiră</span>'}</td><td><span class="chip ${s[1]}">${s[0]}</span></td>
    <td>${v.inside ? '<span class="chip ok"><span class="dot"></span>Da</span>' : '<span class="muted">Nu</span>'}</td>
    <td>${v.inside ? '<span class="small muted">nu se poate șterge cât e în complex</span>' : v.source === 'app' ? `<button class="btn quiet sm" data-act="veh-del" data-id="${v.id}" aria-label="Șterge ${esc(v.plate)}">${ic('x')}</button>` : '<span class="small muted">din Metrici</span>'}</td></tr>`; }).join('');
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Vehiculele mele</h1><p class="muted">Mașinile tale din lista barierei.</p></div></div>
  ${accounts.length ? `<div class="note" style="background:var(--accent-soft)">${ic('parking')}<span><b style="color:var(--accent)">${inside} din ${spaces} ${spaces === 1 ? 'loc ocupat' : 'locuri ocupate'}.</b> Pot sta în complex în același timp maximum ${spaces} ${spaces === 1 ? 'mașină' : 'mașini'}; poți avea mai multe înregistrate. Starea „În complex” e cea de la importul din Metrici și se va actualiza automat după legătura cu bariera.</span></div>` : '<div class="note"><span>Nu ai încă un cont de parcare legat. Dacă ai loc de parcare, scrie administrației.</span></div>'}
  <div class="card tablewrap"><table class="rep veh"><thead><tr><th>Număr</th><th>Cont / parcare</th><th>Expirare</th><th>Stare</th><th>În complex</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="muted">Nicio mașină înregistrată.</td></tr>'}</tbody></table></div>
  <form id="veh-form" class="card stack"><h3>Adaugă o mașină</h3>
    <div class="form-grid"><label class="f">Număr de înmatriculare<input id="vh-plate" required placeholder="B 123 ABC" autocomplete="off"></label><span></span></div>
    <div class="row"><button class="btn" type="submit">${ic('plus')} Adaugă mașina</button><span class="muted small">Numărul va ajunge automat în lista barierei după legătura cu Metrici (în lucru).</span></div>
    <p class="err" id="vh-err"></p></form>`;
}
async function onVehAdd(e) {
  e.preventDefault();
  const plate = plateNorm(document.getElementById('vh-plate').value), err = document.getElementById('vh-err');
  if (plate.length < 4) { err.textContent = 'Numărul pare incomplet.'; return; }
  const { error } = await sb.from('vehicles').insert({ plate, person_id: S.me.id, unit_code: S.units[0]?.code || null, source: 'app' });
  if (error) { err.textContent = /duplicate|unique/i.test(error.message) ? 'Mașina e deja în listă.' : errMsg(error); return; }
  S.cache.myPlates = null; toast('Mașina a fost adăugată.'); render();
}

/* pază */
async function pageGuard() {
  const from = dayStart(new Date()), to = new Date(from.getTime() + 86400000);
  const { data, error } = await sb.from('reservations').select('*').eq('status', 'activa').lt('starts_at', to.toISOString()).gt('ends_at', new Date(from.getTime() - 3600000).toISOString()).order('starts_at');
  if (error) throw error;
  const q = (S.cache.gq || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const list = (data || []).filter(r => !q || r.plate.includes(q)).map(r => {
    const now = new Date(), st = new Date(r.starts_at), en = new Date(r.ends_at);
    const state = now > en ? ['Expirată', 'bad'] : now >= new Date(st - 3600000) ? ['Poate intra', 'ok'] : ['Mai târziu', 'line'];
    return `<div class="gcard"><span class="gspot">${esc(r.spot_code)}</span><div class="grow"><div class="gline">${plateHTML(r.plate)} <span class="muted">${esc(r.unit_code)}</span> ${esc(r.guest_name || '')}</div><div class="small muted">${fmtTime(r.starts_at)} → ${fmtDT(r.ends_at)}</div></div><span class="chip ${state[1]}">${state[0]}</span></div>`;
  }).join('') || '<p class="muted">Nicio rezervare azi.</p>';
  return `<div class="head"><div><h1>Pază · azi</h1><p class="muted">Rezervările vizitatorilor de azi.</p></div></div>
  <div class="gsearch gbig">${ic('search')}<input id="g-q" placeholder="Caută număr de înmatriculare" value="${esc(S.cache.gq || '')}"></div>
  <div class="glist">${list}</div>`;
}

/* tichete */
async function pageTickets() {
  const f = S.cache.tf || 'deschise';
  let q = sb.from('tickets').select('id, code, title, status, category, unit_code, updated_at, author_name').order('updated_at', { ascending: false }).limit(300);
  if (f === 'deschise') q = q.in('status', ['nou', 'in_lucru', 'in_asteptare']);
  if (f === 'inchise') q = q.in('status', ['rezolvat', 'inchis', 'respins']);
  const { data, error } = await q; if (error) throw error;
  const s = (S.cache.tq || '').toLowerCase();
  const rows = (data || []).filter(t => !s || `${t.code} ${t.title} ${t.unit_code} ${t.author_name}`.toLowerCase().includes(s));
  const list = rows.map(t => `<a class="item" href="#tichet/${t.id}" style="color:inherit;text-decoration:none"><div class="grow"><div class="title">${esc(t.title)}</div><div class="small muted">${esc(t.code || '')} · ${esc(t.unit_code || '')} · ${esc(t.category)}${isAdmin() ? ' · ' + esc(t.author_name || '') : ''} · ${fmtDate(t.updated_at)}</div></div>${stChip(t.status)}</a>`).join('') || '<p class="muted">Niciun tichet.</p>';
  const tab = (k, l) => `<button class="chip pick" data-act="tf" data-v="${k}" aria-pressed="${f === k}">${l}</button>`;
  return `<div class="head"><div><h1>Tichete</h1><p class="muted">${isAdmin() ? 'Toate tichetele din complex.' : 'Tichetele tale și ale apartamentului tău.'}</p></div><a class="btn" href="#tichet-nou">${ic('plus')} Tichet nou</a></div>
  <div class="row between"><div class="tab-row">${tab('deschise', 'Deschise')}${tab('inchise', 'Rezolvate / închise')}${tab('toate', 'Toate')}</div>
  <div class="gsearch" style="max-width:320px">${ic('search')}<input id="t-q" placeholder="Caută" value="${esc(S.cache.tq || '')}"></div></div>
  <section class="card"><div class="list">${list}</div><p class="small muted">${rows.length} tichete</p></section>`;
}
async function pageTicket(id) {
  const [{ data: t, error }, { data: msgs }] = await Promise.all([
    sb.from('tickets').select('*').eq('id', id).maybeSingle(),
    sb.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at')
  ]);
  if (error) throw error;
  if (!t) return `<p>Tichetul nu există sau nu ai acces la el.</p><a class="btn quiet" href="#tichete">Înapoi</a>`;
  const thread = (msgs || []).map(m => {
    if (m.kind !== 'mesaj' && m.kind !== 'nota') return `<div class="msg sys">${fmtDT(m.created_at)} · ${esc(m.author_name || '')}: ${m.kind === 'status' ? 'status' : m.kind} → ${esc(m.body)}</div>`;
    const mine = m.author_id && m.author_id === S.me.id;
    return `<div class="msg ${mine ? 'me' : ''} ${m.internal ? 'internal' : ''}"><div class="who">${esc(m.author_name || (m.from_admin ? 'Administrație' : ''))}${m.from_admin ? ' · administrație' : ''}${m.internal ? ' · notă internă' : ''} · ${fmtDT(m.created_at)}</div>${esc(m.body)}</div>`;
  }).join('');
  const adminCtl = isAdmin() ? `<label class="f" style="flex-direction:row;align-items:center;gap:8px">Status <select id="tk-status" data-id="${t.id}">${Object.entries(TICKET_ST).map(([k, [l]]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : stChip(t.status);
  return `<a class="small" href="#tichete">← Toate tichetele</a>
  <div class="head"><div><h1 style="font-size:36px">${esc(t.title)}</h1><p class="muted">${esc(t.code || '')} · ${esc(t.unit_code || '')} · ${esc(t.category)} · deschis ${fmtDT(t.created_at)} de ${esc(t.author_name || '')}</p></div>${adminCtl}</div>
  <section class="card stack"><div class="thread">${thread || '<p class="muted">Niciun mesaj.</p>'}</div>
  <form id="reply-form" class="stack" data-id="${t.id}"><label class="f">Răspuns<textarea id="reply-text" required></textarea></label>
  <div class="row">${isAdmin() ? '<label class="row small"><input type="checkbox" id="reply-int"> notă internă (doar administrația o vede)</label>' : ''}<button class="btn" type="submit">Trimite</button></div></form></section>`;
}
async function onReply(e) {
  e.preventDefault();
  const id = e.target.dataset.id, body = document.getElementById('reply-text').value.trim();
  if (!body) return;
  const internal = !!document.getElementById('reply-int')?.checked;
  const { error } = await sb.from('ticket_messages').insert({ ticket_id: id, author_id: S.me.id, from_admin: isAdmin(), body, kind: internal ? 'nota' : 'mesaj', internal, author_name: fullName(S.me), author_role: isAdmin() ? 'A' : 'T' });
  if (error) return toast(errMsg(error));
  await sb.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', id);
  toast('Mesaj trimis.'); render();
}
function pageNewTicket() {
  const cats = ['Spatiu comun', 'Administrativ', 'Financiar', 'Garantii', 'Altele'];
  return `<a class="small" href="#tichete">← Tichete</a><div class="head"><h1>Tichet nou</h1></div>
  <form id="nt-form" class="card form-grid">
    <label class="f">Unitate<select id="nt-unit">${S.units.map(u => `<option>${esc(u.code)}</option>`).join('')}<option value="">Spațiu comun / fără unitate</option></select></label>
    <label class="f">Categorie<select id="nt-cat">${cats.map(c => `<option>${c}</option>`).join('')}</select></label>
    <label class="f full">Titlu<input id="nt-title" required maxlength="140"></label>
    <label class="f full">Descriere<textarea id="nt-body" class="bigtext" required></textarea></label>
    <div class="full row"><button class="btn" type="submit">Trimite tichetul</button><span class="err" id="nt-err"></span></div>
  </form>`;
}
async function onNewTicket(e) {
  e.preventDefault();
  const unit = document.getElementById('nt-unit').value || null;
  const { data, error } = await sb.from('tickets').insert({ unit_code: unit, created_by: S.me.id, author_name: fullName(S.me), category: document.getElementById('nt-cat').value, title: document.getElementById('nt-title').value.trim(), status: 'nou', building: unit ? unit.split('.')[0] : null }).select('id').single();
  if (error) { document.getElementById('nt-err').textContent = errMsg(error); return; }
  await sb.from('ticket_messages').insert({ ticket_id: data.id, author_id: S.me.id, from_admin: isAdmin(), body: document.getElementById('nt-body').value.trim(), kind: 'mesaj', author_name: fullName(S.me), author_role: isAdmin() ? 'A' : 'T' });
  toast('Tichetul a fost trimis.'); location.hash = `#tichet/${data.id}`;
}

/* anunțuri */
async function pageAnn() {
  const { data, error } = await sb.from('announcements').select('*').order('published_at', { ascending: false }).limit(50);
  if (error) throw error;
  const list = (data || []).map(a => `<article class="card stack"><div class="row between"><h3>${esc(a.title_ro)}</h3><span class="chip line">${esc(a.kind)} · ${fmtDate(a.published_at)}</span></div><div style="white-space:pre-wrap">${esc(a.body_ro)}</div></article>`).join('') || '<p class="muted">Niciun anunț încă.</p>';
  const form = isAdmin() ? `<form id="an-form" class="card form-grid"><h3 class="full">Anunț nou</h3>
    <label class="f">Tip<select id="an-kind"><option>Informare</option><option>Urgent</option><option>Lucrări</option><option>Eveniment</option></select></label>
    <label class="f full">Titlu<input id="an-title" required></label>
    <label class="f full">Text<textarea id="an-body" required></textarea></label>
    <div class="full row"><button class="btn" type="submit">Publică în aplicație</button><span class="small muted">Trimiterea pe email vine în versiunea următoare.</span></div></form>` : '';
  return `<div class="head"><h1>Anunțuri</h1></div>${form}${list}`;
}
async function onAnn(e) {
  e.preventDefault();
  const { error } = await sb.from('announcements').insert({ kind: document.getElementById('an-kind').value, title_ro: document.getElementById('an-title').value.trim(), body_ro: document.getElementById('an-body').value.trim(), created_by: S.me.id });
  if (error) return toast(errMsg(error));
  toast('Anunț publicat.'); render();
}

/* documente */
async function pageDocs() {
  const { data, error } = await sb.from('documents').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const list = (data || []).map(d => `<a class="item" href="${esc(d.url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${ic('doc')}<div class="grow"><div class="title">${esc(d.name)}</div><div class="small muted">${esc(d.category)} · ${fmtDate(d.created_at)}</div></div></a>`).join('');
  return `<div class="head"><div><h1>Documente</h1><p class="muted">Decizii CEx, hotărâri AG, formulare și regulamente.</p></div></div>
  <section class="card">${list ? `<div class="list">${list}</div>` : '<p class="muted">Documentele din arhiva Sigtree vor fi încărcate aici în curând.</p>'}</section>`;
}

/* contacte */
async function pageContacts() {
  const { data, error } = await sb.from('contacts').select('*').order('section').order('sort');
  if (error) throw error;
  const groups = {};
  (data || []).forEach(c => (groups[c.section] ||= []).push(c));
  const html = Object.entries(groups).map(([sec, cs]) => `<section class="stack"><h2>${esc(sec)}</h2><div class="grid g3">${cs.map(c => `<div class="card contact"><span class="role-l">${esc(c.role)}</span><span class="name">${esc(c.name)}</span>${c.phone ? `<a class="cline" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${ic('phone')}<span class="v">${esc(c.phone)}</span></a>` : ''}${c.email ? `<a class="cline" href="mailto:${esc(c.email)}">${ic('mail')}<span>${esc(c.email)}</span></a>` : ''}${c.note ? `<span class="small muted">${esc(c.note)}</span>` : ''}${isAdmin() ? `<button class="btn danger sm" data-act="ct-del" data-id="${c.id}">Șterge</button>` : ''}</div>`).join('')}</div></section>`).join('');
  const form = isAdmin() ? `<form id="ct-form" class="card form-grid"><h3 class="full">Adaugă contact</h3>
    <label class="f">Secțiune<input id="ct-sec" required placeholder="ex. Administrație"></label>
    <label class="f">Rol<input id="ct-role" required placeholder="ex. Administrator"></label>
    <label class="f">Nume<input id="ct-name" required></label>
    <label class="f">Telefon<input id="ct-phone"></label>
    <label class="f">Email<input id="ct-email" type="email"></label>
    <label class="f">Notă<input id="ct-note"></label>
    <div class="full"><button class="btn" type="submit">Adaugă</button></div></form>` : '';
  return `<div class="head"><h1>Contacte</h1></div>${html || '<p class="muted">Contactele vor fi adăugate în curând.</p>'}${form}`;
}
async function onContact(e) {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim() || null;
  const { error } = await sb.from('contacts').insert({ section: v('ct-sec'), role: v('ct-role'), name: v('ct-name'), phone: v('ct-phone'), email: v('ct-email'), note: v('ct-note') });
  if (error) return toast(errMsg(error));
  toast('Contact adăugat.'); render();
}

/* profil */
function pageProfile() {
  const me = S.me;
  return `<div class="head"><h1>Profilul meu</h1></div>
  <form id="pf-form" class="card form-grid">
    <label class="f">Prenume<input id="pf-fn" value="${esc(me.first_name)}"></label>
    <label class="f">Nume<input id="pf-ln" value="${esc(me.last_name)}"></label>
    <label class="f">Telefon<input id="pf-ph" value="${esc(me.phone || '')}"></label>
    <label class="f">Email<input value="${esc(me.email)}" disabled></label>
    <div class="full row"><button class="btn" type="submit">Salvează</button><span class="small muted">Pentru schimbarea emailului scrie administrației.</span></div>
  </form>
  <section class="card stack"><h3>Unitățile mele</h3>${S.units.map(u => `<div class="item"><span class="chip line">${esc(u.code)}</span><span>${REL[u.relation] || ''}</span></div>`).join('') || '<p class="muted">Nicio unitate legată.</p>'}</section>
  <button class="btn quiet" data-act="logout">${ic('out')} Ieșire din cont</button>`;
}
async function onProfile(e) {
  e.preventDefault();
  const upd = { first_name: document.getElementById('pf-fn').value.trim(), last_name: document.getElementById('pf-ln').value.trim(), phone: document.getElementById('pf-ph').value.trim() || null };
  const { error } = await sb.from('people').update(upd).eq('id', S.me.id);
  if (error) return toast(errMsg(error));
  Object.assign(S.me, upd); toast('Salvat.'); render();
}

/* admin: utilizatori */
async function pageUsers() {
  if (!S.cache.people) {
    const { data, error } = await sb.from('people').select('id, first_name, last_name, email, phone, access, status, unit_members(unit_code, relation)').order('last_name').limit(2000);
    if (error) throw error;
    S.cache.people = data;
  }
  const q = (S.cache.uq || '').toLowerCase();
  const fs = S.cache.uf || 'toti';
  const rows = S.cache.people.filter(p => (fs === 'toti' || p.status === fs) && (!q || `${p.first_name} ${p.last_name} ${p.email} ${p.phone || ''} ${p.unit_members.map(u => u.unit_code).join(' ')}`.toLowerCase().includes(q)));
  const counts = {}; S.cache.people.forEach(p => counts[p.status] = (counts[p.status] || 0) + 1);
  const tr = rows.slice(0, 300).map(p => `<tr class="userrow"><td class="ucell"><b>${esc(fullName(p))}</b><span class="small muted">${esc(p.email)}</span><span class="small muted">${esc(p.phone || '')}</span></td>
    <td>${p.unit_members.map(u => `<span class="chip line">${esc(u.unit_code)}</span>`).join(' ')}</td>
    <td><select class="accsel acc-${p.access}" data-act-change="acc" data-id="${p.id}">${['locatar', 'admin', 'paza'].map(a => `<option value="${a}" ${a === p.access ? 'selected' : ''}>${a === 'paza' ? 'pază' : a}</option>`).join('')}</select></td>
    <td><span class="chip ${p.status === 'inregistrat' ? 'ok' : p.status === 'dezactivat' ? 'bad' : 'line'}">${PERSON_ST[p.status] || p.status}</span></td></tr>`).join('');
  const chip = (k, l) => `<button class="chip pick" data-act="uf" data-v="${k}" aria-pressed="${fs === k}">${l}${k !== 'toti' ? ` (${counts[k] || 0})` : ` (${S.cache.people.length})`}</button>`;
  return `<div class="head"><div><h1>Utilizatori</h1><p class="muted">Persoanele importate din Sigtree. Invitațiile pe email vin în versiunea următoare.</p></div></div>
  <div class="row between"><div class="tab-row">${chip('toti', 'Toți')}${chip('neinvitat', 'Neinvitați')}${chip('inregistrat', 'Înregistrați')}${chip('dezactivat', 'Dezactivați')}</div>
  <div class="gsearch" style="max-width:340px">${ic('search')}<input id="u-q" placeholder="Nume, email, telefon, unitate" value="${esc(S.cache.uq || '')}"></div></div>
  <section class="card tablewrap"><table class="rep users"><thead><tr><th>Persoană</th><th>Unități</th><th>Acces</th><th>Status</th></tr></thead><tbody>${tr}</tbody></table>
  <p class="small muted">${rows.length} persoane${rows.length > 300 ? ' (se afișează primele 300 – folosește căutarea)' : ''}</p></section>`;
}

/* ---------- randare ---------- */
let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  if (!S.session) { root.innerHTML = loginView(); bind(); return; }
  if (needsPassword()) { root.innerHTML = setPasswordView(); bind(); return; }
  if (!S.me) {
    root.innerHTML = `<div class="login"><div class="card stack">${brand(52)}<h2>Contul nu e încă activ</h2><p class="muted">Contul tău de login există, dar nu e legat de lista asociației. Scrie-ne la aplicatie.avalonestate@gmail.com.</p><button class="btn quiet" data-act="logout">Ieșire</button></div></div>`;
    bind(); return;
  }
  const pages = { acasa: pageHome, parcare: pageParking, istoric: pageHistory, vehicule: pageVehicles, paza: pageGuard, tichete: pageTickets, tichet: () => pageTicket(S.param), 'tichet-nou': pageNewTicket, anunturi: pageAnn, documente: pageDocs, contacte: pageContacts, profil: pageProfile, utilizatori: pageUsers };
  let fn = pages[S.route] || pageHome;
  if ((S.route === 'utilizatori' && !isAdmin()) || (S.route === 'paza' && !isGuard())) fn = pageHome;
  if (!root.querySelector('.app')) root.innerHTML = shell(loading());
  else { const c = root.querySelector('.content'); if (c && !c.dataset.keep) c.innerHTML = loading(); }
  let inner;
  try { inner = await fn(); } catch (e) { inner = `<div class="card stack"><h3>A apărut o eroare</h3><p class="err">${esc(errMsg(e))}</p><button class="btn quiet" data-act="reload">Reîncearcă</button></div>`; }
  if (seq !== renderSeq) return;
  root.innerHTML = shell(inner, S.route === 'utilizatori');
  bind();
}

function bind() {
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  on('login-form', 'submit', onLoginSubmit);
  on('pw-form', 'submit', onSetPassword);
  on('veh-form', 'submit', onVehAdd);
  on('reply-form', 'submit', onReply);
  on('nt-form', 'submit', onNewTicket);
  on('an-form', 'submit', onAnn);
  on('ct-form', 'submit', onContact);
  on('pf-form', 'submit', onProfile);
  on('occ-day', 'change', e => { location.hash = `#parcare/${e.target.value}`; });
  const debounce = (key, id) => on(id, 'input', e => { S.cache[key] = e.target.value; clearTimeout(S.cache['_t' + key]); S.cache['_t' + key] = setTimeout(async () => { await render(); const el = document.getElementById(id); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 300); });
  debounce('tq', 't-q'); debounce('uq', 'u-q'); debounce('gq', 'g-q');
  on('tk-status', 'change', async e => {
    const { error } = await sb.from('tickets').update({ status: e.target.value, updated_at: new Date().toISOString(), ...(e.target.value === 'rezolvat' ? { resolved_at: new Date().toISOString() } : {}), ...(e.target.value === 'inchis' ? { closed_at: new Date().toISOString() } : {}) }).eq('id', e.target.dataset.id);
    if (error) return toast(errMsg(error));
    await sb.from('ticket_messages').insert({ ticket_id: e.target.dataset.id, author_id: S.me.id, from_admin: true, body: TICKET_ST[e.target.value][0], kind: 'status', author_name: fullName(S.me), author_role: 'A' });
    toast('Status schimbat.'); render();
  });
  document.querySelectorAll('[data-act-change="acc"]').forEach(el => el.addEventListener('change', async e => {
    const { error } = await sb.from('people').update({ access: e.target.value }).eq('id', e.target.dataset.id);
    if (error) return toast(errMsg(error));
    const p = S.cache.people.find(x => x.id === e.target.dataset.id); if (p) p.access = e.target.value;
    e.target.className = `accsel acc-${e.target.value}`; toast('Acces actualizat.');
  }));
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'logout') { await sb.auth.signOut(); S.me = null; S.units = []; S.cache = {}; location.hash = ''; return; }
  if (a === 'login-code') { S.loginStep = 'email'; render(); }
  if (a === 'login-pass') { S.loginStep = 'parola'; render(); }
  if (a === 'reload') render();
  if (a === 'tf') { S.cache.tf = b.dataset.v; render(); }
  if (a === 'uf') { S.cache.uf = b.dataset.v; render(); }
  if (a === 'more') {
    document.querySelector('.sheet')?.remove();
    const sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = `<nav class="nav">${menu().map(([r, l, i]) => `<a href="#${r}">${ic(i)}<span>${l}</span></a>`).join('')}<a href="#" data-act="logout">${ic('out')}<span>Ieșire</span></a></nav>`;
    document.body.appendChild(sh);
    setTimeout(() => document.addEventListener('click', function off(ev) { if (!sh.contains(ev.target) || ev.target.closest('a')) { sh.remove(); document.removeEventListener('click', off); } }), 0);
  }
  if (a === 'pick-spot') { openPk(b.dataset.s); return; }
  if (a === 'pk-close') { S.pk = null; document.getElementById('pk-wrap')?.remove(); return; }
  if (a === 'pk-mode') { readPk(); S.pk.mode = b.dataset.m; if (S.pk.mode === 'zile' && S.pk.endDate === S.pk.date) { const d = new Date(S.pk.date + 'T00:00'); d.setDate(d.getDate() + 1); S.pk.endDate = dateInput(d); } showPk(); return; }
  if (a === 'pk-dur') { readPk(); const st = new Date(`${S.pk.date}T${S.pk.from}`), en = new Date(st.getTime() + (+b.dataset.h) * 3600000); if (dateInput(en) !== S.pk.date) { S.pk.mode = 'zile'; S.pk.endDate = dateInput(en); } S.pk.to = hhmm(en); showPk(); return; }
  if (a === 'pk-plate') { readPk(); S.pk.plate = b.dataset.p; showPk(); return; }
  if (a === 'pk-next') { readPk(); const { s: s0, e: e0 } = pkRange(), dur = e0 - s0, ns = new Date(b.dataset.k), ne = new Date(ns.getTime() + dur); S.pk.date = dateInput(ns); S.pk.from = hhmm(ns); S.pk.endDate = dateInput(ne); S.pk.to = hhmm(ne); if (S.pk.endDate !== S.pk.date) S.pk.mode = 'zile'; showPk(); return; }
  if (a === 'veh-del') {
    if (!confirm('Ștergi mașina din listă?')) return;
    const { error } = await sb.from('vehicles').delete().eq('id', b.dataset.id);
    if (error) return toast(errMsg(error));
    S.cache.myPlates = null; toast('Mașina a fost ștearsă.'); render(); return;
  }
  if (a === 'res-cancel') {
    if (!confirm('Anulezi rezervarea?')) return;
    const { error } = await sb.from('reservations').update({ status: 'anulata' }).eq('id', b.dataset.id);
    if (error) return toast(errMsg(error));
    toast('Rezervare anulată.'); render();
  }
  if (a === 'ct-del') {
    if (!confirm('Ștergi contactul?')) return;
    const { error } = await sb.from('contacts').delete().eq('id', b.dataset.id);
    if (error) return toast(errMsg(error));
    render();
  }
});

document.addEventListener('keydown', e => { const t = e.target.closest?.('[data-act="pick-spot"]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPk(t.dataset.s); } if (e.key === 'Escape' && S.pk) { S.pk = null; document.getElementById('pk-wrap')?.remove(); } });

/* ---------- pornire ---------- */
if (/^#(prima-intrare|bun-venit)/.test(location.hash)) { S.loginStep = 'email'; history.replaceState(null, '', location.pathname); }
parseHash();
let started = false;
// Notă: nu facem apeluri Supabase direct în callback (pot bloca); le amânăm cu setTimeout.
sb.auth.onAuthStateChange((_ev, session) => {
  const changed = !started || (session?.user?.id || null) !== (S.session?.user?.id || null);
  started = true;
  S.session = session;
  if (!changed) return;
  setTimeout(async () => {
    S.me = null; S.units = []; S.cache = {};
    if (session) { try { await loadMe(); } catch (e) { console.error(e); } }
    render();
  }, 0);
});
