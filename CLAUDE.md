# CLAUDE.md

Projekt-Notizen für Claude Code. Kurz halten, stur befolgen.

## Harte Regeln

- **Build muss immer perfekt sein — ausnahmslos.** Kein Commit/Push, solange `npm run build` **oder** `npm run pages:build` (der Cloudflare-Build) eine Warning, eine Deprecation, einen Hinweis/eine Empfehlung („consider updating …“, „experimental“, „unsupported“) oder einen Fehler zeigt. Nichts davon „für später“ liegen lassen oder nur erwähnen, sondern sofort beheben. Einzige Ausnahme: die Meldung „Proxy environment variables detected“, die nur in der Claude-Sandbox erscheint. Lockfile-/tsconfig-Patches, die Next.js beim Build vornimmt, gehören ins Repo (committen).
- Sicherheits-Flags wie `--dangerouslyUseUnsupportedNextVersion` sind keine Lösung — stattdessen Abhängigkeiten aktualisieren.
- **Typecheck muss grün sein.** `npm run typecheck` läuft auch im pre-commit Hook (lefthook) — nicht umgehen.
- Vor dem Push immer `npm run build` **und** `npm run pages:build` laufen lassen, nicht nur Typecheck. Läuft der Cloudflare-Build nicht durch, geht nichts live (so stand die Website 20.–30.10.2026 still).
- Keine `--no-verify` Commits, keine Hook-Skips.

## Commands

```bash
npm run dev          # Lokaler Dev-Server
npm run build        # Produktions-Build (MUSS warning-free sein)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (aktuell defekt wegen Flat-Config, nicht blockierend)
npm run preview      # Cloudflare Workers Preview (opennextjs-cloudflare + wrangler)
```

## Stack-Kurzfassung

- Next.js 16 (App Router, `'use client'` häufig) auf Cloudflare Pages/Workers via `@opennextjs/cloudflare`
- **Deployment:** Cloudflare Pages baut bei jedem Push auf `main` (`npm run pages:build` = `scripts/pages-build.mjs`). Pages bündelt `_worker.js` beim Hochladen immer mit seinem eigenen wrangler 3.114 neu (ersetzt Node-Bausteine durch unenv-Nachbauten → Next.js 16 liefert 500). Darum bündelt das Skript selbst und holt Node-Bausteine per `process.getBuiltinModule`. Änderungen daran immer so prüfen: mit wrangler 3.114 bündeln, mit aktuellem wrangler ungebündelt starten (30.10.2026)
- D1 (SQLite) als DB — Zugriff über `getCloudflareContext().env.DB`
- Cloudflare Images für Uploads (über `/api/admin/media`)
- Tailwind + framer-motion + lucide-react

## Admin-Auth

- Eigener Login mit Admin-Passwort → Session-Cookie `szh_admin_session` (`src/lib/server/adminAuth.ts`)
  - Passwort als PBKDF2-Hash in `settings.admin_code_hash` — setzen im Admin Center (Tab System) oder mit `npm run set-admin-password` (wirkt sofort)
  - Notfall-Passwort als Cloudflare Pages Secret `ADMIN_PASSWORD` — greift erst ab dem nächsten Deployment
  - Sessions serverseitig in `admin_auth_sessions`, gespeichert nur der SHA-256-Hash des Tokens
- **WICHTIG:** Öffentliche Routen außerhalb von `/api/admin` mit schreibenden Methoden prüfen selbst `isAdminAuthenticated(request)`: `/api/blog` (POST/PUT/DELETE, Entwürfe nur für Admins), `/api/content-texts` (POST), `/api/media` (PATCH), `/api/site-settings` (POST)
- **WICHTIG:** `cloudflare-worker.js` (Einstieg des Cloudflare-Workers, vor Next.js; kein `middleware.ts`/`proxy.ts`, da Next 16 dort nur Node erlaubt) schützt jede Route unter `/api/admin`. Öffentlich nur `/api/admin/auth` und `/api/admin/media/file/…` (Website-Bilder). Endpunkte für Dritte (Beds24-Webhook, Buchungsschluss, Partner-Verbindung `/api/partner`, Instagram-Rücksprung `/api/instagram/callback`) gehören NICHT unter `/api/admin`. Achtung: Bei `npm run dev` läuft kein Worker, dort ist die Schranke nicht aktiv — nur lokal nutzen.

