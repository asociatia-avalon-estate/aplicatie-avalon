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
  menu: 'M4 6h16M4 12h16M4 18h16'
};
const ic = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[n]}"/></svg>`;
const LEAF = ['#73a12f', '#1e6b38', '#f2b21a', '#e3651d', '#d23b2b', '#4e8b6c'];
const logo = (s = 44) => `<svg width="${s}" height="${s}" viewBox="-56 -56 112 112" aria-hidden="true">${LEAF.map((c, i) => `<g transform="rotate(${i * 60})"><path d="M0,-9 C15,-18 17,-38 2,-53 C-15,-40 -15,-20 0,-9 Z" fill="${c}"/><path d="M0,-13 Q4,-30 1,-46" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/></g>`).join('')}</svg>`;
const brand = (s = 44) => `<a class="brand" href="#acasa">${logo(s)}<span><span class="t1">ASOCIAȚIA DE PROPRIETARI</span><br><span class="t2">AVALON ESTATE</span></span></a>`;
const plateHTML = p => `<span class="plate" aria-label="Număr ${esc(p)}"><span class="eu">RO</span><span class="num">${esc(p)}</span></span>`;

const TICKET_ST = { nou: ['Nou', 'gold'], in_lucru: ['În lucru', 'warn'], in_asteptare: ['În așteptare', 'line'], rezolvat: ['Rezolvat', 'ok'], inchis: ['Închis', 'line'], respins: ['Respins', 'bad'] };
const stChip = s => { const [l, c] = TICKET_ST[s] || [s, 'line']; return `<span class="chip ${c}">${l}</span>`; };
const PERSON_ST = { neinvitat: 'Neinvitat încă', invitat: 'Invitat', inregistrat: 'Înregistrat', in_asteptare: 'În așteptare', dezactivat: 'Dezactivat', fost: 'Fost' };
const REL = { proprietar: 'Proprietar', chirias: 'Chiriaș', membru_familie: 'Membru de familie', fara_apartament: '–' };

