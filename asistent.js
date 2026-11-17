// Asistent fără AI: răspunde din întrebări frecvente scrise dinainte + caută în documentele pe care utilizatorul le vede deja.
// Nu trimite nimic în afara aplicației și nu are acces la altceva decât are utilizatorul (documentele vin prin aceleași reguli RLS).
// Conținut doar pentru locatari (fără funcțiile de administrare). Pornit din app.js: window.__avalon = { sb, S, isEN }.
const A = () => window.__avalon || {};
const en = () => !!A().isEN?.();
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// k = cuvinte-cheie (început de cuvânt, fără diacritice); go = paginile spre care trimitem
const FAQ = [
  { id: 'rez', q: 'Cum rezerv un loc pentru un vizitator?', qe: 'How do I book a visitor parking spot?',
    k: ['rezerv', 'rezervare', 'vizitator', 'musafir', 'oaspet', 'loc', 'parcare', 'book', 'visitor', 'guest', 'spot'],
    a: 'Intră în „Parcare vizitatori”, atinge un loc pe hartă, alege ziua, ora de sosire și de plecare și scrie numărul mașinii vizitatorului. Numărul ajunge automat la barieră înainte de ora sosirii. Locul de pe hartă e orientativ: vizitatorul poate parca pe orice loc liber marcat pentru vizitatori.',
    ae: 'Open “Visitor parking”, tap a spot on the map, choose the day, arrival and departure time and enter the visitor’s plate number. The number is sent to the barrier automatically before arrival. The spot on the map is indicative: the visitor can use any free visitor spot.',
    go: [['parcare', 'Parcare vizitatori', 'Visitor parking']] },
  { id: 'cost', q: 'Cât costă parcarea pentru vizitatori?', qe: 'How much does visitor parking cost?',
    k: ['cost', 'costa', 'pret', 'tarif', 'plat', 'bani', 'lei', 'factur', 'tva', 'price', 'pay', 'fee'],
    a: 'Se plătesc orele reale, de la intrarea la barieră până la ieșire. Fiecare oră începută se socotește întreagă, cu un plafon pe 24 de ore. Dacă vizitatorul nu vine, nu plătești nimic. Tariful actual îl vezi în fereastra de rezervare (nu se aplică TVA), iar costurile tale în „Rezervările mele”.',
    ae: 'You pay for the actual hours, from entering at the barrier until leaving. Each started hour counts as a full hour, with a cap per 24 hours. If the visitor doesn’t come, you pay nothing. The current rate is shown in the booking window (no VAT applies) and your costs in “My bookings”.',
    go: [['istoric', 'Rezervările mele', 'My bookings']] },
  { id: 'link', q: 'Cum îi trimit vizitatorului un link să-și rezerve singur?', qe: 'How do I send a visitor a booking link?',
    k: ['link', 'trimit', 'singur', 'whatsapp', 'share', 'send', 'own'],
    a: 'În „Parcare vizitatori” găsești linkul apartamentului tău. Îl copiezi și îl trimiți vizitatorului (WhatsApp, SMS). Vizitatorul își alege ora și își scrie singur numărul mașinii, fără cont. Numărul de rezervări prin link pe zi e limitat. Dacă vrei ca linkul vechi să nu mai meargă, generezi unul nou.',
    ae: 'In “Visitor parking” you’ll find your apartment’s link. Copy it and send it to the visitor (WhatsApp, SMS). The visitor picks the time and enters the plate number, without an account. Link bookings per day are limited. To disable the old link, generate a new one.',
    go: [['parcare', 'Parcare vizitatori', 'Visitor parking']] },
  { id: 'anul', q: 'Cum anulez o rezervare?', qe: 'How do I cancel a booking?',
    k: ['anul', 'sterg', 'renunt', 'cancel', 'delete'],
    a: 'În „Rezervările mele” apeși „Anulează” la rezervarea respectivă. Numărul vizitatorului se scoate de la barieră în aproximativ un minut.',
    ae: 'In “My bookings”, press “Cancel” on that booking. The visitor’s number is removed from the barrier within about a minute.',
    go: [['istoric', 'Rezervările mele', 'My bookings']] },
  { id: 'iesire', q: 'Vizitatorul a ieșit și vrea să intre din nou', qe: 'My visitor left and wants to come back',
    k: ['iesit', 'iesire', 'intra', 'iar', 'din nou', 'reintr', 'again', 'back', 'left'],
    a: 'O rezervare înseamnă o singură intrare: după ce vizitatorul iese, numărul lui se scoate de la barieră. Dacă revine, fă o rezervare nouă.',
    ae: 'A booking covers a single entry: once the visitor leaves, their number is removed from the barrier. If they come back, make a new booking.',
    go: [['parcare', 'Parcare vizitatori', 'Visitor parking']] },
  { id: 'bariera', q: 'Bariera nu se ridică', qe: 'The barrier doesn’t open',
    k: ['bariera', 'ridica', 'deschide', 'intru', 'nu merge', 'blocat', 'camera', 'barrier', 'open', 'gate'],
    a: 'Verifică întâi: numărul e scris exact (fără spații greșite), mașina e în „Vehiculele mele” sau vizitatorul are rezervare pentru ora asta. După o modificare (mașină nouă, număr schimbat) bariera poate avea nevoie de până la 15 minute ca să afle. Dacă tot nu merge, sună la pază (vezi „Contacte”) sau deschide un tichet.',
    ae: 'First check: the number is written exactly, the car is in “My vehicles” or the visitor has a booking for this time. After a change (new car, new number) the barrier may need up to 15 minutes to update. If it still fails, call security (see “Contacts”) or open a ticket.',
    go: [['vehicule', 'Vehiculele mele', 'My vehicles'], ['contacte', 'Contacte', 'Contacts']] },
  { id: 'masina', q: 'Cum adaug sau schimb mașina mea?', qe: 'How do I add or change my car?',
    k: ['masin', 'auto', 'adaug', 'numar', 'inmatricul', 'schimb', 'vehicul', 'car', 'plate', 'add', 'vehicle'],
    a: 'În „Vehiculele mele” apeși „Adaugă o mașină” și scrii numărul. Mașina intră în contul de parcare al apartamentului și bariera o recunoaște în câteva minute. Ca să schimbi mașina, o adaugi pe cea nouă și o ștergi pe cea veche.',
    ae: 'In “My vehicles” press “Add a car” and enter the number. The car goes into your apartment’s parking account and the barrier recognises it within a few minutes. To change cars, add the new one and delete the old one.',
    go: [['vehicule', 'Vehiculele mele', 'My vehicles']] },
  { id: 'sterg-masina', q: 'De ce nu pot șterge o mașină?', qe: 'Why can’t I delete a car?',
    k: ['nu pot sterge', 'sterg masin', 'in complex', 'inauntru', 'cannot delete', 'inside'],
    a: 'O mașină aflată acum în complex nu se poate șterge. După ce iese pe la barieră, o poți șterge din „Vehiculele mele”.',
    ae: 'A car that is currently inside the complex can’t be deleted. Once it leaves through the barrier, you can delete it in “My vehicles”.',
    go: [['vehicule', 'Vehiculele mele', 'My vehicles']] },
  { id: 'cate', q: 'Câte mașini pot avea?', qe: 'How many cars can I have?',
    k: ['cate masini', 'cate', 'limita', 'locuri', 'how many', 'limit'],
    a: 'Poți trece mai multe mașini, dar în complex pot fi în același timp atâtea câte locuri de parcare are apartamentul.',
    ae: 'You can register several cars, but only as many can be inside the complex at the same time as your apartment has parking spaces.',
    go: [['vehicule', 'Vehiculele mele', 'My vehicles']] },
  { id: 'tichet', q: 'Cum anunț o problemă (tichet)?', qe: 'How do I report a problem (ticket)?',
    k: ['tichet', 'problem', 'defect', 'sesizare', 'reclam', 'stricat', 'nu functioneaza', 'bec', 'lift', 'curatenie', 'ticket', 'issue', 'report', 'broken'],
    a: 'În „Tichete” apeși „Tichet nou”, scrii pe scurt problema, alegi categoria și dai detalii. Administrația primește tichetul imediat și îți răspunde tot acolo. Când apare un răspuns nou, tichetul are o bulină albastră.',
    ae: 'In “Tickets” press “New ticket”, describe the problem briefly, choose a category and add details. The administration gets it right away and answers there. New replies are marked with a blue dot.',
    go: [['tichete', 'Tichete', 'Tickets']] },
  { id: 'fisiere', q: 'Pot atașa poze sau fișiere la un tichet?', qe: 'Can I attach photos or files to a ticket?',
    k: ['poz', 'fotograf', 'fisier', 'atas', 'pdf', 'photo', 'file', 'attach'],
    a: 'Da. La tichet nou și la răspuns apeși „Atașează fișiere”: până la 6 odată. Pozele se micșorează automat; documentele (PDF, Word, Excel) pot avea cel mult 10 MB.',
    ae: 'Yes. On a new ticket or a reply press “Attach files”: up to 6 at once. Photos are resized automatically; documents (PDF, Word, Excel) can be up to 10 MB.',
    go: [['tichete', 'Tichete', 'Tickets']] },
  { id: 'status', q: 'Ce înseamnă statusul tichetului?', qe: 'What does the ticket status mean?',
    k: ['status', 'rezolvat', 'inchis', 'in lucru', 'asteptare', 'respins', 'resolved', 'closed'],
    a: '„Nou” – administrația încă nu l-a preluat; „În lucru” – se rezolvă; „În așteptare” – se așteaptă ceva (de la tine sau de la un furnizor); „Rezolvat” / „Închis” – gata. Poți scrie în continuare și într-un tichet închis.',
    ae: '“New” – not picked up yet; “In progress” – being handled; “Waiting” – waiting for something (from you or a supplier); “Resolved” / “Closed” – done. You can still write in a closed ticket.',
    go: [['tichete', 'Tichete', 'Tickets']] },
  { id: 'anunt', q: 'Unde văd anunțurile asociației?', qe: 'Where are the association’s announcements?',
    k: ['anunt', 'noutat', 'informar', 'avertiz', 'apa oprit', 'curent', 'announcement', 'news'],
    a: 'În „Anunțuri”. Cele noi apar și pe pagina de start.',
    ae: 'In “Announcements”. New ones also appear on the home page.',
    go: [['anunturi', 'Anunțuri', 'Announcements']] },
  { id: 'docs', q: 'Unde găsesc regulamentul, hotărârile sau procesele-verbale?', qe: 'Where are the rules, decisions and minutes?',
    k: ['document', 'regulament', 'hotarar', 'proces verbal', 'pv', 'contract', 'formular', 'statut', 'adunare', 'aga', 'rules', 'minutes', 'form'],
    a: 'În „Documente”: le cauți după nume sau alegi categoria. Mai jos îți arăt și documentele care se potrivesc cu ce ai scris.',
    ae: 'In “Documents”: search by name or pick a category. Below I also show documents matching what you typed.',
    go: [['documente', 'Documente', 'Documents']] },
  { id: 'contact', q: 'Cum contactez administrația sau paza?', qe: 'How do I contact the administration or security?',
    k: ['contact', 'telefon', 'suna', 'paza', 'administrat', 'administrator', 'email', 'presedinte', 'cex', 'phone', 'security', 'call'],
    a: 'În „Contacte” găsești administrația, conducerea, CEx-ul și paza, cu telefon și e-mail. Pentru o problemă, cel mai bine e un tichet: rămâne scris și primești răspunsul în aplicație.',
    ae: 'In “Contacts” you’ll find the administration, board, executive committee and security, with phone and email. For a problem, a ticket is best: it stays on record and you get the answer in the app.',
    go: [['contacte', 'Contacte', 'Contacts'], ['tichete', 'Tichete', 'Tickets']] },
  { id: 'parola', q: 'Cum îmi schimb parola?', qe: 'How do I change my password?',
    k: ['parol', 'schimb parol', 'password'],
    a: 'În „Contul meu”, la „Parolă”, apeși „Schimbă parola”. Dacă ai uitat parola, pe ecranul de intrare apeși „Prima dată aici / Am uitat parola”: primești un cod pe e-mail și îți alegi una nouă.',
    ae: 'In “My account”, under “Password”, press “Change password”. If you forgot it, on the sign-in screen press “First time here / Forgot password”: you get a code by email and choose a new one.',
    go: [['profil', 'Contul meu', 'My account']] },
  { id: 'email', q: 'Cum îmi schimb adresa de e-mail?', qe: 'How do I change my email address?',
    k: ['schimb email', 'adresa email', 'mail nou', 'change email'],
    a: 'În „Contul meu” apeși „Schimbă e-mailul”. Primești un link pe adresa nouă; e-mailul se schimbă după ce apeși pe link.',
    ae: 'In “My account” press “Change email”. You get a link at the new address; the email changes once you click it.',
    go: [['profil', 'Contul meu', 'My account']] },
  { id: 'familie', q: 'Cum adaug pe cineva din familie sau un chiriaș?', qe: 'How do I add a family member or tenant?',
    k: ['familie', 'sotie', 'sot', 'copil', 'chirias', 'adaug persoan', 'membru', 'family', 'tenant', 'wife', 'husband'],
    a: 'În „Utilizatori” completezi prenumele, numele, e-mailul și alegi „Membru de familie” sau „Chiriaș”. Administrația aprobă cererea, apoi persoana primește invitația pe e-mail.',
    ae: 'In “Users” fill in first name, last name, email and choose “Family member” or “Tenant”. The administration approves the request, then the person gets the invitation by email.',
    go: [['utilizatori', 'Utilizatori', 'Users']] },
  { id: 'date', q: 'Datele mele sau apartamentul nu sunt corecte', qe: 'My details or apartment are wrong',
    k: ['date gresit', 'gresit', 'corect', 'apartament', 'unitate', 'proprietar', 'vandut', 'vanzare', 'wrong', 'sold'],
    a: 'Numele și telefonul le schimbi singur în „Contul meu”. Apartamentul, relația cu el (proprietar, chiriaș) sau o vânzare le poate schimba doar administrația: deschide un tichet și scrie ce trebuie corectat.',
    ae: 'You can change your name and phone in “My account”. The apartment, your relation to it or a sale can only be changed by the administration: open a ticket saying what needs fixing.',
    go: [['profil', 'Contul meu', 'My account'], ['tichete', 'Tichete', 'Tickets']] },
  { id: 'notif', q: 'Pot primi notificări pe e-mail?', qe: 'Can I get email notifications?',
    k: ['notific', 'email automat', 'anunt pe email', 'notification'],
    a: 'În „Contul meu”, la „Notificări pe email”, alegi ce vrei să primești. Preferința se salvează acum; e-mailurile automate pornesc în curând.',
    ae: 'In “My account”, under “Email notifications”, choose what you want. Your choice is saved now; automatic emails start soon.',
    go: [['profil', 'Contul meu', 'My account']] },
  { id: 'intretinere', q: 'Unde văd lista de întreținere?', qe: 'Where is the maintenance fee list?',
    k: ['intretinere', 'cheltuiel', 'restant', 'factura intretinere', 'platformis', 'maintenance', 'fee'],
    a: 'Listele de întreținere nu sunt în aplicația asociației; ele sunt pe Platformis (platformis.ro). Pentru întrebări despre sume, scrie administrației printr-un tichet (categoria „Financiar”).',
    ae: 'Maintenance fee lists are not in this app; they are on Platformis (platformis.ro). For questions about amounts, write to the administration in a ticket (category “Financial”).',
    go: [['tichete', 'Tichete', 'Tickets']] },
  { id: 'limba', q: 'Se poate în engleză?', qe: 'Is the app available in English?',
    k: ['engleza', 'english', 'limba', 'language', 'romana'],
    a: 'Da: apasă „EN” sus în pagină. Textele scrise de oameni (tichete, anunțuri) rămân cum au fost scrise.',
    ae: 'Yes: press “EN” at the top of the page (“RO” for Romanian). Texts written by people (tickets, announcements) stay as written.',
    go: [] },
];
const SUGG = ['rez', 'masina', 'bariera', 'tichet', 'cost', 'contact'];
const STOP = new Set('cum unde ce cand cine de la la pe in si sau un o este sunt pot poate imi mi ma meu mea al a sa se nu da the a an how do i my to of is can what where'.split(' '));