## Beds24

- Admin-Tab „Beds24“: `src/components/admin/Beds24Panel.tsx` + `Beds24Cockpit.tsx`, API `src/app/api/admin/beds24/route.ts`, Server-Lib `src/lib/server/beds24*.ts`
- Beds24-Konto wird mit der Natberger Hütte geteilt → alles auf `settings.beds24_property_id` beschränkt (serverseitig erzwungen)
- Webhook: `src/app/api/beds24-webhook/route.ts`, Buchungsschluss: `src/app/api/booking-cutoff/route.ts` + `.github/workflows/buchungsschluss.yml`
- Buchung auf der Website: kein eingebetteter Beds24-Kalender mehr (Entscheidung 20.10.2026). Suche (Anreise/Abreise/Personen) `src/components/brand/BookingSearch.tsx` im Hero und im Buchungsbereich (`src/components/sections/Buchung.tsx`: grüner Satz + Suche); „Anfragen“ öffnet per `beds24FormUrl` (`src/lib/booking.ts`) direkt das Beds24-Formular mit Preisaufstellung (Unterkunft 359833, Zimmer 741929, `br1-741929=Book`, `hideheader=1`) in neuem Fenster. Zeitraum in der Adresse (`?anreise=…&abreise=…&erwachsene=…&kinder=…`) füllt die Suche vor. Preise, Mindestaufenthalt, Endreinigung, Ortstaxe, Extras zeigt nur Beds24 — keine Preise im Code. Roter Knopf heißt „Anfragen“. Feratel/Deskline ist entfernt
- Kalender in der Suche (Wunsch 01.11.2026, im Buchungsbereich fest im Kästchen seit 02.11.2026 — `inline`, im Aufmacher als Aufklapper): Anreise/Abreise wählt man in `src/components/brand/AvailabilityCalendar.tsx` (aktueller + Folgemonat, frei/belegt/Wechseltag, blättern und Monatsauswahl bis „Buchbar bis“ bzw. Ende des Beds24-Fensters, Mindestaufenthalt, „Anfragen“ direkt im Kalender). Daten: öffentlich `/api/availability` → `src/lib/server/publicAvailability.ts` (nur gesperrte Nächte + Mindestaufenthalt, keine Preise; belegt = Beds24 ∪ iCal der Portale (`src/lib/server/icalSources.ts`, wie im Cockpit) ∪ nicht stornierte Buchungen der Gästedatenbank, sonst fehlen Buchungen, die Beds24 noch als frei führt (02.11.2026); Zwischenspeicher `settings.public_availability_cache` 10 Min., geleert bei Webhook, `setBeds24Availability`, „Buchbar bis“ und Buchungen im Admin Center), Client `src/lib/availability.ts`

## Verbindung zur Natberger Hütte und Preisübersicht

- Beide Admin Center sind gekoppelt („Partner“): `src/lib/server/partner.ts`, Gegenstück `lib/server/partner.ts` im Repo `natbergerhuette` — **gleiches Protokoll, Änderungen immer in beiden Repos**
  - Kopplung per Code im Tab „Preisübersicht“; Adresse und gemeinsamer Schlüssel in `settings` (`partner_url`, `partner_secret`, `partner_name`, `partner_hut`)
  - `/api/partner`: Aufrufe von Server zu Server, HMAC-signiert (Zeitstempel, Einmalwert in `partner_nonces`, Body) — keine Admin-Session
  - Hütten-Umschalter im Kopf (`src/components/admin/HutSwitch.tsx`, Handy als Auswahlmenü): eigene Hütte | andere Hütte | Beide. Andere Hütte = Wechsel per einmaligem Ticket, direkte Anmeldung nur mit `settings.partner_sso_allowed = 1`. „Beide“ = beide Hütten hier (`?huts=both`), nur in den Tabs Portalpreise und Preisübersicht