/* ---------- navigare ---------- */
function menu() {
  const m = [['acasa', 'Acasă', 'home'], ['parcare', 'Parcare vizitatori', 'parking'], ['tichete', 'Tichete', 'ticket'], ['anunturi', 'Anunțuri', 'mega'], ['documente', 'Documente', 'doc'], ['contacte', 'Contacte', 'contacts']];
  if (isGuard()) m.splice(2, 0, ['paza', 'Pază', 'gate']);
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

/* parcare */
async function pageParking() {
  const day = S.param ? new Date(S.param + 'T00:00') : dayStart(new Date());
  const from = dayStart(day), to = new Date(from.getTime() + 86400000);
  const [{ data: occ, error }, { data: spots }, { data: mine }] = await Promise.all([
    sb.rpc('spot_occupancy', { p_from: from.toISOString(), p_to: to.toISOString() }),
    sb.from('parking_spots').select('*').eq('active', true).order('sort'),
    sb.from('reservations').select('*').eq('status', 'activa').gt('ends_at', new Date().toISOString()).order('starts_at')
  ]);
  if (error) throw error;
  const span = to - from;
  const rows = (spots || []).map(s => {
    const bars = (occ || []).filter(o => o.spot_code === s.code).map(o => {
      const a = Math.max(0, new Date(o.starts_at) - from) / span * 100, b = Math.min(span, new Date(o.ends_at) - from) / span * 100;
      return `<i style="left:${a}%;width:${Math.max(.8, b - a)}%" title="${fmtTime(o.starts_at)}–${fmtTime(o.ends_at)}"></i>`;
    }).join('');
    return `<div class="occ-row"><span class="sn">${esc(s.code)}</span><div class="occ-bar">${bars}</div></div>`;
  }).join('');
  const start = new Date(); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1);
  if (dayStart(day) > dayStart(new Date())) { start.setTime(from.getTime()); start.setHours(10); }
  const end = new Date(start.getTime() + 2 * 3600000);
  const unitOpts = S.units.map(u => `<option value="${esc(u.code)}">${esc(u.code)}</option>`).join('');
  const myList = (mine || []).filter(r => isAdmin() ? true : S.units.some(u => u.code === r.unit_code)).map(r => `<div class="item"><span class="chip gold">${esc(r.spot_code)}</span><div class="grow"><div>${plateHTML(r.plate)} ${esc(r.guest_name || '')} <span class="small muted">${esc(r.unit_code)}</span></div><div class="small muted">${fmtDT(r.starts_at)} → ${fmtDT(r.ends_at)}</div></div><button class="btn danger sm" data-act="res-cancel" data-id="${r.id}">Anulează</button></div>`).join('') || '<p class="muted">Nicio rezervare activă.</p>';
  const dstr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  return `<div class="head"><div><h1>Parcare vizitatori</h1><p class="muted">15 locuri. Între două rezervări pe același loc trebuie să rămână o pauză de 1 oră. Bariera se deschide automat pentru numărul rezervat, cu o oră înainte de începutul rezervării.</p></div></div>
  <div class="grid g2">
    <section class="card stack">
      <h3>Rezervare nouă</h3>
      ${S.units.length ? `<form id="res-form" class="form-grid">
        <label class="f">Apartament<select id="r-unit">${unitOpts}</select></label>
        <label class="f">Loc<select id="r-spot">${(spots || []).map(s => `<option>${esc(s.code)}</option>`).join('')}</select></label>
        <label class="f">De la<input id="r-start" type="datetime-local" required value="${toLocalInput(start)}"></label>
        <label class="f">Până la<input id="r-end" type="datetime-local" required value="${toLocalInput(end)}"></label>
        <label class="f">Număr de înmatriculare<input id="r-plate" required placeholder="ex. B123ABC" autocapitalize="characters"></label>
        <label class="f">Nume vizitator (opțional)<input id="r-guest"></label>
        <div class="full row"><button class="btn" type="submit">Rezervă</button><span class="err" id="r-err" role="alert"></span></div>
      </form>` : '<p class="muted">Nu ai nicio unitate legată de cont, deci nu poți rezerva încă.</p>'}
    </section>
    <section class="card stack"><h3>Rezervări active</h3><div class="list">${myList}</div></section>
  </div>
  <section class="card stack">
    <div class="row between"><h3>Ocupare ${fmtDate(day)}</h3><label class="f" style="flex-direction:row;align-items:center">Ziua <input type="date" id="occ-day" value="${dstr}"></label></div>
    <div class="legend"><span><i style="background:var(--ok-soft)"></i>liber</span><span><i style="background:var(--bad)"></i>ocupat</span></div>
    <div>${rows}</div><div class="occ-scale"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
  </section>`;
}
async function onResSubmit(e) {
  e.preventDefault();
  const err = document.getElementById('r-err'); err.textContent = '';
  const s = new Date(document.getElementById('r-start').value), en = new Date(document.getElementById('r-end').value);
  const plate = plateNorm(document.getElementById('r-plate').value);
  if (plate.length < 4) { err.textContent = 'Numărul de înmatriculare pare incomplet.'; return; }
  const row = { spot_code: document.getElementById('r-spot').value, unit_code: document.getElementById('r-unit').value, created_by: S.me.id, source: isAdmin() ? 'admin' : 'app', plate, guest_name: document.getElementById('r-guest').value.trim() || null, starts_at: s.toISOString(), ends_at: en.toISOString() };
  const { error } = await sb.from('reservations').insert(row);
  if (error) { err.textContent = errMsg(error); return; }
  toast('Rezervarea a fost făcută.'); render();
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
  const pages = { acasa: pageHome, parcare: pageParking, paza: pageGuard, tichete: pageTickets, tichet: () => pageTicket(S.param), 'tichet-nou': pageNewTicket, anunturi: pageAnn, documente: pageDocs, contacte: pageContacts, profil: pageProfile, utilizatori: pageUsers };
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
  on('res-form', 'submit', onResSubmit);
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
