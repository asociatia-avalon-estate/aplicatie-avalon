// Aplicația Asociației de Proprietari Avalon Estate – v0.5 (pagini ca în prototip, legată la Metrici)
// Date și login: Supabase. Cheia de mai jos e cheia PUBLICĂ (sigură în browser);
// accesul la date e controlat în baza de date prin Row Level Security.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { startI18n, setLang, isEN } from './i18n.js?v=1';

// buton RO / EN (limba se ține minte în browser)
const langBtn = () => `<div class="langbtn" role="group" aria-label="Limba / Language" data-notr>${ic('globe')}<button type="button" data-act="setlang" data-l="ro" aria-pressed="${!isEN()}">RO</button><button type="button" data-act="setlang" data-l="en" aria-pressed="${isEN()}">EN</button></div>`;

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
  if (e?.code === '23P01' || /fara_suprapunere/.test(m)) return 'Locul e ocupat în intervalul ales. Alege alt loc sau altă oră.';
  if (/max_7_zile/.test(m)) return 'O rezervare poate dura cel mult 7 zile.';
  if (/interval_valid/.test(m)) return 'Ora de sfârșit trebuie să fie după ora de început.';
  if (/Token has expired|invalid/i.test(m) && (S.loginStep === 'code' || S.loginStep === 'invite')) return 'Codul nu e corect sau a expirat. Cere un cod nou.';
  if (/Invalid login credentials/i.test(m)) return 'Email sau parolă greșită. Dacă intri prima dată sau ai uitat parola, apasă „Prima dată aici / Am uitat parola”.';
  if (/Email not confirmed/i.test(m)) return 'Contul nu e încă activat. Apasă „Prima dată aici” și intră cu codul primit pe email.';
  if (/rate limit|security purposes/i.test(m)) return 'Ai cerut prea multe coduri într-un timp scurt. Încearcă din nou peste un minut.';
  return m;
}

const ICON = {
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
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
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
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
  if (S.me?.access === 'paza') return [['paza', 'Vizitatori azi', 'gate'], ['contacte', 'Contacte', 'contacts'], ['profil', 'Contul meu', 'user']];
  const m = [['acasa', 'Acasă', 'home'], ['anunturi', 'Anunțuri', 'mega'], ['tichete', 'Tichete', 'ticket'], ['utilizatori', 'Utilizatori', 'users']];
  if (isAdmin()) m.push(['raport', 'Raport parcări', 'chart'], ['rezervari', 'Rezervări parcare', 'history'], ['paza', 'Pază', 'gate']);
  if (!isAdmin() || S.units.length) m.push(['parcare', 'Parcare vizitatori', 'parking'], ['istoric', 'Rezervările mele', 'history'], ['vehicule', 'Vehiculele mele', 'car']);
  m.push(['documente', 'Documente', 'doc'], ['contacte', 'Contacte', 'contacts'], ['profil', 'Contul meu', 'user']);
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
    invite: ['Bun venit!', 'Scrie adresa de email pe care ai primit invitația și codul de 6 cifre din email. Apoi îți alegi parola.'],
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
  else if (step === 'invite') form = `
    <label class="f">Email<input id="lg-email" type="email" autocomplete="email" required value="${esc(S.loginEmail)}"></label>
    <label class="f">Codul din email<input id="lg-code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Se verifică…' : 'Continuă'}</button>
    <button class="btn quiet" type="button" data-act="login-code">Codul a expirat – trimite unul nou</button>
    <button class="btn quiet" type="button" data-act="login-pass">Am deja parolă</button>`;
  else form = `
    <label class="f">Codul primit<input id="lg-code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Se verifică…' : 'Continuă'}</button>
    <button class="btn quiet" type="button" data-act="login-code">Altă adresă / cod nou</button>`;
  return `<div class="login"><div class="card"><div style="align-self:flex-end;margin-bottom:-8px">${langBtn()}</div>
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
      if (S.loginStep === 'invite') S.loginEmail = document.getElementById('lg-email').value.trim().toLowerCase();
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
  return `<div class="login"><div class="card"><div style="align-self:flex-end;margin-bottom:-8px">${langBtn()}</div>
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
  const tabs = S.me?.access === 'paza' ? [['paza', 'Azi', 'gate'], ['contacte', 'Contacte', 'contacts'], ['profil', 'Cont', 'user']] : isAdmin() ? [['acasa', 'Acasă', 'home'], ['tichete', 'Tichete', 'ticket'], ['utilizatori', 'Utilizatori', 'users'], ['raport', 'Raport', 'chart']] : [['acasa', 'Acasă', 'home'], ['parcare', 'Parcare', 'parking'], ['tichete', 'Tichete', 'ticket'], ['anunturi', 'Anunțuri', 'mega']];
  const tabHTML = tabs.map(([r, l, i]) => `<a href="#${r}" ${S.route === r ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></a>`).join('') + `<button type="button" data-act="more">${ic('menu')}<span>Mai mult</span></button>`;
  return `<div class="app">
    <aside class="side">${brand(46)}<nav class="nav" aria-label="Meniu">${nav}</nav>
      <div class="role"><span class="small">${esc(fullName(S.me))}</span><span class="small muted">${esc(S.units.map(u => u.code).join(', ') || '')}</span><button class="btn quiet sm" data-act="logout" data-en="Sign out">${ic('out')} Ieșire</button></div>
    </aside>
    <div class="main">
      <header class="top">${brand(38)}<span class="demo-pill">Versiune de test</span>${langBtn()}</header>
      <main class="content ${wide ? 'wide' : ''}">${inner}</main>
    </div>
    <nav class="tabbar" aria-label="Meniu rapid">${tabHTML}</nav>
  </div>`;
}
const loading = () => `<div class="loading">Se încarcă…</div>`;

/* pagina de start: vezi mai jos (pagini ca în prototip) */

/* parcare – hartă, rezervare în fereastră, istoric, vehicule
   Locurile de pe hartă sunt ORIENTATIVE: după rezervare vizitatorul poate parca pe orice loc liber de vizitatori. */
const SPOTS_N = 15, LEFT_N = 7, ALL_SPOTS = Array.from({ length: SPOTS_N }, (_, i) => 'V' + (i + 1));
const GAP_MS = 0; // fără pauză între rezervări: orele se taxează după intrarea/ieșirea reală la barieră
const ORIENT = 'Locul ales e orientativ: după rezervare, vizitatorul poate parca pe orice loc liber marcat pentru vizitatori.';
const hhmm = d => fmtTime(d);
const nowMin = () => { const x = new Date(); x.setSeconds(0, 0); return x; };
const inPast = s => s < new Date(Date.now() - 5 * 60000);
const roundUp30 = d => { const x = new Date(d); x.setSeconds(0, 0); const m = x.getMinutes(); if (m === 0) return x; x.setMinutes(m <= 30 ? 30 : 60); return x; };
const dateInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lei = n => `${(Math.round(n * 100) / 100).toFixed(2).replace('.', ',')} lei`;
const hTxt = h => { const x = Math.round(h * 100) / 100; return `${String(x).replace('.', ',')} ${x === 1 ? 'oră' : 'ore'}`; };
let TARIF = null;
/* Tarif vizitatori: lei_pe_ora (fără TVA); în fiecare perioadă de 24 h de la sosire se taxează fiecare oră începută, maximum ore_plafon ore (5 lei × 10 h = 50 lei / 24 h). */
function costParcare(h, t = TARIF || {}) {
  const rate = t.lei_pe_ora ?? 5, cap = t.ore_plafon ?? 10, zile = Math.floor(h / 24 + 1e-9), rest = Math.max(0, Math.ceil(h - zile * 24 - 1e-9));
  return (zile * Math.min(24, cap) + Math.min(rest, cap)) * rate;
}
const TVA_TXT = 'fără TVA';
async function tarif() { if (TARIF) return TARIF; const { data } = await sb.from('settings').select('value').eq('key', 'tarif').maybeSingle(); TARIF = data?.value || { lei_pe_ora: 5 }; return TARIF; }
const clashes = (o, s, e) => new Date(o.starts_at).getTime() < e.getTime() && s.getTime() < new Date(o.ends_at).getTime();
// ore taxate: din momentul intrării la barieră până la ieșire (sau acum, dacă e încă în parcare); fără intrare → orele rezervate (estimare) sau 0 dacă n-a venit
function resHours(r, now = new Date()) {
  if (r.entered_at) return { h: Math.max(0, (new Date(r.exited_at || now) - new Date(r.entered_at)) / 3600000), real: true };
  if (new Date(r.ends_at) <= now && ['trimis', 'sters'].includes(r.metrici_state)) return { h: 0, real: true, noShow: true };
  return { h: (new Date(r.ends_at) - new Date(r.starts_at)) / 3600000, real: false };
}

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
  // locul de lângă V7 e al PK și nu se folosește (doar desenat)
  { const x = x0 + LEFT_N * (sw + sg), y = ay - sh - 2, lbl = 'PK7, nu se poate rezerva';
    g += `<g class="sp off" role="img" aria-label="${lbl}"><title>${lbl}</title><rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="6"/><text x="${x + sw / 2}" y="${y + sh / 2}" dominant-baseline="central" text-anchor="middle" transform="rotate(90 ${x + sw / 2} ${y + sh / 2})">PK7</text></g>`; }
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
      <p class="muted small">Maximum 3 rezervări active pe apartament. Bariera recunoaște numărul vizitatorului cu o oră înainte de sosire; la ieșire numărul se scoate din barieră. Se taxează orele reale petrecute în parcare.</p>
      ${S.units.length ? '' : '<p class="err">Nu ai nicio unitate legată de cont, deci nu poți rezerva încă.</p>'}
    </div></div>
  </div>
  ${S.units.length ? await visitorLinkCard() : ''}
  <div class="card stack"><h3>Ocupare acum</h3><div class="occgrid">${occList}</div></div>`;
}

/* link pentru vizitatori: vizitatorul își face singur rezervarea, fără cont */
const pubURL = t => `${location.origin}${location.pathname}#v-${t}`;
async function visitorLinkCard() {
  const unit = S.cache.linkUnit || S.units[0].code;
  if (!S.cache.vlink || S.cache.vlink.unit !== unit) {
    const { data, error } = await sb.rpc('my_visitor_link', { p_unit: unit, p_new: false });
    if (error) return `<div class="card"><p class="err">${esc(errMsg(error))}</p></div>`;
    S.cache.vlink = { unit, token: data };
  }
  const url = pubURL(S.cache.vlink.token);
  return `<div class="card stack"><div class="row between"><h3>Linkul tău pentru vizitatori</h3>${ic('link')}</div>
    ${S.units.length > 1 ? `<label class="f">Unitatea<select id="vl-unit">${S.units.map(u => `<option ${u.code === unit ? 'selected' : ''}>${esc(u.code)}</option>`).join('')}</select></label>` : ''}
    <p class="muted small">Linkul e doar al unității ${esc(unit)}. Trimite-l pe WhatsApp cui vine la tine (părinți, prieteni, meseriași). Își rezervă singuri un loc și își scriu numărul mașinii, fără cont. Rezervarea apare la tine, iar numărul ajunge automat în barieră.</p>
    <div class="linkbox"><code>${esc(url)}</code><button class="btn sm" type="button" data-act="copy" data-t="${esc(url)}">${ic('copy')} Copiază</button></div>
    <div class="row between"><a class="btn ghost sm" href="#v-${esc(S.cache.vlink.token)}">Vezi ce vede vizitatorul</a><button class="btn quiet sm" type="button" data-act="new-link">Generează alt link</button></div>
    <p class="muted small">Dacă linkul ajunge la cine nu trebuie, generează altul. Cel vechi nu mai funcționează.</p></div>`;
}

/* pagina publică a vizitatorului (#v-<token>) – nu cere login */
async function pagePublic(token) {
  const wrap = inner => `<div class="pub"><div class="wrap"><div class="row between">${brand(48)}${langBtn()}</div>${inner}</div></div>`;
  if (S.pubDone) {
    const r = S.pubDone;
    return wrap(`<div class="card stack"><span class="chip ok" style="align-self:flex-start">Rezervare confirmată</span><h2>Ai loc în parcarea de vizitatori</h2>
      <p>${fmtDT(r.starts_at)} → ${fmtDT(r.ends_at)}</p><div>${plateHTML(r.plate)}</div>
      <div class="note">${ic('gate')}<span>Bariera îți recunoaște numărul cu o oră înainte de sosire. Poți parca pe orice loc liber marcat pentru vizitatori (locul ${esc(r.spot)} de pe hartă e orientativ). Când ieși, numărul se scoate din barieră. Se taxează orele reale petrecute în parcare, la apartamentul care te-a invitat.</span></div>
      <p class="muted small">Locurile de vizitatori sunt între blocurile A1a și A1b, intrarea din aleea principală.</p><div class="mapscroll">${mapSVG({ sel: r.spot, interactive: false })}</div>
      <button class="btn ghost" type="button" data-act="pub-again">Fă altă rezervare</button></div>`);
  }
  const { data: info } = await sb.rpc('visitor_link_info', { p_token: token });
  if (!info) return wrap(`<div class="card stack"><h2>Linkul nu mai este valabil</h2><p class="muted">Cere un link nou de la persoana la care vii în vizită.</p></div>`);
  const d = nowMin(), e = new Date(d.getTime() + 3 * 3600000), max = new Date(Date.now() + 30 * 86400000);
  return wrap(`<form class="card stack" id="pub-form"><h2>Rezervă un loc pentru vizitatori</h2><p class="muted">Vii în vizită la <b>${esc(info.unit)}</b>. Completează datele și primești un loc.</p>
    <div class="form-grid">
      <label class="f">Numele tău<input id="pb-name" required maxlength="80" autocomplete="name"></label>
      <label class="f">Telefon<input id="pb-phone" type="tel" required maxlength="30" autocomplete="tel"></label>
      <label class="f full">Numărul mașinii<input id="pb-plate" required placeholder="B 123 ABC" autocomplete="off"></label>
      <label class="f">Ziua sosirii<input id="pb-date" type="date" value="${dateInput(d)}" min="${dateInput(new Date())}" max="${dateInput(max)}" required></label>
      <label class="f">Ora sosirii<input id="pb-from" type="time" step="60" value="${hhmm(d)}" required></label>
      <label class="f">Ziua plecării<input id="pb-end" type="date" value="${dateInput(e)}" min="${dateInput(new Date())}" max="${dateInput(max)}" required></label>
      <label class="f">Ora plecării<input id="pb-to" type="time" step="60" value="${hhmm(e)}" required></label>
      <p class="muted small full">Stai mai multe zile? Alege altă zi a plecării (maximum 7 zile). Cost: ${(TARIF?.lei_pe_ora ?? 5)} lei/oră ${TVA_TXT}, maximum ${(TARIF?.lei_pe_ora ?? 5) * (TARIF?.ore_plafon ?? 10)} lei la 24 de ore, plătit de apartamentul care te-a invitat.</p>
    </div><p class="err" id="pb-err"></p>
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Se rezervă…' : 'Rezervă'}</button>
    <p class="muted small">Datele tale sunt folosite doar pentru accesul în parcare.</p></form>`);
}
async function onPubSubmit(e) {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim(), err = document.getElementById('pb-err'); err.textContent = '';
  const s = new Date(`${v('pb-date')}T${v('pb-from')}`), en = new Date(`${v('pb-end') || v('pb-date')}T${v('pb-to')}`), plate = plateNorm(v('pb-plate'));
  if (plate.length < 4) { err.textContent = 'Scrie numărul mașinii, de exemplu B 123 ABC.'; return; }
  if (inPast(s)) { err.textContent = 'Ora sosirii a trecut. Alege ora de acum sau mai târziu.'; return; }
  if (!(s < en)) { err.textContent = 'Plecarea trebuie să fie după sosire.'; return; }
  if (en - s > 7 * 86400000) { err.textContent = 'Poți rezerva maximum 7 zile.'; return; }
  S.busy = true;
  const { data, error } = await sb.rpc('visitor_book', { p_token: S.param, p_plate: plate, p_name: v('pb-name'), p_phone: v('pb-phone'), p_starts: s.toISOString(), p_ends: en.toISOString() });
  S.busy = false;
  if (error) { err.textContent = errMsg(error); return; }
  S.pubDone = data; render(); window.scrollTo(0, 0);
}