- Tab „Preisübersicht“: `src/components/admin/PriceOverview.tsx` + `price-overview/*`, API `src/app/api/admin/price-overview/route.ts`
- Rechenlogik `src/lib/pricing/dynamicPricing.ts` liegt **identisch** im Repo `natbergerhuette`; Nachfrage je Nacht aus `src/lib/demand/*` (Kopie aus `natbergerhuette/lib/demand`, angepasst an `noUncheckedIndexedAccess`)
- Saisonpreise eines Jahres mit einem Klick: `src/lib/pricing/seasonPlan.ts` (identisch in beiden Repos, derzeit nur Natberger Hütte 2027), Vorschau und Übernahme in `price-overview/SeasonPlanPanel.tsx`
- Server `src/lib/server/priceOverview.ts`: nur Zimmer der gewählten Unterkunft (`settings.beds24_property_id`), schreibt nur `price1`/`minStay`, vorher Sicherung (`beds24Snapshots.ts`); Regeln in `settings.price_rules`
- Schreibt die Preisübersicht Preise, weichen sie danach ggf. von den Saisonpreisen im Tab „Mietpreise“ ab (Beds24SeasonSync zeigt das an)

## Portalpreise

- Start des Admin Centers: Tab „Gäste“ mit dem Kalender (Wunsch 27.10.2026)
- Tab „Portalpreise“ (`src/components/admin/HutDashboard.tsx` + `hut-dashboard/*`, Tab-ID `platforms`, früher „Übersicht“/`dashboard`): tagesaktuelle Preise je Plattform und Belegung, Woche/Monat, blättern per Pfeil/Pfeiltaste/Wischen
- `src/lib/dashboard/hutDashboard.ts`, `src/lib/server/hutDashboard.ts` und die Komponenten liegen **identisch** im Repo `natbergerhuette` (dort ohne `src/`) — Änderungen immer in beiden Repos
- Server liest aus Beds24 nur (Kalender mit price1–16, Mindestaufenthalt, Verfügbarkeit, Buchungen des Zimmers über `resolveRoom`); API `src/app/api/admin/dashboard/route.ts`, Partner-Aktionen `dashboardData` (ohne Gastnamen) und `savePlatformConfig`
- Plattformpreise: Kanal-Multiplikatoren gibt Beds24 nicht über die API heraus → `settings.platform_prices` je Hütte (Preisfeld, Faktor, ± €/Nacht, Rundung), einstellbar über „Plattformpreise“

## Anmeldung bei der Gemeinde (Pre-Check-in)

- Seit 1.11.2026 Pflicht in Kärnten: Gäste melden sich über Feratel/Deskline an. Links in `src/lib/registration.ts` (`PRECHECKIN_URL` vor der Anreise, `CHECKIN_URL` ab Anreisetag)
- Gäste-App `src/app/gaeste/page.tsx`: Karte „Wichtig: Anmeldung …“ ganz oben (`RegistrationCard`), „Schon erledigt“ klappt sie auf dem Gerät zusammen
- Nachrichten (`src/lib/guestTemplates.ts`): kurzer Absatz in den Willkommensvorlagen DE/EN, ausführliche Vorlage `buildPreCheckinText` (Text von Malte, du/ihr) im Beds24-Cockpit „Vorlage Pre-Check-in“

## Instagram

- Kanal @sechszirbenhuette auf der Startseite (`src/components/sections/Instagram.tsx`), Daten von `/api/instagram` (öffentlich, zwischengespeichert in `settings.instagram_feed_cache`, stündlich neu, nach Fehlschlag frühestens nach 15 Min.)
- Server `src/lib/server/instagram.ts`: „Instagram API mit Instagram-Login“ (Meta-App mit Instagram-App-ID/-Geheimnis, Scope `instagram_business_basic`), Schlüssel 60 Tage, wird nach 7 Tagen verlängert; Geheimnis und Schlüssel verlassen den Server nie
- Admin-Tab „Instagram“ (`src/components/admin/InstagramPanel.tsx`, API `src/app/api/admin/instagram/route.ts`): Anleitung, App-Daten, „Mit Instagram verbinden“ oder Schlüssel einfügen, Feed an/aus
- Rücksprung `src/app/api/instagram/callback/route.ts` liegt bewusst außerhalb von `/api/admin`, geschützt durch den Einmalwert `state` (15 Min., einmal nutzbar). In der Meta-App ist genau eine Weiterleitungsadresse eingetragen: `https://sechszirbenhuette.com/api/instagram/callback` (auch beim Admin Center über www; zurück geht es zur Herkunft)