function score(f, qn) {
  const words = qn.split(' ').filter(w => w.length > 1 && !STOP.has(w));
  let s = 0;
  for (const k of f.k) {
    const kn = norm(k);
    if (kn.includes(' ')) { if (qn.includes(kn)) s += 3; continue; }
    if (words.some(w => w.startsWith(kn) || (w.length >= 4 && kn.startsWith(w)))) s += 1.5;
  }
  const title = norm(en() ? f.qe : f.q).split(' ').filter(w => w.length > 3 && !STOP.has(w));
  s += words.filter(w => w.length > 3 && title.some(t => t.startsWith(w) || w.startsWith(t))).length * 0.5;
  return s;
}
let DOCS = null;
async function docs() {
  if (DOCS) return DOCS;
  const { data } = await A().sb.from('documents').select('name, category, tags, url').order('created_at', { ascending: false });
  DOCS = data || []; return DOCS;
}
async function findDocs(qn) {
  const words = qn.split(' ').filter(w => w.length > 2 && !STOP.has(w));
  if (!words.length) return [];
  const list = await docs().catch(() => []);
  return list.map(d => { const t = norm(`${d.name} ${d.tags || ''} ${d.category}`); return { d, s: words.filter(w => t.includes(w)).length }; })
    .filter(x => x.s >= Math.min(2, words.length)).sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.d);
}

