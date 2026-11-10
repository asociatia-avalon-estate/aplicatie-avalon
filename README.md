# aplicatie-avalon

Aplicația Asociației de Proprietari Avalon Estate (înlocuiește Sigtree).

- Front-end: HTML + JavaScript simplu (fără build), publicat pe Netlify din ramura `main`.
- Date și login: Supabase (proiect `avalon-estate`, Frankfurt). Login cu cod de 6 cifre pe email.
- Securitatea datelor e asigurată în baza de date (Row Level Security): cheia din `app.js` este cheia publică, sigură pentru browser.

## Fișiere
- `index.html` – pagina de pornire
- `styles.css` – aspectul (preluat din prototip)
- `app.js` – aplicația
- `netlify.toml` – setări Netlify (fără indexare în Google)

## Versiune
v0.1 – login, acasă, parcare vizitatori, tichete, anunțuri, documente (listă), contacte, profil, admin utilizatori, pază.