## Corporate Design (öffentliche Website)

- Grundlage: Corporate Design „Zirbenzweig und Fassadenbraun“ V3 + Claude-Code-Briefing (15.10.2026)
- Tokens/Bausteine: `src/styles/brand.css`, Tailwind-Farben `zirbe`, `leinen`, `fassadenbraun` (nicht mehr verwendet), `fensterladenrot`, `on-red`, `rinde`, `moos`, `holz`
- Komponenten: `src/components/brand/*` (BrandLogo, BookingCTA, HutChapters = M2, ZirbenMark/HostGreeting = M3, MotionToggle), Bewegungspräferenz `src/contexts/MotionContext.tsx`
- Sprachen: de, en, it, sl, nl (Niederländisch seit 02.11.2026) — `src/locales/*.json`, Umschalter `src/components/layout/LanguageSwitcher.tsx`
- Ansprache auf der Website durchgehend „Sie“ (Briefing 18.10.2026), auch in Alt-Texten, Buttons, Fehlermeldungen; Fakten (85 m², 2 Schlafzimmer, 2 Bäder + WC …) in den Sprachdateien `src/locales/*.json` (`brand`, `amenities`, `buchung`)
- Regeln: Schrift nie rot; Rot nur als Hintergrund des Buchen-Buttons (Beschriftung „Anfragen“); kein Braun auf der Website (Fassadenband und Fensterläden entfernt, 30.10.2026); keine Herzen; Northwell nur kurz, Grün/Leinen, nie über Video/Fotos; Hero-Video bleibt
- Platzhalter bis zum Designpaket: Gill Sans Nova (lokale Gill Sans/Systemschrift), Northwell (Autography), Fugenband-Geometrie, Logo/Zweig aus `public/images/logo.svg` abgeleitet

## Layout der Startseite (Briefing 18.10.2026)

- Kopf und Aufmacher im früheren Aufbau mit neuem Schriftbild (Zwischenstand, Wunsch 23.10.2026): `src/components/layout/Header.tsx` — Logo-Schild (`.brand-logo-sign`, weißes Logo 240 px auf Grün) in der Mitte, Ziele in Versalien (`.brand-nav-link`) links/rechts daneben, außen links Sprache, außen rechts Instagram/Google (`SocialLinks.tsx`, ab 1280 px; schmaler im Menü) und „Anfragen“; Startseite durchsichtig über dem Film, ab 1024 px fest mit Leinenfläche beim Scrollen, schmaler scrollt er mit; Unterseiten Leinenfläche. `src/components/sections/Hero.tsx` — Film vollflächig, Ort/Leitidee/Einleitung mittig in der Grundschrift (`.brand-hero-title`, Northwell nie über dem Film), ab 1024 px Suchleiste (`BookingSearch variant="bar"`) im Bild, schmaler Suche auf Grün darunter. Ab dem Abschnitt „Die Hütte in Kürze“ gilt der neue Aufbau