const T = (ro, e) => en() ? e : ro;
function answerHTML(f) {
  const go = (f.go || []).map(([r, l, le]) => `<a class="as-go" href="#${r}">${esc(T(l, le))} ›</a>`).join('');
  return `<div class="as-msg bot"><b>${esc(T(f.q, f.qe))}</b><p>${esc(T(f.a, f.ae))}</p>${go ? `<div class="as-gos">${go}</div>` : ''}</div>`;
}
const docHTML = ds => ds.length ? `<div class="as-msg bot"><b>${T('Documente găsite', 'Documents found')}</b>${ds.map(d => d.url?.startsWith('storage:')
  ? `<button type="button" class="as-doc" data-act="doc-open" data-p="${esc(d.url.slice(8))}">${esc(d.name)}</button>`
  : d.url ? `<a class="as-doc" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.name)}</a>` : '').join('')}</div>` : '';
const chips = ids => `<div class="as-chips">${ids.map(id => { const f = FAQ.find(x => x.id === id); return `<button type="button" class="as-chip" data-as="${id}">${esc(T(f.q, f.qe))}</button>`; }).join('')}</div>`;

async function ask(text) {
  const log = document.getElementById('as-log'); if (!log) return;
  log.insertAdjacentHTML('beforeend', `<div class="as-msg me">${esc(text)}</div>`);
  const qn = norm(text);
  const ranked = FAQ.map(f => ({ f, s: score(f, qn) })).filter(x => x.s >= 1.5).sort((a, b) => b.s - a.s);
  const ds = await findDocs(qn);
  let html = '';
  if (ranked.length) {
    html += answerHTML(ranked[0].f);
    const more = ranked.slice(1, 4).filter(x => x.s >= ranked[0].s * 0.5).map(x => x.f.id);
    html += docHTML(ds);
    if (more.length) html += `<div class="as-msg bot"><b>${T('Poate te interesează și', 'You may also want')}</b>${chips(more)}</div>`;
  } else if (ds.length) html += docHTML(ds);
  else html += `<div class="as-msg bot"><p>${T('Nu am găsit un răspuns la asta. Încearcă alte cuvinte, alege o întrebare de mai jos sau scrie administrației printr-un tichet.', 'I couldn’t find an answer. Try other words, pick a question below or write to the administration in a ticket.')}</p>${chips(SUGG)}<div class="as-gos"><a class="as-go" href="#tichete">${T('Tichet nou', 'New ticket')} ›</a></div></div>`;
  log.insertAdjacentHTML('beforeend', html);
  log.scrollTop = log.scrollHeight;
}
function open() {
  let p = document.getElementById('as-panel');
  if (p) { p.hidden = !p.hidden; if (!p.hidden) p.querySelector('input').focus(); return; }
  p = document.createElement('div'); p.id = 'as-panel'; p.dataset.l = String(en()); p.setAttribute('data-notr', ''); p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', T('Asistent', 'Assistant'));
  p.innerHTML = `<div class="as-head"><b>${T('Asistent', 'Assistant')}</b><span class="small">${T('Răspunsuri despre aplicație', 'Answers about the app')}</span><button type="button" class="as-x" aria-label="${T('Închide', 'Close')}">×</button></div>
    <div class="as-log" id="as-log"><div class="as-msg bot"><p>${T('Bună! Scrie ce vrei să afli sau alege o întrebare.', 'Hi! Type what you want to know or pick a question.')}</p>${chips(SUGG)}</div></div>
    <form class="as-form"><input type="text" maxlength="200" placeholder="${T('ex. cum rezerv un loc', 'e.g. how do I book a spot')}" aria-label="${T('Întrebarea ta', 'Your question')}"><button type="submit">${T('Întreabă', 'Ask')}</button></form>`;
  document.body.appendChild(p);
  p.querySelector('.as-x').onclick = () => { p.hidden = true; };
  p.querySelector('form').onsubmit = e => { e.preventDefault(); const i = p.querySelector('input'); const v = i.value.trim(); if (v) { i.value = ''; ask(v); } };
  p.addEventListener('click', e => {
    const c = e.target.closest('[data-as]'); if (c) { const f = FAQ.find(x => x.id === c.dataset.as); ask(T(f.q, f.qe)); }
    if (e.target.closest('.as-go') && matchMedia('(max-width: 760px)').matches) p.hidden = true;
  });
  p.querySelector('input').focus();
}
function sync() {
  const S = A().S, show = !!(S?.session && S?.me && S.me.access !== 'paza');
  let b = document.getElementById('as-btn');
  const pn = document.getElementById('as-panel'); if (pn && pn.dataset.l !== String(en())) pn.remove();
  if (!show) { b?.remove(); document.getElementById('as-panel')?.remove(); DOCS = null; return; }
  if (!b) {
    b = document.createElement('button'); b.id = 'as-btn'; b.type = 'button'; b.setAttribute('data-notr', '');
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 16.5v.01"/></svg><span></span>`;
    b.onclick = open; document.body.appendChild(b);
  }
  b.querySelector('span').textContent = T('Ajutor', 'Help'); b.setAttribute('aria-label', T('Asistent – întrebări despre aplicație', 'Assistant – questions about the app'));
}
setInterval(sync, 1500); sync();