/* fereastra de rezervare */
function nextFree(spot, start, durMs) {
  let s = new Date(start);
  for (let i = 0; i < 60; i++) {
    const e = new Date(s.getTime() + durMs), c = (S.cache.occ || []).filter(o => o.spot_code === spot && clashes(o, s, e));
    if (!c.length) return s;
    s = roundUp30(new Date(Math.max(...c.map(o => new Date(o.ends_at).getTime()))));
  }
  return s;
}
function openPk(spot) {
  const s = nextFree(spot, nowMin(), 3 * 3600000), e = new Date(s.getTime() + 3 * 3600000);
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
  if (inPast(s)) return '<p class="err">Ora sosirii a trecut. Alege ora de acum sau mai târziu.</p>';
  const c = (S.cache.occ || []).filter(o => o.spot_code === p.spot && clashes(o, s, e));
  if (!c.length) return `<div class="note" style="background:var(--ok-soft)"><span><b style="color:var(--ok)">Locul ${p.spot} e liber</b> în intervalul ales. Cost estimat: <b>${lei(costParcare((e - s) / 3600000))}</b> ${TVA_TXT}.</span></div>`;
  const nk = nextFree(p.spot, s, e - s);
  return `<div class="note" style="background:var(--bad-soft)"><span><b style="color:var(--bad)">Locul ${p.spot} e ocupat</b> ${c.map(o => `${fmtDT(o.starts_at)}–${hhmm(o.ends_at)}`).join(', ')}. Primul interval liber începe ${fmtDT(nk)}. <button type="button" class="btn ghost sm" data-act="pk-next" data-k="${nk.toISOString()}">Mută rezervarea acolo</button></span></div>`;
}
async function pkModalHTML() {
  await tarif();
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
  ${p.mode === 'zile' ? `<div class="form-grid"><label class="f">Ziua sosirii<input type="date" id="pm-date" class="pm-f" value="${p.date}" min="${today}" max="${max}"></label><label class="f">Ora sosirii<input type="time" id="pm-from" class="pm-f" value="${p.from}" step="60"></label>
   <label class="f">Ziua plecării<input type="date" id="pm-end" class="pm-f" value="${p.endDate}" min="${p.date}"></label><label class="f">Ora plecării<input type="time" id="pm-to" class="pm-f" value="${p.to}" step="60"></label></div>`
    : `<div class="form-grid fg3"><label class="f">Ziua<input type="date" id="pm-date" class="pm-f" value="${p.date}" min="${today}" max="${max}"></label><label class="f">De la<input type="time" id="pm-from" class="pm-f" value="${p.from}" step="60"></label><label class="f">Până la<input type="time" id="pm-to" class="pm-f" value="${p.to}" step="60"></label></div>
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
  if (inPast(s)) { err.textContent = 'Ora sosirii a trecut. Alege ora de acum sau mai târziu.'; return; }
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
  const now = new Date(), H = r => resHours(r, now).h;
  const cost = r => costParcare(H(r), t);
  const gate = r => { const x = resHours(r, now);
    if (r.metrici_state === 'nu_e_cazul' && !r.entered_at) return '';
    if (x.noShow) return ' · <b>nu a venit</b> (0 lei)';
    if (r.entered_at && !r.exited_at) return ` · <b style="color:var(--ok)">în parcare acum</b> (intrat ${hhmm(r.entered_at)})`;
    if (r.entered_at) return ` · intrat ${hhmm(r.entered_at)}, ieșit ${dateInput(new Date(r.entered_at)) === dateInput(new Date(r.exited_at)) ? hhmm(r.exited_at) : fmtDT(r.exited_at)}`;
    if (r.metrici_state === 'trimis') return ' · numărul e în barieră';
    if (r.metrici_state === 'de_trimis') return ' · se trimite la barieră…';
    if (r.metrici_state === 'eroare') return ' · <span class="err">nu a ajuns la barieră, reîncercăm</span>';
    return ''; };
  const up = data.filter(r => new Date(r.ends_at) > now).reverse(), past = data.filter(r => new Date(r.ends_at) <= now);
  const row = (r, canCancel) => `<div class="item"><span class="grow stack" style="gap:2px"><span>${fmtDT(r.starts_at)} → ${dateInput(new Date(r.starts_at)) === dateInput(new Date(r.ends_at)) ? hhmm(r.ends_at) : fmtDT(r.ends_at)}</span><span class="muted small">${esc(r.guest_name || 'Vizitator')}${r.source === 'link' ? ' · rezervat prin link' : ''} · ${esc(r.unit_code)}${gate(r)}</span></span>${plateHTML(r.plate)}
    <span class="hcost"><span class="small muted">${resHours(r, now).real ? 'la barieră ' : 'rezervat '}${hTxt(H(r))}</span><b>${resHours(r, now).real && !(r.entered_at && !r.exited_at) ? '' : '≈ '}${lei(cost(r))}</b></span>
    ${canCancel ? `<button class="btn quiet sm" data-act="res-cancel" data-id="${r.id}">Anulează</button>` : ''}</div>`;
  const tot = (l, label, est) => { const h = l.reduce((a, r) => a + H(r), 0), c = l.reduce((a, r) => a + cost(r), 0); return `<div class="tot"><span><b>${label}</b> <span class="muted small">· ${l.length} ${l.length === 1 ? 'rezervare' : 'rezervări'}</span></span><span class="row" style="gap:16px"><span>${hTxt(h)}</span><b style="font-size:20px">${est ? '≈ ' : ''}${lei(c)}</b></span></div>`; };
  const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const byMonth = {}; past.forEach(r => { const d = new Date(r.starts_at), k = `${LUNI[d.getMonth()]} ${d.getFullYear()}`; (byMonth[k] ||= []).push(r); });
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Rezervările mele</h1><p class="muted">Rezervările viitoare și cele trecute, cu orele și costul (${t.lei_pe_ora ?? 5} lei/oră ${TVA_TXT}, maximum ${(t.lei_pe_ora ?? 5) * (t.ore_plafon ?? 10)} lei pentru fiecare 24 de ore). Se taxează orele reale de la barieră, de la intrare până la ieșire; până intră mașina se arată orele rezervate. Dacă vizitatorul nu vine, nu se plătește nimic. Suma apare pe întreținere.</p></div><a class="btn" href="#parcare">${ic('plus')} Rezervare nouă</a></div>
  <div class="card stack"><h3>Urmează (${up.length})</h3><div class="list">${up.map(r => row(r, true)).join('') || '<p class="muted">Nicio rezervare viitoare.</p>'}</div>${up.length ? tot(up, 'Total estimat', true) : ''}</div>
  <div class="card stack"><h3>Trecute (${past.length})</h3>${Object.keys(byMonth).length ? Object.entries(byMonth).map(([m, l]) => `<h4 class="muted" style="margin:6px 0 0;text-transform:capitalize">${m}</h4><div class="list">${l.map(r => row(r, false)).join('')}</div>${tot(l, 'Total ' + m, false)}`).join('') : '<p class="muted">Încă nimic.</p>'}</div>`;
}

/* vehiculele mele */
async function pageVehicles() {
  const unit = S.units[0]?.code;
  const [{ data: veh, error }, { data: pk }] = await Promise.all([
    sb.from('vehicles').select('*, parking_accounts(metrici_name, spaces, location)').eq('person_id', S.me.id).order('plate'),
    unit ? sb.rpc('my_unit_parking', { p_unit: unit }) : Promise.resolve({ data: null })
  ]);
  if (error) throw error;
  const spaces = pk?.spaces || 0, inside = pk?.inside ?? (veh || []).filter(v => v.inside).length, accounts = spaces ? [1] : [];
  const MS = { de_adaugat: ['Se trimite la barieră…', 'line'], activ: ['În barieră', 'ok'], in_cont: ['În contul tău de parcare', 'ok'], suspendat: ['Oprit temporar: locurile sunt ocupate', 'warn'], fara_parcare: ['Fără loc de parcare', 'line'], eroare: ['Nu a ajuns la barieră, reîncercăm', 'bad'] };
  const st = v => !v.active ? ['Inactiv', 'line'] : v.expires_at && new Date(v.expires_at) < new Date() ? ['Expirat', 'bad'] : v.source === 'app' ? (MS[v.metrici_state] || MS.de_adaugat) : ['Activ', 'ok'];
  const SCH = { oricand: 'Oricând', program: 'Program de lucru', weekend: 'Weekend' };
  const rows = (veh || []).map(v => { const s = st(v); return `<tr><td>${plateHTML(v.plate)}</td><td class="small">${esc(v.info || '—')}<br><span class="muted">${SCH[v.schedule] || 'Oricând'}${v.starts_at && new Date(v.starts_at) > new Date() ? ' · de la ' + fmtDate(v.starts_at) : ''}</span></td><td class="small">${esc(v.parking_accounts?.metrici_name || 'adăugat din aplicație')}<br><span class="muted">${v.parking_accounts?.location === 'Avalon-Interior' ? 'parcarea subterană' : v.parking_accounts ? 'parcarea de afară' : ''}</span></td>
    <td style="white-space:nowrap">${v.expires_at ? fmtDate(v.expires_at) : '<span class="muted">Nu expiră</span>'}</td><td><span class="chip ${s[1]}">${s[0]}</span></td>
    <td>${v.inside ? '<span class="chip ok"><span class="dot"></span>Da</span>' : '<span class="muted">Nu</span>'}</td>
    <td>${v.inside ? '<span class="small muted">nu se poate șterge cât e în complex</span>' : `<button class="btn quiet sm" data-act="veh-del" data-id="${v.id}" data-p="${esc(v.plate)}" aria-label="Șterge ${esc(v.plate)}">${ic('x')}</button>`}</td></tr>`; }).join('');
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Vehiculele mele</h1><p class="muted">Mașinile tale din lista barierei.</p></div><button class="btn" data-act="veh-new">${ic('plus')} Adaugă o mașină</button></div>
  ${accounts.length ? `<div class="note" style="background:var(--accent-soft)">${ic('parking')}<span><b style="color:var(--accent)">${inside} din ${spaces} ${spaces === 1 ? 'loc ocupat' : 'locuri ocupate'}.</b> Pot sta în complex în același timp maximum ${spaces} ${spaces === 1 ? 'mașină' : 'mașini'}; poți avea mai multe înregistrate. Când toate locurile sunt ocupate, celelalte mașini adăugate din aplicație sunt oprite temporar la barieră și pornesc singure când iese o mașină. „În complex” se actualizează automat de la barieră.</span></div>` : '<div class="note"><span>Unitatea ta nu are încă un loc de parcare în evidență. Dacă ai loc de parcare, scrie administrației.</span></div>'}
  <div class="card tablewrap"><table class="rep veh"><thead><tr><th>Număr</th><th>Info / program</th><th>Cont / parcare</th><th>Expirare</th><th>Stare</th><th>În complex</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">Nicio mașină înregistrată.</td></tr>'}</tbody></table></div>
`;
}
function vehModal() {
  const now = new Date(), d = toLocalInput(now);
  openModal(`<form class="modal pkmodal" id="veh-form" role="dialog" aria-modal="true" aria-labelledby="vh-h"><div class="row between"><h2 id="vh-h">Adaugă o mașină</h2><button type="button" class="btn quiet sm" data-act="m-close" aria-label="Închide">${ic('x')}</button></div>
   <div class="form-grid">
    <label class="f">Număr de înmatriculare<input id="vh-plate" required placeholder="B 123 ABC" autocomplete="off" autocapitalize="characters"></label>
    <label class="f">A cui e mașina / info<input id="vh-info" maxlength="80" placeholder="ex. Andrei, Dacia Logan albastră"></label>
    <label class="f">Program de acces<select id="vh-sched"><option value="oricand">Oricând</option><option value="program">Program de lucru</option><option value="weekend">Weekend</option></select></label>
    <label class="f">De când<input id="vh-start" type="datetime-local" value="${d}"></label>
    <label style="grid-column:1/-1;display:flex;gap:8px;align-items:center;cursor:pointer"><input id="vh-never" type="checkbox" checked style="width:18px;height:18px;margin:0"> Nu expiră</label>
    <label class="f" id="vh-exp-wrap" style="display:none">Expiră la<input id="vh-exp" type="datetime-local" value="${d.slice(0, 10)}T23:59"></label></div>
   <p class="muted small">Mașina intră în contul tău de parcare și bariera o recunoaște în câteva secunde, în perioada aleasă. Pentru o mașină temporară (de exemplu a unui musafir care stă câteva zile) debifează „Nu expiră” și alege data.</p>
   <p class="err" id="vh-err"></p>
   <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="m-close">Renunță</button><button class="btn" type="submit">${ic('plus')} Adaugă mașina</button></div></form>`, w => {
    w.querySelector('#veh-form').addEventListener('submit', onVehAdd);
    w.querySelector('#vh-never').addEventListener('change', e => { w.querySelector('#vh-exp-wrap').style.display = e.target.checked ? 'none' : ''; });
  });
}
async function onVehAdd(e) {
  e.preventDefault();
  const plate = plateNorm(document.getElementById('vh-plate').value), err = document.getElementById('vh-err');
  if (plate.length < 4) { err.textContent = 'Numărul pare incomplet.'; return; }
  const sv = document.getElementById('vh-start').value, never = document.getElementById('vh-never').checked, ev = document.getElementById('vh-exp').value;
  const starts = sv ? new Date(sv) : new Date(), exp = never ? null : (ev ? new Date(ev) : null);
  if (!never && !exp) { err.textContent = 'Alege data la care expiră.'; return; }
  if (exp && exp <= starts) { err.textContent = 'Expirarea trebuie să fie după „De când”.'; return; }
  const { error } = await sb.from('vehicles').insert({ plate, person_id: S.me.id, unit_code: S.units[0]?.code || null, source: 'app',
    info: document.getElementById('vh-info').value.trim() || null, schedule: document.getElementById('vh-sched').value, starts_at: starts.toISOString(), expires_at: exp ? exp.toISOString() : null });
  if (error) { err.textContent = /duplicate|unique/i.test(error.message) ? 'Mașina e deja în listă.' : errMsg(error); return; }
  closeModal(); S.cache.myPlates = null; toast('Mașina a fost adăugată.'); render();
}

/* ---------- pagini (ca în prototip) ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const isGuardOnly = () => S.me?.access === 'paza';
const blockOf = c => String(c || '').split('.')[0];
const myBlocks = () => [...new Set(S.units.map(u => u.building || blockOf(u.code)))];
const monthKeyOf = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const prevMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return monthKeyOf(d); };
const monthRange = m => { const [y, mm] = m.split('-').map(Number); return [new Date(y, mm - 1, 1), new Date(y, mm, 1)]; };
const fh = n => (Math.round(n * 10) / 10).toLocaleString('ro-RO');
const timeTxt = r => { const s = new Date(r.starts_at), e = new Date(r.ends_at); return dateInput(s) === dateInput(e) ? `${fmtDate(s)}, ${hhmm(s)}–${hhmm(e)}` : `${fmtDT(s)} → ${fmtDT(e)}`; };
const resCost = r => costParcare(resHours(r).h);
const overMin = r => r.exited_at && new Date(r.exited_at) > new Date(r.ends_at) ? Math.round((new Date(r.exited_at) - new Date(r.ends_at)) / 60000) : (r.visitor_inside && new Date() > new Date(r.ends_at) ? Math.round((new Date() - new Date(r.ends_at)) / 60000) : 0);
const SRC = { app: 'Locatarul', link: 'Vizitatorul (link)', admin: 'Administrația', import: 'Import' };
const OPEN_ST = ['nou', 'in_lucru', 'in_asteptare'];
async function unitsList() { if (!S.cache.unitsAll) { const { data } = await sb.from('units').select('code, building, kind').order('code').limit(2000); S.cache.unitsAll = data || []; } return S.cache.unitsAll; }

/* anunțuri – ajutoare */
const ANN_CATS = { Informare: 'line', Eveniment: 'gold', Mentenanță: 'warn', Urgent: 'bad', Lucrări: 'warn' };
const annFor = a => a.in_app !== false && (!a.target_blocks?.length || a.target_blocks.some(b => myBlocks().includes(b)));
const audTxt = a => a.target_blocks?.length ? a.target_blocks.map(b => b === 'CEx' ? 'Comitetul executiv (CEx)' : 'Bloc ' + b).join(', ') : 'Toți locatarii';
const EMOJI = '📢 ⚠️ ℹ️ ❗ ✅ ❌ 🆕 📌 📅 🗓️ ⏰ ⏳ 📍 🚗 🅿️ 🚧 🚪 🔑 🔒 🛗 🏠 🏢 🌳 🌸 🍂 ☀️ 🌧️ ❄️ 🔧 🛠️ 💡 🔌 ⚡ 💧 🚿 🔥 🧹 🗑️ ♻️ 📦 📬 ✉️ 📞 💬 📄 💳 💰 🎉 🥳 🎈 🎃 🎄 🎁 🧡 ❤️ 👋 🙏 👍 👏 😊 🙂 🐶 🐱 👶 ☕ ⚽ 🚲'.split(' ');
function mdLite(t) {
  const lines = esc(t || '').split('\n'); let html = '', inUl = false, para = [];
  const inl = x => x.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const flush = () => { if (para.length) { html += `<p>${para.map(inl).join('<br>')}</p>`; para = []; } };
  lines.forEach(l => { if (/^\s*[-•]\s+/.test(l)) { flush(); if (!inUl) { html += '<ul>'; inUl = true; } html += `<li>${inl(l.replace(/^\s*[-•]\s+/, ''))}</li>`; } else { if (inUl) { html += '</ul>'; inUl = false; } if (!l.trim()) flush(); else para.push(l); } });
  flush(); if (inUl) html += '</ul>'; return html;
}
function emailHTML(a) {
  return `<div class="mail"><div class="mail-meta"><span><b>De la:</b> Asociația Avalon Estate &lt;aplicatie.avalonestate@gmail.com&gt;</span><span><b>Subiect:</b> ${esc(a.title_ro) || '<i>(fără subiect)</i>'}</span></div>
  <div class="mail-bg"><div class="mail-brand">${logo(34)}<span><span class="t1">ASOCIAȚIA DE PROPRIETARI</span><br><span class="t2">AVALON ESTATE</span></span></div>
  <div class="mail-card"><h1>${esc(a.title_ro) || 'Titlul anunțului'}</h1><div class="mail-body">${mdLite(a.body_ro) || '<p class="ph">Textul anunțului apare aici pe măsură ce scrii.</p>'}</div>
  ${a.in_app === false ? '' : '<div class="mail-btns"><span class="mail-btn">Vezi în aplicație</span></div>'}</div>
  <div class="mail-foot">Asociația de Proprietari Avalon Estate · Ai primit acest email pentru că ai cont în aplicația asociației.</div></div></div>`;
}
async function latestAnnHTML() {
  const [{ data: ann }, { data: reads }] = await Promise.all([sb.from('announcements').select('*').order('published_at', { ascending: false }).limit(20), sb.from('announcement_reads').select('announcement_id').eq('person_id', S.me.id)]);
  const a = (ann || []).filter(annFor)[0]; if (!a) return '';
  const isNew = !(reads || []).some(r => r.announcement_id === a.id);
  return `<a class="card ann-banner" href="#anunturi">${ic('mega')}<span class="grow stack" style="gap:2px"><span class="row" style="gap:8px">${isNew ? '<span class="chip bad">nou</span>' : ''}<span class="chip ${ANN_CATS[a.kind] || 'line'}">${esc(a.kind)}</span><span class="muted small">${fmtDate(a.published_at)}</span></span><b class="title">${esc(a.title_ro)}</b></span><span class="muted small">Toate anunțurile ›</span></a>`;
}
const docRow = d => `<div class="item">${ic('doc')}<span class="grow stack" style="gap:2px"><span class="title">${esc(d.name)}</span><span class="muted small">${esc(d.category)} · adăugat ${fmtDate(d.created_at)}</span></span>${d.url?.startsWith('storage:') ? `<button class="btn quiet sm" data-act="doc-open" data-p="${esc(d.url.slice(8))}">Deschide</button>` : d.url ? `<a class="btn quiet sm" href="${esc(d.url)}" target="_blank" rel="noopener">Deschide</a>` : '<span class="muted small">fără fișier</span>'}${isAdmin() && S.route === 'documente' ? `<button class="btn quiet sm" data-act="doc-del" data-id="${d.id}" data-p="${d.url?.startsWith('storage:') ? esc(d.url.slice(8)) : ''}" aria-label="Șterge ${esc(d.name)}">${ic('trash')}</button>` : ''}</div>`;
const tRow = t => `<a class="item" href="#tichete/${t.id}" style="color:inherit;text-decoration:none"><span class="grow stack" style="gap:2px"><span class="title">${esc(t.title)}</span><span class="muted small">${esc(t.code || '')}${t.unit_code ? ' · ' + esc(t.unit_code) : ''} · ${esc(t.category || '')} · ${fmtDate(t.updated_at || t.created_at)}${isAdmin() && t.author_name ? ' · ' + esc(t.author_name) : ''}</span></span>${stChip(t.status)}</a>`;
const rRow = r => `<div class="item"><b style="font-family:var(--display);font-size:24px;width:44px">${esc(r.spot_code)}</b><span class="grow stack" style="gap:2px"><span>${timeTxt(r)} · ${esc(r.unit_code)}</span><span class="muted small">${esc(r.guest_name || 'Vizitator')}${r.source === 'link' ? ' · prin link' : ''}${r.entered_at ? ` · intrat ${hhmm(r.entered_at)}${r.exited_at ? `, ieșit ${hhmm(r.exited_at)}` : ''}` : ''}</span></span>${plateHTML(r.plate)}</div>`;

/* acasă – locatar */
async function pageHome() {
  if (isGuardOnly()) return pageGuard();
  if (isAdmin()) return pageHomeAdmin();
  const now = new Date(), nowI = now.toISOString(), codes = S.units.map(u => u.code);
  const [res, tic, docs, occ, veh, banner] = await Promise.all([
    codes.length ? sb.from('reservations').select('*').in('unit_code', codes).eq('status', 'activa').gt('ends_at', nowI).order('starts_at').limit(1) : Promise.resolve({ data: [] }),
    sb.from('tickets').select('id, code, title, status, category, unit_code, updated_at, created_at').order('updated_at', { ascending: false }).limit(100),
    sb.from('documents').select('*').order('created_at', { ascending: false }).limit(3),
    sb.rpc('spot_occupancy', { p_from: nowI, p_to: new Date(now.getTime() + 60000).toISOString() }),
    sb.from('vehicles').select('id', { count: 'exact', head: true }).eq('person_id', S.me.id),
    latestAnnHTML()
  ]);
  const next = (res.data || [])[0], openT = (tic.data || []).filter(t => OPEN_ST.includes(t.status));
  const busy = new Set((occ.data || []).filter(o => new Date(o.starts_at) <= now && new Date(o.ends_at) > now).map(o => o.spot_code));
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Bună, ${esc(S.me.first_name || '')}!</h1><p class="muted">${esc(S.units.map(u => u.code).join(', ') || 'Nicio unitate legată')} · ${fmtDate(now)}</p></div>
   <div class="row"><a class="btn" href="#parcare">${ic('parking')} Rezervă un loc</a><a class="btn ghost" href="#tichet-nou">${ic('plus')} Tichet nou</a></div></div>
  ${banner}
  <div class="grid g3 stats">
   <div class="card stat"><span class="muted small">Locuri vizitatori libere acum</span><span class="n">${SPOTS_N - busy.size}<span class="muted" style="font-size:26px"> / ${SPOTS_N}</span></span></div>
   <div class="card stat"><span class="muted small">Tichetele mele deschise</span><span class="n">${openT.length}</span></div>
   <div class="card stat"><span class="muted small">Mașini înregistrate</span><span class="n">${veh.count ?? 0}</span></div>
  </div>
  <div class="grid g2">
   <div class="card stack"><div class="row between"><h3>Următoarea rezervare</h3><a class="btn quiet sm" href="#istoric">Istoric</a></div>
    ${next ? `<div class="row" style="gap:14px"><span style="font-family:var(--display);font-size:44px;line-height:1;color:var(--accent);min-width:64px;text-align:center;border:2px solid var(--accent);border-radius:12px;padding:10px 6px;background:var(--accent-soft)">${esc(next.spot_code)}</span><div class="stack" style="gap:4px"><span>${timeTxt(next)}</span>${plateHTML(next.plate)}<span class="muted small">${esc(next.guest_name || 'Vizitator')}</span></div></div>` : `<p class="muted">Nu ai nicio rezervare viitoare.</p><a class="btn ghost" href="#parcare" style="align-self:flex-start">Rezervă un loc</a>`}
   </div>
   <div class="card stack"><div class="row between"><h3>Tichete</h3><a class="btn quiet sm" href="#tichete">Toate</a></div>
    <div class="list">${(tic.data || []).slice(0, 3).map(tRow).join('') || '<p class="muted">Nu ai tichete.</p>'}</div></div>
  </div>
  <div class="card stack"><div class="row between"><h3>Documente adăugate recent</h3><a class="btn quiet sm" href="#documente">Toate documentele</a></div>
   <div class="list">${(docs.data || []).map(docRow).join('') || '<p class="muted">Niciun document încă.</p>'}</div></div>`;
}

/* acasă – administrație */
async function pageHomeAdmin() {
  const now = new Date(), d0 = dayStart(now), d1 = new Date(d0.getTime() + 86400000), [p0, p1] = monthRange(prevMonth()), [m0, m1] = monthRange(monthKeyOf(now));
  const cnt = st => sb.from('tickets').select('id', { count: 'exact', head: true }).eq('status', st);
  const [nou, lucru, tick, today, prevR, curR, pend, sync, banner] = await Promise.all([
    cnt('nou'), cnt('in_lucru'),
    sb.from('tickets').select('id, code, title, status, category, unit_code, updated_at, author_name').in('status', ['nou', 'in_lucru']).order('updated_at', { ascending: false }).limit(5),
    sb.from('reservations').select('*').eq('status', 'activa').lt('starts_at', d1.toISOString()).or(`ends_at.gt.${d0.toISOString()},visitor_inside.eq.true`).order('starts_at'),
    sb.from('reservations').select('*').eq('status', 'activa').gte('starts_at', p0.toISOString()).lt('starts_at', p1.toISOString()).limit(5000),
    sb.from('reservations').select('*').eq('status', 'activa').gte('starts_at', m0.toISOString()).lt('starts_at', m1.toISOString()).limit(5000),
    sb.from('people').select('id', { count: 'exact', head: true }).eq('status', 'in_asteptare'),
    sb.from('metrici_sync').select('*').maybeSingle(),
    latestAnnHTML().catch(() => '')
  ]);
  await tarif();
  const td = today.data || [], inNow = td.filter(r => r.visitor_inside || (!r.metrici_action_id && !r.entered_at && new Date(r.starts_at) <= now && new Date(r.ends_at) > now) || (r.entered_at && !r.exited_at)), later = td.filter(r => new Date(r.starts_at) > now);
  const prevSum = (prevR.data || []).reduce((a, r) => a + resCost(r), 0), cr = curR.data || [], mh = cr.reduce((a, r) => a + resHours(r).h, 0);
  const sy = sync.data, ago = sy?.last_ok ? Math.round((now - new Date(sy.last_ok)) / 1000) : null;
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Panou administrație</h1><p class="muted">Avalon Estate · ${fmtDate(now)}</p></div>
   <div class="row"><a class="btn" href="#tichete">${ic('ticket')} Tichete</a><a class="btn ghost" href="#raport">${ic('chart')} Raport parcări vizitatori</a><a class="btn ghost" href="#anunturi">${ic('mega')} Anunț nou</a><a class="btn ghost" href="#documente">${ic('plus')} Document</a></div></div>
  ${banner}
  <div class="grid stats stats4">
   <div class="card stat"><span class="muted small">Tichete noi</span><span class="n" style="color:${nou.count ? 'var(--warn)' : 'inherit'}">${nou.count ?? 0}</span></div>
   <div class="card stat"><span class="muted small">Tichete în lucru</span><span class="n">${lucru.count ?? 0}</span></div>
   <div class="card stat"><span class="muted small">Vizitatori în parcare acum</span><span class="n">${inNow.length}<span class="muted" style="font-size:24px"> / ${SPOTS_N}</span></span></div>
   <div class="card stat"><span class="muted small">De facturat pe ${LUNI[p0.getMonth()]}</span><span class="n" style="font-size:34px">${lei(prevSum)}</span></div>
  </div>
  ${pend.count ? `<a class="card ann-banner" href="#utilizatori">${ic('users')}<span class="grow"><b>${pend.count} ${pend.count === 1 ? 'cerere nouă' : 'cereri noi'} de acces</b><br><span class="muted small">Locatari care au adăugat membri în apartament și așteaptă aprobarea</span></span><span class="muted small">Vezi cererile ›</span></a>` : ''}
  <div class="grid g2">
   <div class="card stack"><div class="row between"><h3>De rezolvat</h3><a class="btn quiet sm" href="#tichete">Toate tichetele</a></div>
    <div class="list">${(tick.data || []).map(tRow).join('') || '<p class="muted">Niciun tichet deschis.</p>'}</div></div>
   <div class="card stack"><div class="row between"><h3>Parcare vizitatori azi</h3><a class="btn quiet sm" href="#rezervari">Rezervări</a></div>
    <span class="muted small">În parcare acum (${inNow.length})</span><div class="list">${inNow.map(rRow).join('') || '<p class="muted small">Nicio mașină de vizitator acum.</p>'}</div>
    <span class="muted small">Urmează azi (${later.length})</span><div class="list">${later.map(rRow).join('') || '<p class="muted small">Nicio rezervare mai târziu azi.</p>'}</div></div>
  </div>
  <div class="grid g2">
   <div class="card stack"><h3>Luna aceasta</h3><div class="row" style="gap:28px"><div class="stat"><span class="muted small">Vizite</span><span class="n" style="font-size:36px">${cr.length}</span></div><div class="stat"><span class="muted small">Ore</span><span class="n" style="font-size:36px">${fh(mh)}</span></div><div class="stat"><span class="muted small">Apartamente cu vizitatori</span><span class="n" style="font-size:36px">${new Set(cr.map(r => r.unit_code)).size}</span></div></div>
    <a class="btn ghost" href="#raport" style="align-self:flex-start">Deschide raportul</a></div>
   <div class="card stack"><h3>Legătura cu bariera (Metrici)</h3>
    <p class="muted small">${sy ? (sy.ok ? `Funcționează. Ultima verificare acum ${ago} secunde.` : `<span class="err">Eroare: ${esc(sy.message || '')}</span>`) : 'Fără date.'}${sy?.message && sy.ok ? ` <span class="err">${esc(sy.message)}</span>` : ''}</p>
    <div class="row">${sy?.details ? Object.entries(sy.details).map(([k, v]) => `<span class="chip line">${esc(k)}: ${esc(v)} vizitatori / fără cont</span>`).join('') : ''}<span class="chip line">${td.length} rezervări azi</span></div></div>
  </div>`;
}

/* anunțuri */
async function pageAnn() {
  const [{ data, error }, { data: reads }] = await Promise.all([sb.from('announcements').select('*').order('published_at', { ascending: false }).limit(200), sb.from('announcement_reads').select('announcement_id, person_id')]);
  if (error) throw error;
  const admin = isAdmin(), mine = new Set((reads || []).filter(r => r.person_id === S.me.id).map(r => r.announcement_id));
  const list = (data || []).filter(a => admin || annFor(a));
  const aq = norm(S.cache.aq || ''), shown = aq ? list.filter(a => aq.split(' ').every(w => norm([a.title_ro, a.body_ro, a.kind, audTxt(a)].join(' ')).includes(w))) : list;
  const unread = list.filter(a => !mine.has(a.id)).map(a => a.id);
  if (unread.length) setTimeout(() => sb.from('announcement_reads').upsert(unread.map(id => ({ announcement_id: id, person_id: S.me.id })), { onConflict: 'announcement_id,person_id', ignoreDuplicates: true }).then(() => {}), 0);
  const readCount = id => (reads || []).filter(r => r.announcement_id === id).length;
  const card = a => { const isNew = !mine.has(a.id); return `<article class="card stack ann ${isNew && !admin ? 'is-new' : ''}">
    <div class="row between"><div class="row" style="gap:8px">${isNew && !admin ? '<span class="chip bad">nou</span>' : ''}<span class="chip ${ANN_CATS[a.kind] || 'line'}">${esc(a.kind)}</span><span class="muted small">${fmtDate(a.published_at)}, ora ${fmtTime(a.published_at)} · ${esc(audTxt(a))}</span>${admin ? `<span class="chip line">${a.in_app === false ? 'doar email' : a.by_email ? 'aplicație + email' : 'doar aplicație'}</span>` : ''}</div>
    ${admin ? `<button class="btn quiet sm" data-act="ann-del" data-id="${a.id}" aria-label="Șterge anunțul">${ic('trash')}</button>` : ''}</div>
    <h3>${esc(a.title_ro)}</h3><div class="ann-body">${mdLite(a.body_ro)}</div>
    ${admin && a.by_email ? `<div class="row"><button class="btn quiet sm" data-act="ann-mail" data-id="${a.id}">${S.cache.annMail === a.id ? 'Ascunde emailul' : 'Vezi emailul'}</button></div>${S.cache.annMail === a.id ? `<div class="preview">${emailHTML(a)}</div>` : ''}` : ''}
    ${admin ? `<span class="muted small">Citit de ${readCount(a.id)} ${readCount(a.id) === 1 ? 'persoană' : 'persoane'}</span>` : ''}</article>`; };
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Anunțuri</h1><p class="muted">${admin ? 'Trimite un mesaj tuturor locatarilor sau doar unui bloc. Îl văd în aplicație, la Anunțuri și pe pagina de start.' : 'Mesajele de la administrație și comitet: evenimente, lucrări, convocări.'}</p></div></div>
  ${admin ? await composerHTML() + '<h2>Trimise</h2>' : ''}
  <label class="gsearch" style="max-width:none" for="ann-q">${ic('search')}<input id="ann-q" type="search" value="${esc(S.cache.aq || '')}" placeholder="Caută în anunțuri, după titlu, text, tip sau bloc" autocomplete="off"></label>
  <div class="stack" style="gap:16px">${shown.map(card).join('') || (S.cache.aq ? `<p class="muted">Niciun anunț pentru „${esc(S.cache.aq)}”.</p>` : '<p class="muted">Niciun anunț încă.</p>')}</div>`;
}
const annDraft = () => S.cache.annDraft || (S.cache.annDraft = { title: '', body: '', kind: 'Informare', aud: '', app: true, email: false });
async function composerHTML() {
  const d = annDraft(), blocks = [...new Set((await unitsList()).map(u => u.building).filter(Boolean))].sort();
  return `<div class="composer"><form class="card stack" id="an-form"><h3>Anunț nou</h3>
   <div class="form-grid"><label class="f">Tip<select id="an-kind" class="an-f">${Object.keys(ANN_CATS).map(c => `<option ${d.kind === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="f">Către<select id="an-aud" class="an-f"><option value="">Toți locatarii</option>${blocks.map(b => `<option value="${esc(b)}" ${d.aud === b ? 'selected' : ''}>Bloc ${esc(b)}</option>`).join('')}</select></label></div>
   <label class="f">Titlu<input id="an-title" class="an-f" required maxlength="120" placeholder="ex. Curățenie generală în parcarea subterană" value="${esc(d.title)}"></label>
   <div class="f"><span>Mesaj</span><div class="toolbar" role="toolbar" aria-label="Formatare">
    <button type="button" data-act="fmt" data-f="b" title="Îngroșat"><b>B</b></button><button type="button" data-act="fmt" data-f="i" title="Cursiv"><i>I</i></button><button type="button" data-act="fmt" data-f="ul" title="Listă">• Listă</button>
    <button type="button" data-act="emoji-toggle" aria-expanded="${!!S.cache.emojiOpen}">😀 Emoji</button></div>
    <div class="emojis" id="emojis" ${S.cache.emojiOpen ? '' : 'hidden'}>${EMOJI.map(e => `<button type="button" data-act="emoji" data-e="${e}" aria-label="Inserează ${e}">${e}</button>`).join('')}</div>
    <textarea id="an-body" class="an-f bigtext" required placeholder="Ce trebuie să știe locatarii. **text** = îngroșat, - la început de rând = listă">${esc(d.body)}</textarea></div>
   <div class="stack" style="gap:2px"><span class="small muted">Unde trimiți anunțul</span>
    <label class="sw" for="an-app"><span>Trimite în aplicație</span><input type="checkbox" id="an-app" class="an-f" ${d.app ? 'checked' : ''}></label>
    <label class="sw" for="an-email"><span>Trimite și pe email, cu șablonul de alături</span><input type="checkbox" id="an-email" class="an-f" ${d.email ? 'checked' : ''}></label>
    <p class="err" id="an-err"></p></div>
   <div class="row"><button class="btn" type="submit">${ic('mega')} Trimite anunțul</button><span class="muted small">Trimiterea pe email se activează după ce conectăm adresa asociației la trimiterea în masă; până atunci anunțul apare în aplicație.</span></div></form>
  <div class="preview"><div class="row between"><b class="small muted">PREVIZUALIZARE EMAIL</b><span class="chip line">se actualizează pe măsură ce scrii</span></div><div id="ann-preview">${emailHTML({ title_ro: d.title, body_ro: d.body, in_app: d.app })}</div></div></div>`;
}
function readAnnDraft() {
  const d = annDraft(), g = id => document.getElementById(id); if (!g('an-title')) return d;
  Object.assign(d, { title: g('an-title').value, body: g('an-body').value, kind: g('an-kind').value, aud: g('an-aud').value, app: g('an-app').checked, email: g('an-email').checked });
  const p = g('ann-preview'); if (p) p.innerHTML = emailHTML({ title_ro: d.title, body_ro: d.body, in_app: d.app }); return d;
}
function insertAt(el, before, after = '', ph = '') { const a = el.selectionStart, b = el.selectionEnd, sel = el.value.slice(a, b) || ph; el.value = el.value.slice(0, a) + before + sel + after + el.value.slice(b); el.focus(); el.setSelectionRange(a + before.length, a + before.length + sel.length); readAnnDraft(); }
async function onAnn(e) {
  e.preventDefault(); const d = readAnnDraft(), err = document.getElementById('an-err');
  if (!d.app && !d.email) { err.textContent = 'Alege cel puțin un canal: aplicație sau email.'; return; }
  const { error } = await sb.from('announcements').insert({ kind: d.kind, title_ro: d.title.trim(), body_ro: d.body.trim(), target_blocks: d.aud ? [d.aud] : null, in_app: d.app, by_email: d.email, created_by: S.me.id });
  if (error) { err.textContent = errMsg(error); return; }
  S.cache.annDraft = null; toast('Anunț publicat.'); render();
}

/* tichete */
const TK_CATS = ['Spatiu comun', 'Administrativ', 'Financiar', 'Garantii', 'Altele'];
async function pageTickets() {
  const f = S.cache.tf2 || 'deschise', s = (S.cache.tq || '').trim(), admin = isAdmin();
  let q = sb.from('tickets').select('id, code, title, status, category, unit_code, updated_at, created_at, author_name').order('updated_at', { ascending: false }).limit(300);
  if (f === 'nou') q = q.eq('status', 'nou'); else if (f === 'in_lucru') q = q.in('status', ['in_lucru', 'in_asteptare']); else if (f === 'deschise') q = q.in('status', OPEN_ST); else if (f === 'rezolvate') q = q.in('status', ['rezolvat', 'inchis', 'respins']);
  if (s) { const x = s.replace(/[%,()]/g, ' '); q = q.or(`title.ilike.%${x}%,code.ilike.%${x}%,unit_code.ilike.%${x}%,author_name.ilike.%${x}%`); }
  const { data, error } = await q; if (error) throw error;
  const detail = S.param ? await ticketDetail(S.param) : '';
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Tichete</h1><p class="muted">${admin ? 'Toate sesizările locatarilor. Schimbă statusul și răspunde direct din tichet.' : 'Scrie administrației ce problemă ai. Primești răspunsul aici.'}</p></div>
   ${S.cache.newTicket ? '' : `<button class="btn" data-act="new-ticket">${ic('plus')} Tichet nou</button>`}</div>
  ${S.cache.newTicket ? ticketForm() : ''}${detail}
  <div class="card stack">
   <label class="gsearch" style="max-width:none" for="t-q">${ic('search')}<input id="t-q" type="search" value="${esc(S.cache.tq || '')}" placeholder="${admin ? 'Caută după titlu, cod, apartament sau nume' : 'Caută în tichetele tale'}" autocomplete="off"></label>
   <div class="row">${[['deschise', 'Deschise'], ['nou', 'Noi'], ['in_lucru', 'În lucru'], ['rezolvate', 'Rezolvate / închise'], ['toate', 'Toate']].map(([k, l]) => `<button class="chip pick" aria-pressed="${f === k}" data-act="tfilter" data-k="${k}">${l}</button>`).join('')}</div>
   <div class="list">${(data || []).map(tRow).join('') || '<p class="muted" style="padding:12px 4px">Niciun tichet aici.</p>'}</div>
   <p class="muted small">${(data || []).length}${(data || []).length === 300 ? '+ (se afișează cele mai recente 300 – folosește căutarea)' : ''} tichete</p></div>`;
}
function ticketForm() {
  return `<form class="card stack" id="nt-form"><div class="row between"><h3>Tichet nou</h3><button type="button" class="btn quiet sm" data-act="cancel-ticket">Renunță</button></div>
   <div class="form-grid">
    <label class="f full">Pe scurt, care e problema?<input id="nt-title" required maxlength="140" placeholder="ex. Becul de pe scară nu merge"></label>
    <label class="f">Categorie<select id="nt-cat">${TK_CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
    <label class="f">Unitate<select id="nt-unit">${S.units.map(u => `<option>${esc(u.code)}</option>`).join('')}<option value="">Spațiu comun / fără unitate</option></select></label>
    <label class="f full">Detalii<textarea id="nt-body" class="bigtext" required placeholder="Unde exact, de când, ce ai observat"></textarea></label>
   </div>
   <div class="row"><button class="btn" type="submit">Trimite tichetul</button><span class="muted small">Administrația primește tichetul imediat.</span><span class="err" id="nt-err"></span></div></form>`;
}
async function ticketDetail(id) {
  const [{ data: t }, { data: msgs }] = await Promise.all([sb.from('tickets').select('*').eq('id', id).maybeSingle(), sb.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at')]);
  if (!t) return `<div class="card"><p class="muted">Tichetul nu există sau nu ai acces la el.</p></div>`;
  const thread = (msgs || []).map(m => {
    if (m.kind !== 'mesaj' && m.kind !== 'nota') return `<div class="msg sys">${fmtDT(m.created_at)} · ${esc(m.author_name || '')}: ${m.kind === 'status' ? 'status → ' : esc(m.kind) + ' → '}${esc(m.body)}</div>`;
    const mine = isAdmin() ? m.from_admin : m.author_id === S.me.id;
    return `<div class="msg ${mine ? 'me' : ''} ${m.from_admin ? 'adm' : 'loc'} ${m.internal ? 'internal' : ''}"><div class="who">${m.from_admin ? 'Administrație' : esc(m.author_name || (t.unit_code ? 'Ap. ' + t.unit_code : ''))}${m.internal ? ' · notă internă' : ''} · ${fmtDT(m.created_at)}</div>${esc(String(m.body || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim())}</div>`;
  }).join('');
  return `<div class="card stack" id="ticket-detail"><div class="row between"><div class="stack" style="gap:2px"><h3>${esc(t.title)}</h3><span class="muted small">${esc(t.code || '')} · ${esc(t.category || '')} · deschis ${fmtDate(t.created_at)}${t.unit_code ? ' · ' + esc(t.unit_code) : ''}${t.author_name ? ' · ' + esc(t.author_name) : ''}</span></div>
   <div class="row">${isAdmin() ? `<label class="f" style="flex-direction:row;align-items:center;gap:6px">Status <select id="tk-status" data-id="${t.id}">${Object.entries(TICKET_ST).map(([k, [l]]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : stChip(t.status)}<a class="btn quiet sm" href="#tichete" aria-label="Închide">${ic('x')}</a></div></div>
   <div class="thread">${thread || '<p class="muted">Niciun mesaj.</p>'}</div>
   <form class="stack" id="reply-form" data-id="${t.id}" style="gap:8px"><label class="f"><span class="muted small">Răspuns</span><textarea id="reply-text" class="bigtext" placeholder="Scrie un mesaj" required></textarea></label>
    <div class="row"><button class="btn" type="submit">Trimite</button>${isAdmin() ? '<label class="row small"><input type="checkbox" id="reply-int"> notă internă (doar administrația o vede)</label>' : '<span class="muted small">Caseta se poate mări trăgând de colțul din dreapta jos.</span>'}</div></form></div>`;
}
async function onReply(e) {
  e.preventDefault();
  const id = e.target.dataset.id, body = document.getElementById('reply-text').value.trim(); if (!body) return;
  const internal = !!document.getElementById('reply-int')?.checked;
  const { error } = await sb.from('ticket_messages').insert({ ticket_id: id, author_id: S.me.id, from_admin: isAdmin(), body, kind: internal ? 'nota' : 'mesaj', internal, author_name: fullName(S.me), author_role: isAdmin() ? 'A' : 'T' });
  if (error) return toast(errMsg(error));
  if (isAdmin()) await sb.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', id);
  toast('Mesaj trimis.'); render();
}
async function onNewTicket(e) {
  e.preventDefault();
  const unit = document.getElementById('nt-unit').value || null, err = document.getElementById('nt-err');
  const { data, error } = await sb.from('tickets').insert({ unit_code: unit, created_by: S.me.id, author_name: fullName(S.me), category: document.getElementById('nt-cat').value, title: document.getElementById('nt-title').value.trim(), status: 'nou', building: unit ? blockOf(unit) : null }).select('id').single();
  if (error) { err.textContent = errMsg(error); return; }
  await sb.from('ticket_messages').insert({ ticket_id: data.id, author_id: S.me.id, from_admin: isAdmin(), body: document.getElementById('nt-body').value.trim(), kind: 'mesaj', author_name: fullName(S.me), author_role: isAdmin() ? 'A' : 'T' });
  S.cache.newTicket = false; toast('Tichetul a fost trimis.'); location.hash = `#tichete/${data.id}`;
}

/* documente */
const DCATS = ['Toate', 'Regulamente', 'Ședințe', 'Hotărâri', 'Contracte', 'Financiar', 'Formulare', 'Informări', 'Altele'];
async function pageDocs() {
  const { data, error } = await sb.from('documents').select('*').order('created_at', { ascending: false }); if (error) throw error;
  const cat = S.cache.dcat || 'Toate', q = norm(S.cache.dq || '');
  const m = (data || []).filter(d => (cat === 'Toate' || d.category === cat) && (!q || q.split(' ').every(w => norm(`${d.name} ${d.tags || ''} ${d.category}`).includes(w))));
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Documente</h1><p class="muted">Regulamente, procese-verbale, hotărâri, contracte și formulare. Aici le găsești după nume.</p></div>${isAdmin() && !S.cache.newDoc ? `<button class="btn" data-act="new-doc">${ic('plus')} Adaugă document</button>` : ''}</div>
  ${S.cache.newDoc ? `<form class="card stack" id="doc-form"><div class="row between"><h3>Document nou</h3><button type="button" class="btn quiet sm" data-act="cancel-doc">Renunță</button></div>
   <div class="form-grid"><label class="f full">Nume<input id="dc-name" required placeholder="ex. Proces-verbal AG – noiembrie 2026"></label>
   <label class="f">Categorie<select id="dc-cat">${DCATS.slice(1).map(c => `<option>${c}</option>`).join('')}</select></label>
   <label class="f">Fișier (PDF, max 50 MB)<input id="dc-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"></label>
   <label class="f">sau link (Google Drive / OneDrive)<input id="dc-link" type="url" placeholder="https://..."></label>
   <label class="f full">Cuvinte-cheie (opțional, ajută la căutare)<input id="dc-tags" placeholder="ex. pv adunare generala"></label></div>
   <div class="row"><button class="btn" type="submit">Salvează</button><span class="err" id="dc-err"></span></div></form>` : ''}
  <div class="card stack">
   <label class="gsearch" style="max-width:none" for="doc-q">${ic('search')}<input id="doc-q" type="search" placeholder="Caută după nume, ex. ROI, proces-verbal, contract" value="${esc(S.cache.dq || '')}" autocomplete="off"></label>
   <div class="row">${DCATS.map(c => `<button class="chip pick" aria-pressed="${cat === c}" data-act="dcat" data-c="${c}">${c}</button>`).join('')}</div>
   <div class="list" id="doc-list">${m.map(docRow).join('') || `<p class="muted" style="padding:12px 4px">${(data || []).length ? 'Niciun document pentru căutarea ta.' : 'Documentele din arhiva Sigtree vor fi încărcate aici în curând.'}</p>`}</div></div>`;
}
async function onDoc(e) {
  e.preventDefault(); const v = id => document.getElementById(id).value.trim() || null;
  const errEl = document.getElementById('dc-err'), f = document.getElementById('dc-file').files[0];
  let url = v('dc-link');
  if (f) {
    if (f.size > 50 * 1024 * 1024) { errEl.textContent = 'Fișierul are peste 50 MB.'; return; }
    const ext = (f.name.match(/\.[a-z0-9]+$/i) || ['.pdf'])[0].toLowerCase();
    const base = norm(v('dc-name') || f.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'document';
    const path = `${new Date().toISOString().slice(0, 10)}_${base}_${Date.now().toString(36)}${ext}`;
    errEl.textContent = 'Se încarcă...';
    const up = await sb.storage.from('documente').upload(path, f, { contentType: f.type || 'application/pdf' });
    if (up.error) { errEl.textContent = errMsg(up.error); return; }
    url = 'storage:' + path;
  }
  if (!url) { errEl.textContent = 'Alege un fișier sau pune un link.'; return; }
  const { error } = await sb.from('documents').insert({ name: v('dc-name'), category: v('dc-cat'), url, tags: v('dc-tags'), created_by: S.me.id });
  if (error) { errEl.textContent = errMsg(error); if (f) await sb.storage.from('documente').remove([url.slice(8)]); return; }
  S.cache.newDoc = false; toast('Document adăugat.'); render();
}

/* contacte */
async function pageContacts() {
  const { data, error } = await sb.from('contacts').select('*').order('section').order('sort').order('role'); if (error) throw error;
  S.cache.contacts = data || [];
  const groups = [...new Set(S.cache.contacts.map(c => c.section))];
  const card = c => `<div class="card contact"><span class="role-l">${esc(c.role)}</span><span class="name">${esc(c.name)}</span>
   ${c.phone ? `<span class="cline">${ic('phone')}<a class="v" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a><button class="btn quiet sm" data-act="copy-t" data-t="${esc(c.phone)}">Copiază</button></span>` : ''}
   ${c.email ? `<span class="cline">${ic('mail')}<a class="v" style="overflow-wrap:anywhere" href="mailto:${esc(c.email)}">${esc(c.email)}</a><button class="btn quiet sm" data-act="copy-t" data-t="${esc(c.email)}">Copiază</button></span>` : ''}
   ${c.note ? `<span class="muted small">${esc(c.note)}</span>` : ''}
   ${isAdmin() ? `<div class="row" style="gap:6px;margin-top:auto;padding-top:6px"><button class="btn quiet sm" data-act="c-edit" data-id="${c.id}">Editează</button><button class="btn quiet sm" data-act="ct-del" data-id="${c.id}" aria-label="Șterge ${esc(c.role)}">${ic('trash')}</button></div>` : ''}</div>`;
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Contacte</h1><p class="muted">Persoanele și serviciile importante ale asociației.${isAdmin() ? ' Ce modifici aici apare imediat la toți locatarii.' : ''}</p></div>${isAdmin() ? `<button class="btn" data-act="c-edit" data-id="new">${ic('plus')} Adaugă contact</button>` : ''}</div>
  ${groups.map(g => `<section class="stack"><h2>${esc(g)}</h2><div class="grid g3">${S.cache.contacts.filter(c => c.section === g).map(card).join('')}</div></section>`).join('') || '<p class="muted">Contactele vor fi adăugate în curând.</p>'}`;
}
function contactModal(id) {
  const c = id === 'new' ? { section: '', role: '', name: '', phone: '', email: '', note: '' } : (S.cache.contacts || []).find(x => x.id === id); if (!c) return;
  const groups = [...new Set((S.cache.contacts || []).map(x => x.section))];
  openModal(`<form class="modal pkmodal" id="ct-form" data-id="${id}" role="dialog" aria-modal="true" aria-labelledby="c-h"><div class="row between"><h2 id="c-h">${id === 'new' ? 'Contact nou' : 'Editează contactul'}</h2><button type="button" class="btn quiet sm" data-act="m-close" aria-label="Închide">${ic('x')}</button></div>
   <div class="form-grid">
    <label class="f">Secțiune<input id="ct-sec" list="c-groups" required value="${esc(c.section)}" placeholder="ex. Servicii"><datalist id="c-groups">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist></label>
    <label class="f">Rol<input id="ct-role" required value="${esc(c.role)}" placeholder="ex. Instalator"></label>
    <label class="f">Nume<input id="ct-name" required value="${esc(c.name)}" placeholder="ex. Ion Popescu sau firma"></label>
    <label class="f">Telefon<input id="ct-phone" type="tel" value="${esc(c.phone || '')}" placeholder="07xx xxx xxx"></label>
    <label class="f">E-mail<input id="ct-email" type="email" value="${esc(c.email || '')}" placeholder="nume@exemplu.ro"></label>
    <label class="f">Notă (program, când suni)<input id="ct-note" value="${esc(c.note || '')}" placeholder="ex. Luni–vineri, 9:00–17:00"></label></div>
   <p class="err" id="ct-err"></p><p class="muted small">Modificarea apare imediat la toți locatarii.</p>
   <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="m-close">Renunță</button><button class="btn" type="submit">${id === 'new' ? ic('plus') + ' Adaugă contactul' : 'Salvează'}</button></div></form>`, w => w.querySelector('#ct-form').addEventListener('submit', onContact));
}
async function onContact(e) {
  e.preventDefault(); const id = e.target.dataset.id, v = k => document.getElementById(k).value.trim() || null;
  const row = { section: v('ct-sec'), role: v('ct-role'), name: v('ct-name'), phone: v('ct-phone'), email: v('ct-email'), note: v('ct-note'), updated_at: new Date().toISOString() };
  const { error } = id === 'new' ? await sb.from('contacts').insert(row) : await sb.from('contacts').update(row).eq('id', id);
  if (error) { document.getElementById('ct-err').textContent = errMsg(error); return; }
  closeModal(); toast(id === 'new' ? 'Contact adăugat.' : 'Contact salvat.'); render();
}

/* fereastră (modal) generică */
function openModal(html, after) { closeModal(); const w = document.createElement('div'); w.id = 'm-wrap'; w.innerHTML = `<div class="modal-bg" data-act="m-close"></div>${html}`; document.body.appendChild(w); after?.(w); w.querySelector('input,select,textarea,button')?.focus(); }
function closeModal() { document.getElementById('m-wrap')?.remove(); }

/* contul meu */
function pageProfile() {
  const me = S.me, nt = me.notif || {}, ACC = { locatar: 'Locatar', admin: 'Admin', paza: 'Pază' };
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Contul meu</h1><p class="muted">Datele tale și notificările.</p></div></div>
  <div class="grid g2"><div class="stack" style="gap:16px">
   <form class="card stack" id="pf-form"><h3>Date de contact</h3>
    <div class="form-grid"><label class="f">Prenume<input id="pf-fn" value="${esc(me.first_name)}" required autocomplete="given-name"></label><label class="f">Nume<input id="pf-ln" value="${esc(me.last_name)}" required autocomplete="family-name"></label>
    <label class="f full">Telefon<input id="pf-ph" type="tel" value="${esc(me.phone || '')}" autocomplete="tel"></label></div>
    <div class="stack" style="gap:6px"><span class="muted small">E-mail (contul de logare)</span>
     <div class="row between" style="gap:8px"><b style="overflow-wrap:anywhere">${esc(me.email)}</b><button type="button" class="btn quiet sm" data-act="em-open">Schimbă e-mailul</button></div>
     ${S.session?.user?.new_email ? `<div class="note" style="background:var(--gold-soft)">${ic('mail')}<span>Am trimis un link de confirmare la <b>${esc(S.session.user.new_email)}</b>. E-mailul se schimbă după ce apeși pe link.</span></div>` : ''}</div>
    <div class="row"><button class="btn" type="submit">Salvează</button><span class="muted small">Numele și telefonul se schimbă imediat.</span></div></form>
   <div class="card stack"><h3>Apartament și acces</h3>
    ${S.units.map(u => `<div class="form-grid"><label class="f">Unitate<input value="${esc(u.code)}" disabled></label><label class="f">Relația cu unitatea<input value="${esc(REL[u.relation] || '')}" disabled></label></div>`).join('') || '<p class="muted small">Nicio unitate legată.</p>'}
    <label class="f">Acces în aplicație<input value="${ACC[me.access] || me.access}" disabled></label>
    <p class="muted small">Le poate schimba doar administrația. Dacă ceva nu e corect, deschide un tichet.</p></div>
  </div><div class="stack" style="gap:16px">
   <div class="card stack"><h3>Notificări pe email</h3>
    ${[['anunturi', 'Primesc anunțurile și pe email'], ['tichete', 'Răspunsuri la tichetele mele'], ['parcare', 'Confirmări de rezervare'], ['documente', 'Documente noi']].map(([k, l]) => `<label class="sw" for="nt-${k}"><span>${l}</span><input type="checkbox" id="nt-${k}" class="nt-sw" data-k="${k}" ${nt[k] ? 'checked' : ''}></label>`).join('')}
    <p class="muted small">Preferința se salvează acum; emailurile automate pornesc odată cu trimiterea pe email din aplicație.</p></div>
   <div class="card stack"><h3>Parolă</h3><p class="muted small">Îți alegi o parolă nouă aici, fără email.</p><div class="row"><button class="btn quiet" data-act="pw">Schimbă parola</button><button class="btn quiet" data-act="logout">${ic('out')} Deconectare</button></div></div>
  </div></div>`;
}
async function onProfile(e) {
  e.preventDefault();
  const upd = { first_name: document.getElementById('pf-fn').value.trim(), last_name: document.getElementById('pf-ln').value.trim(), phone: document.getElementById('pf-ph').value.trim() || null };
  const { error } = await sb.from('people').update(upd).eq('id', S.me.id);
  if (error) return toast(errMsg(error));
  Object.assign(S.me, upd); toast('Salvat.'); render();
}
function emailModal() {
  openModal(`<form class="modal" id="em-form" role="dialog" aria-modal="true" aria-labelledby="em-h"><div class="row between"><h2 id="em-h">Schimbă e-mailul</h2><button type="button" class="btn quiet sm" data-act="m-close" aria-label="Închide">${ic('x')}</button></div>
   <p class="muted small">E-mailul e și contul tău de logare. Îți trimitem un link de confirmare pe adresa nouă; schimbarea intră în vigoare după ce apeși pe el.</p>
   <label class="f">E-mail actual<input value="${esc(S.me.email)}" disabled></label>
   <label class="f">E-mail nou<input id="em-new" type="email" required autocomplete="email" placeholder="nume@exemplu.ro"></label>
   <label class="f">Scrie-l încă o dată<input id="em-new2" type="email" required autocomplete="off"></label>
   <p class="err" id="em-err"></p>
   <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="m-close">Renunță</button><button class="btn" type="submit">Trimite linkul de confirmare</button></div></form>`, w => w.querySelector('#em-form').addEventListener('submit', async ev => {
    ev.preventDefault(); const a = document.getElementById('em-new').value.trim().toLowerCase(), b = document.getElementById('em-new2').value.trim().toLowerCase(), err = document.getElementById('em-err');
    if (a !== b) { err.textContent = 'Cele două adrese nu sunt la fel.'; return; }
    if (a === S.me.email.toLowerCase()) { err.textContent = 'Aceasta e deja adresa ta.'; return; }
    const { data, error } = await sb.auth.updateUser({ email: a }, { emailRedirectTo: location.origin + location.pathname });
    if (error) { err.textContent = errMsg(error); return; }
    if (data?.user) S.session.user = data.user;
    closeModal(); toast('Ți-am trimis linkul de confirmare la ' + a + '.'); render();
  }));
}

/* utilizatori */
const ACCESS = { locatar: ['Locatar', 'line'], admin: ['Admin', 'ok'], paza: ['Pază', 'gold'] };
const USTAT = { neinvitat: ['Neinvitat încă', 'line'], invitat: ['Invitat', 'gold'], inregistrat: ['Înregistrat', 'ok'], in_asteptare: ['În așteptare', 'warn'], dezactivat: ['Dezactivat', 'line'], fost: ['Fost locatar', 'line'] };
const uStatus = p => { const v = USTAT[p.status] || [p.status, 'line']; return `<span class="chip ${v[1]}">${v[0]}</span>`; };
const activeUnits = p => (p.unit_members || []).filter(m => !m.until || new Date(m.until) >= dayStart(new Date()));
const miniPlates = l => l.length ? `<div class="mplates">${l.map(x => `<span class="mplate" title="${esc(x)}">${esc(x)}</span>`).join('')}</div>` : '<span class="muted small">—</span>';
async function loadPeople(force) {
  if (S.cache.people && !force) return S.cache.people;
  const [{ data, error }, { data: veh }] = await Promise.all([
    sb.from('people').select('id, first_name, last_name, email, phone, access, status, invited_at, invites_count, until_date, added_by_unit, auth_user_id, unit_members(id, unit_code, relation, until)').order('last_name').limit(3000),
    sb.from('vehicles').select('person_id, plate, active').eq('active', true).limit(5000)
  ]);
  if (error) throw error;
  const cars = {}; (veh || []).forEach(v => (cars[v.person_id] ||= []).push(v.plate));
  data.forEach(p => { p.cars = cars[p.id] || []; });
  return (S.cache.people = data);
}
async function audit(personId, field, from, to) { await sb.from('audit_log').insert({ person_id: personId, field, old_value: from ?? null, new_value: to ?? null, actor_id: S.me.id, actor_label: fullName(S.me), at: new Date().toISOString() }); }
async function pageUsers() {
  if (!isAdmin()) return pageMembers();
  const all = await loadPeople(), q = norm(S.cache.uq || ''), b = S.cache.ublock || 'Toate', st = S.cache.ustat || 'toate', ac = S.cache.uacc || 'toate';
  const blocks = [...new Set(all.flatMap(p => activeUnits(p).map(m => blockOf(m.unit_code))))].filter(Boolean).sort();
  const list = all.filter(p => (b === 'Toate' || activeUnits(p).some(m => blockOf(m.unit_code) === b)) && (st === 'toate' || p.status === st) && (ac === 'toate' || p.access === ac)
    && (!q || norm([p.first_name, p.last_name, p.email, p.phone, ...(p.unit_members || []).map(m => m.unit_code), ...p.cars].join(' ')).includes(q)))
    .sort((x, y) => (activeUnits(x)[0]?.unit_code || '~').localeCompare(activeUnits(y)[0]?.unit_code || '~', 'ro', { numeric: true }) || (x.last_name || '').localeCompare(y.last_name || ''));
  const pend = all.filter(p => p.status === 'in_asteptare'), toInvite = all.filter(p => p.status === 'neinvitat' || p.status === 'invitat');
  const shown = list.slice(0, 300);
  const rows = shown.map(p => { const um = activeUnits(p), m0 = um[0] || (p.unit_members || [])[0];
    return `<tr><td class="ucell"><b>${esc(fullName(p))}</b><span class="muted small">${esc(p.email)}</span>${p.phone ? `<span class="muted small">${esc(p.phone)}</span>` : ''}</td>
    <td>${(um.length ? um : (p.unit_members || [])).map(m => esc(m.unit_code)).join('<br>') || '<span class="muted">—</span>'}${p.until_date ? `<div class="muted small">până la ${fmtDate(p.until_date)}</div>` : ''}</td>
    <td>${p.status === 'fost' ? '<span class="muted small">—</span>' : miniPlates(p.cars)}</td>
    <td>${m0 ? `<select class="rolesel" data-mid="${m0.id}" data-pid="${p.id}" aria-label="Relația cu unitatea pentru ${esc(fullName(p))}">${Object.entries(REL).map(([k, l]) => `<option value="${k}" ${m0.relation === k ? 'selected' : ''}>${l === '–' ? 'Fără apartament' : l}</option>`).join('')}</select>` : '<span class="muted small">Fără apartament</span>'}</td>
    <td><select class="accsel acc-${p.access}" data-pid="${p.id}" aria-label="Acces în aplicație pentru ${esc(fullName(p))}">${Object.entries(ACCESS).map(([k, v]) => `<option value="${k}" ${p.access === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></td>
    <td>${uStatus(p)}${p.status === 'invitat' && p.invited_at ? `<div class="muted small">invitat ${fmtDate(p.invited_at)}</div>` : ''}</td>
    <td><div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn quiet sm" data-act="au-open" data-id="${p.id}">Istoric</button>
     ${p.status === 'in_asteptare' ? `<button class="btn sm" data-act="u-approve" data-id="${p.id}">Aprobă</button><button class="btn quiet sm" data-act="u-reject" data-id="${p.id}">Respinge</button>`
      : p.status === 'neinvitat' || p.status === 'invitat' ? `<button class="btn sm inv" data-act="u-invite" data-id="${p.id}">${p.invited_at ? 'Retrimite invitația' : 'Trimite invitația'}</button>`
      : p.status === 'dezactivat' || p.status === 'fost' ? `<button class="btn sm grey" data-act="u-activate" data-id="${p.id}">Reactivează</button>`
      : p.id === S.me.id ? '' : `<button class="btn sm softbad" data-act="u-deact" data-id="${p.id}" title="Persoana nu se mai poate loga. Se poate reactiva oricând.">Dezactivează</button>`}</div></td></tr>`; }).join('');
  const opt = (v, cur, l) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Utilizatori</h1><p class="muted">Toți cei din lista asociației. <b>Relația cu apartamentul</b> spune cine e persoana (proprietar, chiriaș, familie). <b>Accesul în aplicație</b> spune ce poate face: Locatar, Admin sau Pază. Le schimbi direct din tabel.</p></div>
   <div class="row"><button class="btn" data-act="u-add">${ic('plus')} Adaugă utilizator</button>${toInvite.length ? `<button class="btn ghost" data-act="inv-open">${ic('mail')} Trimite invitațiile (${toInvite.length})</button>` : ''}<button class="btn ghost" data-act="sale-open">${ic('home')} Schimbare proprietar</button></div></div>
  ${pend.length ? `<div class="card stack" style="border-color:var(--warn)"><h3>Cereri de aprobat (${pend.length})</h3><p class="muted small">Persoanele adăugate de locatari în apartamentul lor (familie, chiriași) au nevoie de aprobare. După aprobare le poți trimite invitația.</p>
   <div class="list">${pend.map(p => `<div class="item">${ic('user')}<span class="grow stack" style="gap:2px"><span><b>${esc(fullName(p))}</b> · ${esc(REL[(p.unit_members || [])[0]?.relation] || '')}</span><span class="muted small">${esc((p.unit_members || []).map(m => m.unit_code).join(', '))} · ${esc(p.email)} · adăugat de ${esc(p.added_by_unit || 'locatari')}</span></span><button class="btn sm" data-act="u-approve" data-id="${p.id}">Aprobă</button><button class="btn quiet sm" data-act="u-reject" data-id="${p.id}">Respinge</button></div>`).join('')}</div></div>` : ''}
  <div class="card stack">
   <label class="gsearch" style="max-width:none" for="u-q">${ic('search')}<input id="u-q" type="search" value="${esc(S.cache.uq || '')}" placeholder="Caută după nume, e-mail, apartament, telefon sau număr de mașină" autocomplete="off"></label>
   <div class="form-grid fg3">
    <label class="f">Bloc<select id="u-block">${['Toate', ...blocks].map(x => opt(x, b, x)).join('')}</select></label>
    <label class="f">Acces<select id="u-acc">${opt('toate', ac, 'Toate')}${Object.entries(ACCESS).map(([k, v]) => opt(k, ac, v[0])).join('')}</select></label>
    <label class="f">Status<select id="u-stat">${opt('toate', st, 'Toate')}${Object.entries(USTAT).map(([k, v]) => opt(k, st, v[0])).join('')}</select></label></div>
   <p class="muted small">${list.length} utilizatori${list.length > 300 ? ' (se afișează primii 300 – folosește căutarea sau filtrele)' : ''}</p>
   <div class="tablewrap"><table class="rep users"><thead><tr><th>Nume și contact</th><th>Apartament</th><th>Mașini</th><th>Relația cu apartamentul</th><th>Acces în aplicație</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">Niciun utilizator găsit.</td></tr>'}</tbody></table></div></div>`;
}
async function pageMembers() {
  const codes = S.units.map(u => u.code);
  if (!codes.length) return `<div class="head"><h1>Utilizatori</h1></div><p class="muted">Nu ai nicio unitate legată.</p>`;
  const unit = S.cache.memUnit || codes[0];
  const { data, error } = await sb.from('unit_members').select('id, relation, until, person_id, people(id, first_name, last_name, email, status)').eq('unit_code', unit); if (error) throw error;
  const mine = (data || []).filter(m => !m.until || new Date(m.until) >= dayStart(new Date()));
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Utilizatori</h1><p class="muted">Persoanele cu cont pentru ${esc(unit)}. Poți adăuga familia sau chiriașul. Administrația aprobă contul nou.</p></div>
   ${codes.length > 1 ? `<label class="f">Unitatea<select id="mem-unit">${codes.map(c => `<option ${c === unit ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>` : ''}</div>
  <div class="card stack"><div class="list">${mine.map(m => { const p = m.people || {}, me = p.id === S.me.id; return `<div class="item">${ic('user')}<span class="grow stack" style="gap:2px"><span><b>${esc(fullName(p))}</b>${me ? ' <span class="chip ok">tu</span>' : ''}</span><span class="muted small">${esc(REL[m.relation] || '')} · ${esc(p.email || '')}</span></span>${uStatus(p)}
   ${!me && ['membru_familie', 'chirias'].includes(m.relation) ? `<button class="btn quiet sm" data-act="mem-remove" data-id="${p.id}" data-u="${esc(unit)}">Scoate din apartament</button>` : ''}</div>`; }).join('') || '<p class="muted">Nicio persoană.</p>'}</div></div>
  <form class="card stack" id="mem-form" data-u="${esc(unit)}"><h3>Adaugă o persoană în apartament</h3>
   <div class="form-grid"><label class="f">Prenume<input id="um-first" required></label><label class="f">Nume<input id="um-last" required></label>
   <label class="f">E-mail<input id="um-email" type="email" required></label><label class="f">Cine este<select id="um-role"><option value="membru_familie">Membru de familie</option><option value="chirias">Chiriaș</option></select></label></div>
   <div class="row"><button class="btn" type="submit">${ic('plus')} Trimite cererea</button><span class="muted small">Persoana primește invitația pe email după ce administrația aprobă.</span><span class="err" id="um-err"></span></div></form>`;
}
async function invitePerson(p) {
  const { error } = await sb.auth.signInWithOtp({ email: p.email, options: { shouldCreateUser: true, data: { invite: '1', first_name: p.first_name || '' }, emailRedirectTo: location.origin + location.pathname + '#prima-intrare' } });
  if (error) throw error;
  const upd = { invited_at: new Date().toISOString(), invites_count: (p.invites_count || 0) + 1, ...(p.status === 'neinvitat' ? { status: 'invitat' } : {}) };
  await sb.from('people').update(upd).eq('id', p.id); Object.assign(p, upd);
  await audit(p.id, 'Invitație trimisă', null, p.email);
}
function inviteModal() {
  const all = S.cache.people || [], inv = all.filter(p => p.status === 'neinvitat' || p.status === 'invitat');
  const blocks = [...new Set(inv.flatMap(p => activeUnits(p).map(m => blockOf(m.unit_code))))].filter(Boolean).sort();
  const targets = sc => sc === 'neinvitat' ? inv.filter(p => p.status === 'neinvitat') : sc?.startsWith('bloc:') ? inv.filter(p => activeUnits(p).some(m => blockOf(m.unit_code) === sc.slice(5))) : inv;
  openModal(`<form class="modal pkmodal" id="inv-form" role="dialog" aria-modal="true" aria-labelledby="iv-h"><div class="row between"><h2 id="iv-h">Trimite invitațiile</h2><button type="button" class="btn quiet sm" data-act="m-close" aria-label="Închide">${ic('x')}</button></div>
   <p class="muted small">Fiecare persoană primește pe e-mail un cod de 6 cifre. Intră în aplicație cu „Prima dată aici”, scrie codul și își alege parola. Statusul trece pe „Înregistrat” după prima intrare.</p>
   <label class="f">Cui trimiți<select id="iv-scope"><option value="neinvitat">Doar celor „Neinvitat încă” (${targets('neinvitat').length})</option><option value="toti">Tuturor celor neînregistrați încă (${inv.length})</option>${blocks.map(x => `<option value="bloc:${esc(x)}">Doar blocul ${esc(x)} (${targets('bloc:' + x).length})</option>`).join('')}</select></label>
   <div class="note" style="background:var(--accent-soft)">${ic('mail')}<span>Se trimite de pe adresa asociației, câte una la 3 secunde, ca să nu ajungă în spam. Contul de email are o limită pe oră și pe zi: dacă se atinge, trimiterea se oprește și o reiei mai târziu de unde a rămas. Sfat: anunțați înainte că vin invitațiile.</span></div>
   <div id="iv-prog"></div>
   <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="m-close">Închide</button><button class="btn" type="submit" id="iv-go">Trimite</button></div></form>`, w => w.querySelector('#inv-form').addEventListener('submit', async ev => {
    ev.preventDefault(); const list = targets(document.getElementById('iv-scope').value), prog = document.getElementById('iv-prog'), go = document.getElementById('iv-go');
    if (!list.length) return; go.disabled = true; let done = 0;
    for (const p of list) {
      if (!document.getElementById('inv-form')) break;
      prog.innerHTML = `<div class="pbar" role="progressbar" aria-valuenow="${done}" aria-valuemax="${list.length}"><i style="width:${Math.round(done / list.length * 100)}%"></i></div><p><b>${done}</b> din ${list.length} trimise · acum: ${esc(p.email)}</p>`;
      try { await invitePerson(p); done++; } catch (e2) { prog.innerHTML += `<p class="err">Oprit la ${esc(p.email)}: ${esc(errMsg(e2))}. ${done} trimise. Reia mai târziu.</p>`; go.disabled = false; return; }
      await new Promise(r => setTimeout(r, 3000));
    }
    prog.innerHTML = `<p><b>Gata: ${done} invitații trimise.</b></p>`; go.disabled = false; render();
  }));
}
async function addUserModal() {
  const units = await unitsList();
  openModal(`<form class="modal pkmodal" id="ua-form" role="dialog" aria-modal="true" aria-labelledby="ua-h"><div class="row between"><h2 id="ua-h">Utilizator nou</h2><button type="button" class="btn quiet sm" data-act="m-close" aria-label="Închide">${ic('x')}</button></div>
   <div class="form-grid"><label class="f">Prenume<input id="ua-first" required></label><label class="f">Nume<input id="ua-last" required></label>
   <label class="f">E-mail<input id="ua-email" type="email" required></label><label class="f">Telefon<input id="ua-phone" type="tel"></label>
   <label class="f">Apartament / unitate<input id="ua-unit" list="ua-units" placeholder="ex. A1a.1.1 (gol pentru personal / pază)"><datalist id="ua-units">${units.map(u => `<option value="${esc(u.code)}">`).join('')}</datalist></label>
   <label class="f">Relația cu apartamentul<select id="ua-rel">${Object.entries(REL).filter(([k]) => k !== 'fara_apartament').map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
   <label class="f">Acces în aplicație<select id="ua-acc">${Object.entries(ACCESS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label>
   <label class="sw" for="ua-inv"><span>Trimite invitația acum</span><input type="checkbox" id="ua-inv" checked></label></div>
   <p class="err" id="ua-err"></p>
   <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="m-close">Renunță</button><button class="btn" type="submit">Adaugă</button></div></form>`, w => w.querySelector('#ua-form').addEventListener('submit', async ev => {
    ev.preventDefault(); const v = id => document.getElementById(id).value.trim(), err = document.getElementById('ua-err'), unit = v('ua-unit');
    if (unit && !units.some(u => u.code === unit)) { err.textContent = 'Unitatea nu există. Alege din listă.'; return; }
    const { data: p, error } = await sb.from('people').insert({ first_name: v('ua-first'), last_name: v('ua-last'), email: v('ua-email').toLowerCase(), phone: v('ua-phone') || null, access: v('ua-acc'), status: 'neinvitat' }).select('*').single();
    if (error) { err.textContent = /duplicate|unique/i.test(error.message) ? 'Există deja o persoană cu acest email.' : errMsg(error); return; }
    if (unit) { const { error: e2 } = await sb.from('unit_members').insert({ unit_code: unit, person_id: p.id, relation: v('ua-rel'), since: dateInput(new Date()) }); if (e2) { err.textContent = errMsg(e2); return; } }
    await audit(p.id, 'Cont nou', null, unit ? `${REL[v('ua-rel')]} ${unit}` : 'fără apartament');
    if (document.getElementById('ua-inv').checked) { try { await invitePerson(p); } catch (e3) { toast('Adăugat, dar invitația nu a plecat: ' + errMsg(e3)); } }
    closeModal(); S.cache.people = null; toast('Utilizator adăugat.'); render();
  }));
}
async function auditModal(id) {
  const p = (S.cache.people || []).find(x => x.id === id);
  const { data } = await sb.from('audit_log').select('*').eq('person_id', id).order('at', { ascending: false }).limit(100);
  openModal(`<div class="modal pkmodal" role="dialog" aria-modal="true" aria-labelledby="au-h"><div class="row between"><h2 id="au-h">Istoric · ${esc(fullName(p))}</h2><button type="button" class="btn quiet sm" data-act="m-close" aria-label="Închide">${ic('x')}</button></div>
   ${(data || []).length ? `<div class="list">${data.map(a => `<div class="item"><span class="grow stack" style="gap:2px"><span><b>${esc(a.field)}</b>: ${esc(a.old_value || '—')} → <b>${esc(a.new_value || '—')}</b></span><span class="muted small">${fmtDT(a.at)} · ${esc(a.actor_label || '')}</span></span></div>`).join('')}</div>` : '<p class="muted">Nicio modificare încă.</p>'}</div>`);
}
function deactModal(id) {
  const p = (S.cache.people || []).find(x => x.id === id); if (!p) return;
  openModal(`<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="dc-h"><h2 id="dc-h">Dezactivezi contul?</h2>
   <p><b>${esc(fullName(p))}</b> · ${esc(activeUnits(p).map(m => m.unit_code).join(', '))}<br><span class="muted small">Persoana nu se va mai putea loga în aplicație. Mașinile, linkul de vizitatori și rezervările apartamentului rămân neschimbate. Poți reactiva contul oricând.</span></p>
   <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="m-close">Renunță</button><button class="btn danger" data-act="u-deactivate" data-id="${p.id}">Da, dezactivează</button></div></div>`);
}
async function saleModal(st = {}) {
  const units = (await unitsList()).filter(u => u.kind !== 'parcare'), all = await loadPeople(), unit = st.unit || '', d = st.date || dateInput(new Date());
  const people = all.filter(p => p.status !== 'fost' && activeUnits(p).some(m => m.unit_code === unit));
  openModal(`<form class="modal pkmodal" id="sale-form" role="dialog" aria-modal="true" aria-labelledby="sl-h"><div class="row between"><h2 id="sl-h">Schimbare proprietar</h2><button type="button" class="btn quiet sm" data-act="m-close" aria-label="Închide">${ic('x')}</button></div>
   <div class="form-grid"><label class="f">Unitate<input id="sl-unit" list="sl-units" required value="${esc(unit)}" placeholder="ex. A1b.3.12"><datalist id="sl-units">${units.map(u => `<option value="${esc(u.code)}">`).join('')}</datalist></label>
   <label class="f">Data vânzării<input type="date" id="sl-date" value="${d}" required></label></div>
   ${unit ? `<div class="stack" style="gap:6px"><b>Cine pleacă din apartament</b>${people.length ? people.map(p => `<label class="sw" for="sl-p-${p.id}"><span>${esc(fullName(p))} <span class="muted small">· ${esc(REL[activeUnits(p).find(m => m.unit_code === unit)?.relation] || '')}${p.access !== 'locatar' ? ' · ' + ACCESS[p.access][0] : ''}</span></span><input type="checkbox" id="sl-p-${p.id}" class="sl-p" data-id="${p.id}" checked></label>`).join('') : '<p class="muted small">Nicio persoană în această unitate.</p>'}
    <p class="muted small">Debifează pe cine rămâne (de exemplu un chiriaș care continuă cu noul proprietar).</p></div>
   <div class="stack" style="gap:6px"><b>Noul proprietar</b><div class="form-grid"><label class="f">Prenume<input id="sl-first" required></label><label class="f">Nume<input id="sl-last" required></label>
    <label class="f">E-mail<input id="sl-email" type="email" required></label><label class="f">Telefon<input id="sl-phone" type="tel"></label></div></div>
   <div class="note" style="background:var(--gold-soft)">${ic('gate')}<span><b>Ce se întâmplă la confirmare:</b><br>• Persoanele bifate trec pe „Fost locatar”, nu se mai pot loga, dar rămân în istoric.<br>• Mașinile lor sunt șterse din aplicație și scoase din barieră.<br>• Linkul de vizitatori al apartamentului se schimbă; cel vechi nu mai funcționează.<br>• Rezervările de parcare de la data vânzării se anulează.<br>• Noul proprietar apare ca „Neinvitat încă”; îi trimiți invitația din tabel.</span></div>` : '<p class="muted">Scrie unitatea ca să vezi cine e în ea și ce se schimbă.</p>'}
   <p class="err" id="sl-err"></p>
   <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="m-close">Renunță</button><button class="btn" type="submit" ${unit ? '' : 'disabled'}>Confirmă schimbarea</button></div></form>`, w => {
    const u = w.querySelector('#sl-unit'); u.addEventListener('change', () => { if (units.some(x => x.code === u.value.trim())) saleModal({ unit: u.value.trim(), date: w.querySelector('#sl-date').value }); });
    w.querySelector('#sale-form').addEventListener('submit', async ev => {
      ev.preventDefault(); const v = id => document.getElementById(id).value.trim(), err = document.getElementById('sl-err');
      const leave = [...w.querySelectorAll('.sl-p')].filter(x => x.checked).map(x => x.dataset.id);
      const { data, error } = await sb.rpc('owner_change', { p_unit: v('sl-unit'), p_date: v('sl-date'), p_leave: leave, p_first: v('sl-first'), p_last: v('sl-last'), p_email: v('sl-email'), p_phone: v('sl-phone') });
      if (error) { err.textContent = errMsg(error); return; }
      closeModal(); S.cache.people = null; toast(`Gata: ${v('sl-unit')} are proprietar nou. ${leave.length} ${leave.length === 1 ? 'cont trecut' : 'conturi trecute'} pe „Fost locatar”, ${data.vehicles} mașini scoase, ${data.reservations} rezervări anulate.`); render();
    });
  });
}

/* pază */
async function pageGuard() {
  const now = new Date(), d0 = dayStart(now), d1 = new Date(d0.getTime() + 86400000);
  const { data, error } = await sb.from('reservations').select('*').eq('status', 'activa').lt('starts_at', d1.toISOString()).or(`ends_at.gt.${new Date(d0.getTime() - 3600000).toISOString()},visitor_inside.eq.true`).order('starts_at');
  if (error) throw error;
  const ids = (data || []).map(r => r.id), { data: marks } = ids.length ? await sb.from('guard_marks').select('*').in('reservation_id', ids) : { data: [] };
  const mk = (r, k) => (marks || []).filter(m => m.reservation_id === r.id && m.kind === k).sort((a, b) => b.at.localeCompare(a.at))[0];
  const st = r => { const i = r.entered_at || mk(r, 'in')?.at, o = r.exited_at || mk(r, 'out')?.at;
    if (o && new Date(o) <= now) return 'iesit'; if (i) return now > new Date(r.ends_at) ? 'depasit' : 'inauntru';
    if (now < new Date(new Date(r.starts_at).getTime() - 3600000)) return 'urmeaza'; if (now <= new Date(r.ends_at)) return 'poate'; return 'absent'; };
  const GST = { depasit: ['A depășit intervalul', 'bad'], inauntru: ['În parcare', 'ok'], poate: ['Poate intra acum', 'gold'], urmeaza: ['Urmează', 'line'], iesit: ['A ieșit', 'line'], absent: ['Nu a venit', 'line'] };
  const q = plateNorm(S.cache.gq || ''), qn = norm(S.cache.gq || '');
  const list = (data || []).filter(r => !q || r.plate.includes(q) || norm(`${r.unit_code} ${r.guest_name || ''}`).includes(qn));
  const card = r => { const s = st(r), gi = mk(r, 'in'), go = mk(r, 'out');
    return `<article class="gcard ${s}"><div class="gspot">${esc(r.spot_code)}</div><div class="grow stack" style="gap:6px;min-width:0">
     <div class="row" style="gap:10px">${plateHTML(r.plate)}<span class="chip ${GST[s][1]}">${GST[s][0]}</span>${s === 'depasit' ? `<span class="chip bad">+${Math.round((now - new Date(r.ends_at)) / 60000)} min</span>` : ''}</div>
     <div class="gline"><b>${timeTxt(r)}</b> · ${esc(r.unit_code)}</div><div class="muted small">${esc(r.guest_name || 'Vizitator')}${r.guest_phone ? ' · ' + esc(r.guest_phone) : ''}</div>
     <div class="gmarks"><span><i>barieră</i> Intrare: <b>${r.entered_at ? hhmm(r.entered_at) : '—'}</b> · Ieșire: <b>${r.exited_at ? hhmm(r.exited_at) : '—'}</b></span>${gi || go ? `<span class="gnote"><i>pază</i> ${gi ? `intrare <b>${hhmm(gi.at)}</b>` : ''}${gi && go ? ' · ' : ''}${go ? `ieșire <b>${hhmm(go.at)}</b>` : ''} <span class="muted">(observație)</span> <button class="btn ghost sm gfix" data-act="g-fix" data-id="${r.id}">✎ Corectează</button></span>` : ''}</div></div>
     <div class="gacts">${s === 'poate' ? `<button class="btn ghost" data-act="g-mark" data-k="in" data-id="${r.id}">Intrare manuală</button><span class="ghint">doar dacă bariera nu l-a recunoscut</span>` : ''}${s === 'inauntru' || s === 'depasit' ? `<button class="btn ghost" data-act="g-mark" data-k="out" data-id="${r.id}">Ieșire manuală</button><span class="ghint">doar dacă bariera nu a înregistrat ieșirea</span>` : ''}</div></article>`; };
  const grp = k => list.filter(r => k.includes(st(r)));
  const sec = (k, title) => { const g = grp(k); return g.length ? `<section class="stack" style="gap:8px"><h2 class="gh gh-${k[0]}">${title} <span class="muted">(${g.length})</span></h2><div class="glist">${g.map(card).join('')}</div></section>` : ''; };
  const inside = (data || []).filter(r => ['inauntru', 'depasit'].includes(st(r))).length;
  S.cache.gmarks = marks || []; S.cache.gres = data || [];
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Vizitatori azi</h1><p class="muted">${fmtDate(now)} · ora ${hhmm(now)} · ${inside} din ${SPOTS_N} locuri ocupate. Dacă bariera nu recunoaște numărul, verifică aici rezervarea și ridică bariera manual.</p></div><span class="chip ok">${ic('gate')} Barieră legată (Metrici)</span></div>
  <label class="gsearch gbig" for="g-q">${ic('search')}<input id="g-q" type="search" inputmode="text" autocapitalize="characters" placeholder="Scrie numărul mașinii, ex. B 55" value="${esc(S.cache.gq || '')}" autocomplete="off"></label>
  ${q && !list.length ? `<div class="note" style="background:var(--bad-soft)"><span><b style="color:var(--bad)">Nicio rezervare azi pentru „${esc(S.cache.gq)}”.</b> Nu ridica bariera. Vizitatorul poate cere locatarului să facă o rezervare.</span></div>` : ''}
  ${sec(['depasit'], 'Au depășit intervalul')}${sec(['poate'], 'Pot intra acum')}${sec(['inauntru'], 'În parcare')}${sec(['urmeaza'], 'Mai târziu azi')}${sec(['iesit', 'absent'], 'Încheiate')}
  ${!(data || []).length ? '<p class="muted">Nicio rezervare de vizitator azi.</p>' : ''}
  <p class="muted small">Lista se actualizează singură la 30 de secunde. Intrările și ieșirile vin de la barieră; marcajele pazei sunt observații, folosite doar unde bariera nu a înregistrat trecerea.</p>`;
}
function guardModal(kind, id) {
  const r = (S.cache.gres || []).find(x => x.id === id); if (!r) return;
  const n = new Date(), marks = (S.cache.gmarks || []).filter(m => m.reservation_id === id);
  if (kind === 'fix') {
    openModal(`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="gm-h"><h2 id="gm-h">Corectează marcajul pazei</h2>
     <div class="row" style="gap:12px"><span class="gspot" style="font-size:36px">${esc(r.spot_code)}</span><div class="stack" style="gap:4px">${plateHTML(r.plate)}<span class="small muted">${esc(r.unit_code)} · rezervat ${timeTxt(r)}</span></div></div>
     <div class="list">${marks.map(m => `<div class="item"><span class="grow">${m.kind === 'in' ? 'Intrare' : 'Ieșire'} (pază): <b>${fmtDT(m.at)}</b></span><button class="btn danger sm" data-act="g-del" data-id="${m.id}">Șterge</button></div>`).join('') || '<p class="muted">Niciun marcaj.</p>'}</div>
     <div class="row" style="justify-content:flex-end"><button class="btn quiet" data-act="m-close">Închide</button></div></div>`);
    return;
  }
  const inn = kind === 'in';
  openModal(`<form class="modal" id="gm-form" role="dialog" aria-modal="true" aria-labelledby="gm-h"><h2 id="gm-h">${inn ? 'Confirmă intrarea' : 'Confirmă ieșirea'}</h2>
   <div class="row" style="gap:12px"><span class="gspot" style="font-size:36px">${esc(r.spot_code)}</span><div class="stack" style="gap:4px">${plateHTML(r.plate)}<span class="small muted">${esc(r.unit_code)} · rezervat ${timeTxt(r)}</span></div></div>
   <p class="muted small">${inn ? 'Marchează intrarea doar dacă bariera nu a recunoscut numărul. Modifică ora dacă mașina a intrat mai devreme.' : 'Marchează ieșirea doar dacă bariera nu a înregistrat-o. Modifică ora dacă mașina a ieșit mai devreme.'} Marcajul se salvează ca observație.</p>
   <div class="form-grid"><label class="f">Data<input type="date" id="gm-date" value="${dateInput(n)}" max="${dateInput(n)}"></label><label class="f">Ora ${inn ? 'intrării' : 'ieșirii'}<input type="time" id="gm-time" value="${hhmm(n)}"></label></div>
   <p class="err" id="gm-err"></p>
   <div class="row" style="justify-content:flex-end"><button type="button" class="btn quiet" data-act="m-close">Renunță</button><button class="btn" type="submit">${inn ? 'Confirmă intrarea' : 'Confirmă ieșirea'}</button></div></form>`, w => w.querySelector('#gm-form').addEventListener('submit', async ev => {
    ev.preventDefault(); const at = new Date(`${document.getElementById('gm-date').value}T${document.getElementById('gm-time').value}`);
    if (at > new Date()) { document.getElementById('gm-err').textContent = 'Ora nu poate fi în viitor.'; return; }
    const { error } = await sb.from('guard_marks').insert({ reservation_id: id, kind, at: at.toISOString(), created_by: S.me.id });
    if (error) { document.getElementById('gm-err').textContent = errMsg(error); return; }
    closeModal(); toast(inn ? 'Intrare marcată.' : 'Ieșire marcată.'); render();
  }));
}

/* admin: raport parcări vizitatori + toate rezervările */
async function monthRes(m) {
  const [a, b] = monthRange(m);
  const { data, error } = await sb.from('reservations').select('*').eq('status', 'activa').gte('starts_at', a.toISOString()).lt('starts_at', b.toISOString()).order('starts_at').limit(5000);
  if (error) throw error; return data || [];
}
function reportRows(list) {
  const by = {};
  list.forEach(r => { const o = by[r.unit_code] ||= { unit: r.unit_code, visits: 0, hours: 0, real: 0, sum: 0, list: [] }; const x = resHours(r); o.visits++; o.hours += (new Date(r.ends_at) - new Date(r.starts_at)) / 3600000; o.real += x.real ? x.h : 0; o.sum += costParcare(x.h); o.list.push(r); });
  return Object.values(by).sort((a, b) => b.sum - a.sum || a.unit.localeCompare(b.unit));
}
async function pageReport() {
  if (!isAdmin()) return pageHome();
  const t = await tarif(), m = S.cache.repMonth || prevMonth(), list = await monthRes(m), rows = reportRows(list), [y, mm] = m.split('-').map(Number);
  const tot = rows.reduce((a, r) => ({ v: a.v + r.visits, h: a.h + r.real, s: a.s + r.sum }), { v: 0, h: 0, s: 0 });
  S.cache.repList = list;
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Raport parcări vizitatori</h1><p class="muted">Cât au stat vizitatorii fiecărui apartament în parcare, pentru lista de întreținere. Orele vin de la barieră (Metrici).</p></div><div class="row"><button class="btn" data-act="xlsx-report">${ic('doc')} Descarcă Excel</button></div></div>
  <div class="card stack"><div class="form-grid fg4">
   <label class="f">Luna<input type="month" id="rep-month" value="${m}"></label>
   <label class="f">Tarif (lei / oră, fără TVA)<input type="number" id="rep-rate" min="0" step="0.5" value="${t.lei_pe_ora ?? 5}"></label>
   <label class="f">Ore taxate maxim la 24 h<input type="number" id="rep-cap" min="1" max="24" step="1" value="${t.ore_plafon ?? 10}"></label>
   <div class="f"><span>&nbsp;</span><button class="btn quiet" data-act="tarif-save">Salvează tariful</button></div></div>
   <p class="muted small">Regula: fiecare oră începută, maximum ${(t.lei_pe_ora ?? 5) * (t.ore_plafon ?? 10)} lei pentru fiecare 24 de ore; după 24 h taxarea reîncepe. Vizitatorul care nu a venit: 0 lei.</p></div>
  <div class="grid g3 stats">
   <div class="card stat"><span class="muted small">Vizite în ${LUNI[mm - 1]} ${y}</span><span class="n">${tot.v}</span></div>
   <div class="card stat"><span class="muted small">Ore în parcare (barieră)</span><span class="n">${fh(tot.h)}</span></div>
   <div class="card stat" style="background:var(--accent-soft)"><span class="small" style="color:var(--accent);font-weight:700">Total de trecut pe întreținere</span><span class="n" style="font-size:38px;font-weight:800;color:var(--accent)">${lei(tot.s)}</span></div></div>
  <div class="card stack"><div class="tablewrap"><table class="rep"><thead><tr><th>Apartament</th><th class="num">Vizite</th><th class="num">Ore rezervate</th><th class="num">Ore în parcare</th><th class="num">Sumă</th><th></th></tr></thead><tbody>
   ${rows.map(r => `<tr><td><b>${esc(r.unit)}</b></td><td class="num">${r.visits}</td><td class="num">${fh(r.hours)}</td><td class="num">${fh(r.real)}</td><td class="num"><b>${lei(r.sum)}</b></td><td><button class="btn quiet sm" data-act="rep-open" data-a="${esc(r.unit)}">${S.cache.repOpen === r.unit ? 'Ascunde' : 'Detalii'}</button></td></tr>
    ${S.cache.repOpen === r.unit ? `<tr class="det"><td colspan="6"><div class="list">${r.list.map(x => `<div class="item"><b style="font-family:var(--display);font-size:22px;width:44px">${esc(x.spot_code)}</b><span class="grow stack" style="gap:2px"><span>rezervat ${timeTxt(x)}${x.entered_at ? ` · în parcare ${hhmm(x.entered_at)}–${x.exited_at ? hhmm(x.exited_at) : 'acum'}` : resHours(x).noShow ? ' · nu a venit' : ''} · ${lei(resCost(x))}${overMin(x) ? ` <span class="chip warn">depășit cu ${overMin(x)} min</span>` : ''}</span><span class="muted small">${esc(x.guest_name || 'Vizitator')} · ${SRC[x.source] || x.source}</span></span>${plateHTML(x.plate)}</div>`).join('')}</div></td></tr>` : ''}`).join('') || '<tr><td colspan="6" class="muted">Nicio vizită în luna aleasă.</td></tr>'}
  </tbody></table></div>
  <div class="note">${ic('gate')}<span>Orele în parcare sunt intrarea și ieșirea reală citite de barieră. Unde mașina nu a intrat încă se arată orele rezervate, ca estimare.</span></div></div>`;
}
async function pageReservations() {
  if (!isAdmin()) return pageHome();
  const m = S.cache.rzMonth || monthKeyOf(new Date()), q = norm(S.cache.rq || ''), src = S.cache.rzSrc || 'toate', stf = S.cache.rzSt || 'toate', now = new Date();
  const state = r => new Date(r.starts_at) > now ? 'viitoare' : (r.entered_at && !r.exited_at) || (new Date(r.ends_at) > now) ? 'acum' : 'incheiata';
  const RST = { viitoare: ['Urmează', 'line'], acum: ['În desfășurare', 'ok'], incheiata: ['Încheiată', 'line'] };
  const list = (await monthRes(m)).filter(r => (src === 'toate' || r.source === src) && (stf === 'toate' || (stf === 'depasite' ? overMin(r) > 0 : state(r) === stf)) && (!q || norm([r.unit_code, r.plate, r.guest_name, r.spot_code].join(' ')).includes(q))).reverse();
  const opt = (v, cur, l) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`;
  return `<div class="head"><div class="stack" style="gap:4px"><h1>Rezervări parcare</h1><p class="muted">Toate rezervările făcute de locatari și de vizitatori prin linkuri, cu intrarea și ieșirea citite de barieră.</p></div></div>
  <div class="card stack">
   <label class="gsearch" style="max-width:none" for="rz-q">${ic('search')}<input id="rz-q" type="search" value="${esc(S.cache.rq || '')}" placeholder="Caută după apartament, număr de mașină sau vizitator" autocomplete="off"></label>
   <div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <label class="f">Luna<input type="month" id="rz-month" value="${m}"></label>
    <label class="f">Cine a rezervat<select id="rz-src">${opt('toate', src, 'Toate')}${opt('app', src, 'Locatarul (din aplicație)')}${opt('link', src, 'Vizitatorul (prin link)')}${opt('admin', src, 'Administrația')}</select></label>
    <label class="f">Stare<select id="rz-st">${opt('toate', stf, 'Toate')}${opt('viitoare', stf, 'Urmează')}${opt('acum', stf, 'În desfășurare')}${opt('incheiata', stf, 'Încheiate')}${opt('depasite', stf, 'Au depășit intervalul')}</select></label></div>
   <p class="muted small">${list.length} rezervări · ${lei(list.reduce((a, r) => a + resCost(r), 0))}</p>
   <div class="tablewrap"><table class="rep rez"><thead><tr><th>Rezervat</th><th>Loc</th><th>Apartament</th><th>Vizitator</th><th>Număr</th><th>Rezervat de</th><th>Intrare–ieșire (barieră)</th><th class="num">Cost</th></tr></thead><tbody>
    ${list.map(r => { const s = state(r); return `<tr><td style="white-space:nowrap">${timeTxt(r)}</td><td><b>${esc(r.spot_code)}</b></td><td>${esc(r.unit_code)}</td><td>${esc(r.guest_name || '—')}${r.guest_phone ? `<div class="muted small">${esc(r.guest_phone)}</div>` : ''}</td><td>${plateHTML(r.plate)}</td><td>${SRC[r.source] || r.source}</td>
     <td style="white-space:nowrap">${r.entered_at ? `${hhmm(r.entered_at)}–${r.exited_at ? (dateInput(new Date(r.exited_at)) !== dateInput(new Date(r.entered_at)) ? fmtDT(r.exited_at) : hhmm(r.exited_at)) : 'acum'}${overMin(r) ? ` <span class="chip warn">+${overMin(r)} min</span>` : ''}` : resHours(r).noShow ? '<span class="muted">nu a venit</span>' : `<span class="chip ${RST[s][1]}">${RST[s][0]}</span>`}</td><td class="num">${lei(resCost(r))}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">Nicio rezervare pentru filtrele alese.</td></tr>'}
   </tbody></table></div></div>`;
}
async function downloadReportXLSX() {
  const list = S.cache.repList || [], m = S.cache.repMonth || prevMonth();
  if (!list.length) return toast('Nu există rezervări în luna aleasă.');
  if (!window.XLSX) { await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }).catch(() => null); }
  if (!window.XLSX) return toast('Nu s-a putut încărca generatorul de Excel. Încearcă din nou.');
  const t = TARIF || {}, X = window.XLSX, d = v => v ? new Date(v) : '';
  const det = [['Unitate', 'Loc', 'Nr. înmatriculare', 'Vizitator', 'Telefon', 'Sursă', 'Început rezervare', 'Sfârșit rezervare', 'Ore rezervate', 'Intrare (barieră)', 'Ieșire (barieră)', 'Ore în parcare', 'Depășire (min)', 'Total (lei)']];
  list.forEach(r => { const x = resHours(r); det.push([r.unit_code, r.spot_code, r.plate, r.guest_name || '', r.guest_phone || '', SRC[r.source] || r.source, d(r.starts_at), d(r.ends_at), Math.round((new Date(r.ends_at) - new Date(r.starts_at)) / 36e3) / 100, d(r.entered_at), d(r.exited_at), x.real ? Math.round(x.h * 100) / 100 : '', overMin(r) || '', resCost(r)]); });
  const wsD = X.utils.aoa_to_sheet(det, { cellDates: true }); wsD['!cols'] = [12, 6, 14, 22, 14, 18, 17, 17, 10, 17, 17, 10, 10, 10].map(w => ({ wch: w }));
  const rows = reportRows(list), cen = [[`Parcare vizitatori – ${LUNI[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`], ['Unitate', 'Nr. vizite', 'Ore în parcare', `Total (lei, ${t.lei_pe_ora ?? 5} lei/oră fără TVA)`], ...rows.map(r => [r.unit, r.visits, Math.round(r.real * 100) / 100, Math.round(r.sum * 100) / 100]), ['TOTAL', rows.reduce((a, r) => a + r.visits, 0), Math.round(rows.reduce((a, r) => a + r.real, 0) * 100) / 100, Math.round(rows.reduce((a, r) => a + r.sum, 0) * 100) / 100], [], [`Regula: ${t.lei_pe_ora ?? 5} lei pentru fiecare oră începută, maximum ${(t.lei_pe_ora ?? 5) * (t.ore_plafon ?? 10)} lei la fiecare 24 de ore. Orele sunt intrarea și ieșirea reală de la barieră.`]];
  const wsC = X.utils.aoa_to_sheet(cen); wsC['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 34 }];
  const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, wsC, 'Centralizator'); X.utils.book_append_sheet(wb, wsD, 'Detaliu');
  X.writeFile(wb, `${m.slice(5, 7)}.${m.slice(0, 4)}_Avalon_Parcare_vizitatori.xlsx`); toast('Excel salvat.');
}

/* evenimente pentru paginile noi */
function bindPages() {
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  const deb = (key, id) => on(id, 'input', e => { S.cache[key] = e.target.value; clearTimeout(S.cache['_t' + key]); S.cache['_t' + key] = setTimeout(async () => { await render(); const el = document.getElementById(id); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 300); });
  deb('aq', 'ann-q'); deb('dq', 'doc-q'); deb('rq', 'rz-q');
  on('doc-form', 'submit', onDoc);
  on('mem-unit', 'change', e => { S.cache.memUnit = e.target.value; render(); });
  on('mem-form', 'submit', async e => { e.preventDefault(); const v = id => document.getElementById(id).value.trim();
    const { error } = await sb.rpc('request_member', { p_unit: e.target.dataset.u, p_first: v('um-first'), p_last: v('um-last'), p_email: v('um-email'), p_relation: v('um-role') });
    if (error) { document.getElementById('um-err').textContent = errMsg(error); return; } toast('Cererea a fost trimisă administrației.'); render(); });
  document.querySelectorAll('.an-f').forEach(el => el.addEventListener('input', readAnnDraft));
  document.querySelectorAll('.nt-sw').forEach(el => el.addEventListener('change', async () => { const notif = { ...(S.me.notif || {}), [el.dataset.k]: el.checked }; const { error } = await sb.from('people').update({ notif }).eq('id', S.me.id); if (error) return toast(errMsg(error)); S.me.notif = notif; toast('Salvat.'); }));
  [['u-block', 'ublock'], ['u-acc', 'uacc'], ['u-stat', 'ustat'], ['rz-src', 'rzSrc'], ['rz-st', 'rzSt'], ['rz-month', 'rzMonth'], ['rep-month', 'repMonth']].forEach(([id, k]) => on(id, 'change', e => { S.cache[k] = e.target.value; render(); }));
  document.querySelectorAll('.accsel[data-pid]').forEach(el => el.addEventListener('change', async e => {
    const p = S.cache.people.find(x => x.id === el.dataset.pid), v = e.target.value;
    if (p.id === S.me.id && v !== 'admin' && !confirm('Îți scoți singur accesul de admin. Continui?')) { e.target.value = p.access; return; }
    const { error } = await sb.from('people').update({ access: v }).eq('id', p.id); if (error) { e.target.value = p.access; return toast(errMsg(error)); }
    await audit(p.id, 'Acces în aplicație', ACCESS[p.access][0], ACCESS[v][0]); p.access = v; e.target.className = `accsel acc-${v}`; toast('Acces actualizat.');
    if (p.id === S.me.id) { S.me.access = v; render(); }
  }));
  document.querySelectorAll('.rolesel[data-mid]').forEach(el => el.addEventListener('change', async e => {
    const p = S.cache.people.find(x => x.id === el.dataset.pid), m = p.unit_members.find(x => x.id === el.dataset.mid), v = e.target.value;
    const { error } = await sb.from('unit_members').update({ relation: v }).eq('id', m.id); if (error) { e.target.value = m.relation; return toast(errMsg(error)); }
    await audit(p.id, 'Relația cu ' + m.unit_code, REL[m.relation], REL[v]); m.relation = v; toast('Relația a fost schimbată.');
  }));
}
async function pagesClick(a, b) {
  const pid = b.dataset.id, P = () => (S.cache.people || []).find(x => x.id === pid);
  switch (a) {
    case 'm-close': closeModal(); return true;
    case 'veh-new': vehModal(); return true;
    case 'new-ticket': S.cache.newTicket = true; if (S.route !== 'tichete') location.hash = '#tichete'; else render(); return true;
    case 'cancel-ticket': S.cache.newTicket = false; render(); return true;
    case 'tfilter': S.cache.tf2 = b.dataset.k; render(); return true;
    case 'dcat': S.cache.dcat = b.dataset.c; render(); return true;
    case 'new-doc': S.cache.newDoc = true; render(); return true;
    case 'cancel-doc': S.cache.newDoc = false; render(); return true;
    case 'doc-del': if (!confirm('Ștergi documentul? Se șterge și fișierul.')) return true; { const { error } = await sb.from('documents').delete().eq('id', pid); if (error) toast(errMsg(error)); else { if (b.dataset.p) await sb.storage.from('documente').remove([b.dataset.p]); render(); } } return true;
    case 'doc-open': { const w = window.open('', '_blank'); const { data, error } = await sb.storage.from('documente').createSignedUrl(b.dataset.p, 600); if (error || !data?.signedUrl) { if (w) w.close(); toast('Nu am putut deschide documentul.'); } else if (w) w.location = data.signedUrl; else location.href = data.signedUrl; } return true;
    case 'copy-t': try { await navigator.clipboard.writeText(b.dataset.t); toast('Copiat.'); } catch { prompt('Copiază:', b.dataset.t); } return true;
    case 'c-edit': contactModal(pid); return true;
    case 'ann-del': if (!confirm('Ștergi anunțul? Dispare pentru toți locatarii.')) return true; { const { error } = await sb.from('announcements').delete().eq('id', pid); if (error) toast(errMsg(error)); else render(); } return true;
    case 'ann-mail': S.cache.annMail = S.cache.annMail === pid ? null : pid; render(); return true;
    case 'emoji-toggle': S.cache.emojiOpen = !S.cache.emojiOpen; document.getElementById('emojis')?.toggleAttribute('hidden', !S.cache.emojiOpen); b.setAttribute('aria-expanded', !!S.cache.emojiOpen); return true;
    case 'emoji': { const t = document.getElementById('an-body'); if (t) insertAt(t, b.dataset.e); } return true;
    case 'fmt': { const t = document.getElementById('an-body'); if (!t) return true; const f = b.dataset.f; if (f === 'b') insertAt(t, '**', '**', 'text'); else if (f === 'i') insertAt(t, '*', '*', 'text'); else insertAt(t, '\n- ', '', 'element'); } return true;
    case 'em-open': emailModal(); return true;
    case 'pw': S.mustSetPassword = true; render(); return true;
    case 'u-add': addUserModal(); return true;
    case 'inv-open': inviteModal(); return true;
    case 'sale-open': saleModal(); return true;
    case 'au-open': auditModal(pid); return true;
    case 'u-deact': deactModal(pid); return true;
    case 'u-invite': { const p = P(); b.disabled = true; try { await invitePerson(p); toast('Invitația a plecat la ' + p.email + '.'); render(); } catch (e) { b.disabled = false; toast(errMsg(e)); } } return true;
    case 'u-deactivate': case 'u-activate': case 'u-approve': case 'u-reject': {
      const p = P(), to = a === 'u-deactivate' || a === 'u-reject' ? (a === 'u-reject' ? 'fost' : 'dezactivat') : a === 'u-approve' ? 'neinvitat' : (p.auth_user_id ? 'inregistrat' : 'neinvitat');
      const { error } = await sb.from('people').update({ status: to, ...(a === 'u-activate' ? { until_date: null } : {}) }).eq('id', p.id); if (error) { toast(errMsg(error)); return true; }
      await audit(p.id, 'Status', USTAT[p.status]?.[0], USTAT[to][0]); p.status = to; closeModal();
      toast({ 'u-deactivate': 'Cont dezactivat.', 'u-activate': 'Cont reactivat.', 'u-approve': 'Cerere aprobată. Acum îi poți trimite invitația.', 'u-reject': 'Cerere respinsă.' }[a]); render(); } return true;
    case 'mem-remove': if (!confirm('Scoți persoana din apartament?')) return true; { const { error } = await sb.rpc('remove_member', { p_unit: b.dataset.u, p_person: pid }); if (error) toast(errMsg(error)); else { toast('Persoana a fost scoasă.'); render(); } } return true;
    case 'g-mark': guardModal(b.dataset.k, pid); return true;
    case 'g-fix': guardModal('fix', pid); return true;
    case 'g-del': if (!confirm('Ștergi marcajul pazei?')) return true; { const { error } = await sb.from('guard_marks').delete().eq('id', pid); if (error) toast(errMsg(error)); else { closeModal(); render(); } } return true;
    case 'rep-open': S.cache.repOpen = S.cache.repOpen === b.dataset.a ? null : b.dataset.a; render(); return true;
    case 'xlsx-report': downloadReportXLSX(); return true;
    case 'tarif-save': { const v = { ...(TARIF || {}), lei_pe_ora: +document.getElementById('rep-rate').value || 0, ore_plafon: Math.min(24, Math.max(1, +document.getElementById('rep-cap').value || 10)), tva_inclus: false };
      const { error } = await sb.from('settings').update({ value: v, updated_at: new Date().toISOString() }).eq('key', 'tarif'); if (error) { toast(errMsg(error)); return true; } TARIF = v; toast('Tariful a fost salvat.'); render(); } return true;
  }
  return false;
}
setInterval(() => { if (S.me && S.route === 'paza' && !document.getElementById('m-wrap') && document.activeElement?.id !== 'g-q') render(); }, 30000);


/* ---------- randare ---------- */
let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  if (S.route.startsWith('v-')) { S.param = S.route.slice(2); await tarif().catch(() => {}); const h = await pagePublic(S.param); if (seq !== renderSeq) return; root.innerHTML = h; bind(); return; }
  if (!S.session) { root.innerHTML = loginView(); bind(); return; }
  if (needsPassword()) { root.innerHTML = setPasswordView(); bind(); return; }
  if (!S.me) {
    root.innerHTML = `<div class="login"><div class="card stack">${brand(52)}<h2>Contul nu e încă activ</h2><p class="muted">Contul tău de login există, dar nu e legat de lista asociației. Scrie-ne la aplicatie.avalonestate@gmail.com.</p><button class="btn quiet" data-act="logout">Ieșire</button></div></div>`;
    bind(); return;
  }
  if (S.route === 'tichet') { location.replace(`#tichete/${S.param || ''}`); return; }
  if (S.route === 'tichet-nou') { S.cache.newTicket = true; location.replace('#tichete'); return; }
  const pages = { acasa: pageHome, parcare: pageParking, istoric: pageHistory, vehicule: pageVehicles, paza: pageGuard, tichete: pageTickets, anunturi: pageAnn, documente: pageDocs, contacte: pageContacts, profil: pageProfile, utilizatori: pageUsers, raport: pageReport, rezervari: pageReservations };
  let fn = pages[S.route] || pageHome;
  if (S.route === 'paza' && !isGuard()) fn = pageHome;
  if (S.me.access === 'paza' && !['paza', 'contacte', 'profil'].includes(S.route)) fn = pageGuard;
  if (!root.querySelector('.app')) root.innerHTML = shell(loading());
  else { const c = root.querySelector('.content'); if (c && !c.dataset.keep) c.innerHTML = loading(); }
  let inner;
  try { inner = await fn(); } catch (e) { inner = `<div class="card stack"><h3>A apărut o eroare</h3><p class="err">${esc(errMsg(e))}</p><button class="btn quiet" data-act="reload">Reîncearcă</button></div>`; }
  if (seq !== renderSeq) return;
  root.innerHTML = shell(inner, ['utilizatori', 'rezervari', 'raport'].includes(S.route));
  bind();
}

// tabele / hartă mai late decât ecranul: indiciu „glisează” + umbră la margine (dispare când ajungi la capăt)
function scrollHints() {
  document.querySelectorAll('.tablewrap, .mapscroll').forEach(el => {
    const upd = () => {
      const can = el.scrollWidth > el.clientWidth + 4;
      el.classList.toggle('can-scroll', can);
      el.classList.toggle('at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
      let h = el.previousElementSibling?.classList.contains('swipe-hint') ? el.previousElementSibling : null;
      if (can && !h) { h = document.createElement('div'); h.className = 'swipe-hint'; h.innerHTML = '<span aria-hidden="true">⇆</span> Glisează stânga–dreapta ca să vezi tot'; el.before(h); }
      if (h) h.hidden = !can;
    };
    if (!el.dataset.sh) { el.dataset.sh = '1'; el.addEventListener('scroll', upd, { passive: true });
      if (el.classList.contains('mapscroll')) el.scrollLeft = el.scrollWidth; } // pe hartă arătăm direct locurile de vizitatori (în dreapta)
    upd();
  });
}
addEventListener('resize', () => scrollHints());
function bind() {
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  requestAnimationFrame(scrollHints);
  on('login-form', 'submit', onLoginSubmit);
  on('pw-form', 'submit', onSetPassword);
  on('veh-form', 'submit', onVehAdd);
  on('pub-form', 'submit', onPubSubmit);
  on('vl-unit', 'change', e => { S.cache.linkUnit = e.target.value; render(); });
  on('reply-form', 'submit', onReply);
  on('nt-form', 'submit', onNewTicket);
  on('an-form', 'submit', onAnn);
  on('ct-form', 'submit', onContact);
  on('pf-form', 'submit', onProfile);
  bindPages();
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
  if (await pagesClick(a, b)) return;
  if (a === 'logout') { await sb.auth.signOut(); S.me = null; S.units = []; S.cache = {}; location.hash = ''; return; }
  if (a === 'setlang') { setLang(b.dataset.l); return; }
  if (a === 'login-code') { S.loginStep = 'email'; render(); }
  if (a === 'login-pass') { S.loginStep = 'parola'; render(); }
  if (a === 'reload') render();
  if (a === 'tf') { S.cache.tf = b.dataset.v; render(); }
  if (a === 'uf') { S.cache.uf = b.dataset.v; render(); }
  if (a === 'more') {
    document.querySelector('.sheet')?.remove();
    const sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = `<nav class="nav">${menu().map(([r, l, i]) => `<a href="#${r}">${ic(i)}<span>${l}</span></a>`).join('')}<a href="#" data-act="logout">${ic('out')}<span data-en="Sign out">Ieșire</span></a></nav>`;
    document.body.appendChild(sh);
    setTimeout(() => document.addEventListener('click', function off(ev) { if (!sh.contains(ev.target) || ev.target.closest('a')) { sh.remove(); document.removeEventListener('click', off); } }), 0);
  }
  if (a === 'copy') { try { await navigator.clipboard.writeText(b.dataset.t); toast('Link copiat. Trimite-l vizitatorului.'); } catch { prompt('Copiază linkul:', b.dataset.t); } return; }
  if (a === 'new-link') { if (!confirm('Generezi alt link? Cel vechi nu va mai funcționa.')) return; const { data, error } = await sb.rpc('my_visitor_link', { p_unit: S.cache.vlink?.unit || S.units[0]?.code, p_new: true }); if (error) return toast(errMsg(error)); S.cache.vlink = { unit: S.cache.vlink?.unit || S.units[0]?.code, token: data }; toast('Link nou generat.'); render(); return; }
  if (a === 'pub-again') { S.pubDone = null; render(); return; }
  if (a === 'pick-spot') { openPk(b.dataset.s); return; }
  if (a === 'pk-close') { S.pk = null; document.getElementById('pk-wrap')?.remove(); return; }
  if (a === 'pk-mode') { readPk(); S.pk.mode = b.dataset.m; if (S.pk.mode === 'zile' && S.pk.endDate === S.pk.date) { const d = new Date(S.pk.date + 'T00:00'); d.setDate(d.getDate() + 1); S.pk.endDate = dateInput(d); } showPk(); return; }
  if (a === 'pk-dur') { readPk(); const st = new Date(`${S.pk.date}T${S.pk.from}`), en = new Date(st.getTime() + (+b.dataset.h) * 3600000); if (dateInput(en) !== S.pk.date) { S.pk.mode = 'zile'; S.pk.endDate = dateInput(en); } S.pk.to = hhmm(en); showPk(); return; }
  if (a === 'pk-plate') { readPk(); S.pk.plate = b.dataset.p; showPk(); return; }
  if (a === 'pk-next') { readPk(); const { s: s0, e: e0 } = pkRange(), dur = e0 - s0, ns = new Date(b.dataset.k), ne = new Date(ns.getTime() + dur); S.pk.date = dateInput(ns); S.pk.from = hhmm(ns); S.pk.endDate = dateInput(ne); S.pk.to = hhmm(ne); if (S.pk.endDate !== S.pk.date) S.pk.mode = 'zile'; showPk(); return; }
  if (a === 'veh-del') {
    if (!confirm(`Ștergi mașina ${b.dataset.p || ''}? Numărul se scoate și din barieră, deci nu va mai putea intra în complex. O poți adăuga din nou oricând.`)) return;
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
    if (!confirm('Ștergi contactul? Dispare pentru toți locatarii.')) return;
    const { error } = await sb.from('contacts').delete().eq('id', b.dataset.id);
    if (error) return toast(errMsg(error));
    render();
  }
});

document.addEventListener('keydown', e => { const t = e.target.closest?.('[data-act="pick-spot"]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPk(t.dataset.s); } if (e.key === 'Escape' && S.pk) { S.pk = null; document.getElementById('pk-wrap')?.remove(); } });

/* ---------- pornire ---------- */
startI18n();
if (/^#(prima-intrare|bun-venit)/.test(location.hash)) { S.loginStep = 'invite'; history.replaceState(null, '', location.pathname); }
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