- Abschnitte: Klasse `brand-section` (Abstände Handy/Tablet/Desktop) und Kopf `src/components/brand/SectionHeader.tsx` (Marke, Überschrift, Einleitung, optional Handlung) — Schriftgrößen aus `brand.css` (clamp), nicht aus den Admin-Texten
- Ausstattung: Desktop 12 Spalten (Kopf + Grundriss haftend links, Karten rechts), Tablet 2 Spalten, Handy Wischreihe (`brand-snap-row`)
- Galerie: Bento (je 8 Bilder ein Leitbild 2×2 und ein breites 2×1, Reihenfolge aus dem Tab Bilder), „Weitere Bilder“, Lightbox mit Tastatur/Wischen
- Hüttenkapitel: ab 1024×700 haftendes Bild bis an den linken Bildschirmrand (`--content-inset`), Handy randlos
- Bilder: `src/lib/imageVariants.ts` (`responsiveSource`) — Cloudflare-Varianten thumb 640 / medium 1280 / large 1920 / hero 2560, eingerichtet beim Laden des Admin Centers (`src/lib/server/imageVariants.ts` über auto-migrate), Schalter `site_settings.imageVariants`, im Frontend `useImageVariants()`

## Wichtige Pfade

- **Datumsfelder im Admin Center:** `src/components/admin/shared/GermanDateInput.tsx` (TT.MM.JJJJ unabhängig von der Browsersprache, identisch im Repo `natbergerhuette`), kein `<input type="date">`
- **Blog-Editor (Admin):** `src/components/admin/BlogEditor.tsx` + `src/components/admin/blog-editor/*`
- **Öffentliche Blog-Seite:** `src/app/blog/[slug]/page.tsx`; auf der Startseite ein Modul mit drei Teasern (Wunsch 31.10.2026): `src/components/sections/BlogTeaser.tsx` (unter „Umgebung“; Auswahl per `FEATURED_SLUGS`, erster = Leitbeitrag groß links, zwei rechts; fehlt einer, füllen die neuesten auf)
- **Blog-API:** `src/app/api/blog/route.ts` (GET/POST/PUT/DELETE)
- **SEO / KI-Suche (31.10.2026):** Blogseiten werden serverseitig gerendert — `src/app/blog/page.tsx` und `src/app/blog/[slug]/page.tsx` laden aus D1 (`src/lib/server/blog.ts`), setzen Titel/Beschreibung/Bild/Canonical per `generateMetadata` und schreiben JSON-LD (BlogPosting, BreadcrumbList, FAQPage aus dem Abschnitt „Häufige Fragen“: `<h2>…Fragen…</h2>` + `<p><b>Frage</b><br>Antwort</p>`) ins HTML; Darstellung in `BlogPostView.tsx`/`BlogIndexView.tsx` (Client). Nie wieder Beitragstext erst im Browser laden — Crawler von ChatGPT/Perplexity/Claude führen kein JavaScript aus
  - Kanonische Adresse `SITE_URL` in `src/lib/site.ts` (www.sechszirbenhuette.com), strukturierte Daten in `src/lib/structuredData.ts` (Startseite: LodgingBusiness/VacationRental, WebSite, Organization)
  - `sitemap.xml` dynamisch aus `src/app/sitemap.ts` (daher NICHT in `public/_routes.json` ausschließen), `public/robots.txt` statisch mit Verweis auf die www-Sitemap
- **Media-API:** `src/app/api/admin/media/route.ts` (Upload) + `src/app/api/media/route.ts` (lesen)
- **DB-Schema:** `db/schema.sql`, Migrations: `migrations/`

## Blog-Layouts

- `standard` — Rich-Text + optionale Galerie-Bilder (`blog_post_images`)
- `carousel` — Slides mit Bild/Titel/Beschreibung (`blog_post_images`)
- `tabs` — Content ist JSON in `blog_posts.content`: `{ intro, tabs: [{ title, type, sectionTitle, slides: [...] }] }`
  - Tab-Typen: `undefined` (Standard), `dog-carousel`, `kids-accordion`
  - `dog-carousel` Slides haben `image_url` direkt auf dem Slide (bevorzugt) — Fallback über `DOG_TRIP_CATEGORIES` aus der globalen `media`-Tabelle (Legacy).

## Git / Branching

- Feature-Branches: `claude/<topic>-<random>` oder `ccr-<random>` — beide werden nach grünem Build automatisch nach `main` gemergt (`.github/workflows/auto-merge-to-main.yml`)
- Nie direkt auf `main` pushen.
- PRs nur auf explizite Anfrage erstellen.
