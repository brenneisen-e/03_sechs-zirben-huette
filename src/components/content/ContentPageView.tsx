import Link from 'next/link';
import {
  FACTS,
  NATBERGER_URL,
  PAGES,
  getPage,
  type ContentPage,
  type FactKey,
  type PageImage,
} from '@/content/seiten';
import { Buchung } from '@/components/sections/Buchung';
import { Location } from '@/components/sections/Location';

// Unterseite aus src/content/seiten.ts — Serverkomponente ohne eigenes
// JavaScript: Antwortsatz, Faktentabelle, Abschnitte, sichtbare Fragen und
// Antworten stehen vollständig im HTML (Crawler von ChatGPT, Perplexity und
// Claude führen kein JavaScript aus). Nur Buchungskalender und Karte sind
// Client-Bausteine der Startseite.

function Photo({ image, priority = false }: { image: PageImage; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fertig verkleinerte Datei aus public/
    <img
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className="block h-auto w-full rounded-[4px]"
    />
  );
}

export function FactTable({ facts, caption }: { facts: FactKey[]; caption: string }) {
  if (facts.length === 0) return null;
  return (
    <table className="w-full border-collapse text-left text-[1rem]">
      <caption className="brand-label pb-4 text-left text-zirbe">{caption}</caption>
      <tbody>
        {facts.map((key) => (
          <tr key={key} className="border-t border-zirbe/20 align-top last:border-b">
            <th scope="row" className="w-[42%] py-3 pr-4 font-medium text-zirbe">
              {FACTS[key].label}
            </th>
            <td className="py-3 text-rinde">{FACTS[key].value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const COMPARISON: { label: string; szh: string; natberger: string }[] = [
  { label: 'Personen', szh: 'bis 5', natberger: '8' },
  { label: 'Wohnfläche', szh: '85 m²', natberger: '125 m²' },
  { label: 'Schlafzimmer', szh: '2', natberger: '3' },
  { label: 'Höhe', szh: '1.700 m', natberger: '1.800 m' },
  { label: 'Lage', szh: 'Alleinlage, 800 m zum Falkertsee', natberger: 'am Skigebiet Falkert' },
  { label: 'Sauna', szh: 'finnische Sauna mit Ruheraum', natberger: 'Sauna mit Ruheraum' },
  { label: 'Hunde', szh: 'willkommen', natberger: 'bis zu 2 Hunde' },
];

function ComparisonTable() {
  return (
    <section aria-labelledby="vergleich-title" className="brand-section bg-leinen !pt-0">
      <div className="brand-container">
        <div className="overflow-x-auto rounded-[4px] border border-zirbe/15 bg-white p-5 md:p-8">
          <table className="w-full min-w-[32rem] border-collapse text-left text-[1rem]">
            <caption id="vergleich-title" className="brand-label pb-4 text-left text-zirbe">
              Beide Hütten im Vergleich
            </caption>
            <thead>
              <tr className="align-bottom">
                <td />
                <th scope="col" className="py-3 pr-4 font-medium text-zirbe">
                  Sechszirbenhütte
                </th>
                <th scope="col" className="py-3 font-medium text-zirbe">
                  Natberger Hütte
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-t border-zirbe/20 align-top">
                  <th scope="row" className="py-3 pr-4 font-medium text-zirbe">
                    {row.label}
                  </th>
                  <td className="py-3 pr-4 text-rinde">{row.szh}</td>
                  <td className="py-3 text-rinde">{row.natberger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** Kurzer Verweis auf die Schwesterhütte — beschreibender Link im Fließtext */
export function SisterHut() {
  return (
    <aside
      aria-labelledby="schwester-title"
      className="rounded-[4px] border border-zirbe/15 bg-white p-5 md:p-8"
    >
      <h2 id="schwester-title" className="text-[1.375rem] leading-snug text-zirbe">
        Mehr Platz gesucht?
      </h2>
      <p className="mt-3 max-w-3xl text-rinde">
        Für Gruppen und zwei Familien gibt es unsere zweite Hütte am Falkert: die{' '}
        <a href={NATBERGER_URL} className="brand-link">
          Natberger Hütte, ein Ferienhaus für 8 Personen mit 125 m² und Sauna auf 1.800 m
        </a>
        . Einen Überblick über beide Häuser finden Sie unter{' '}
        <Link href="/huetten-am-falkertsee" className="brand-link">
          Hütten am Falkertsee
        </Link>
        .
      </p>
    </aside>
  );
}

export function ContentPageView({ page }: { page: ContentPage }) {
  const related = page.related
    .map((slug) => getPage(slug))
    .filter((p): p is ContentPage => p !== undefined);
  const showBookingBand = page.extra !== 'buchung';

  return (
    <div className="brand-page">
      <article>
        <header className="brand-container pt-8 md:pt-12">
          <nav aria-label="Brotkrumen" className="text-[0.9375rem] text-rinde/80">
            <ol className="flex flex-wrap gap-x-2">
              <li>
                <Link href="/" className="brand-link">
                  Startseite
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{page.name}</li>
            </ol>
          </nav>
          <p className="brand-label mt-8 text-zirbe">{page.label}</p>
          <h1 className="brand-h2 mt-3 max-w-4xl text-zirbe">{page.h1}</h1>
          <p className="brand-intro mt-5 max-w-3xl text-rinde">{page.lead}</p>
        </header>

        <div className="brand-container mt-8 grid gap-6 md:mt-10 lg:grid-cols-12 lg:gap-10">
          <figure className={page.facts.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
            <Photo image={page.image} priority />
          </figure>
          {page.facts.length > 0 && (
            <div className="rounded-[4px] border border-zirbe/15 bg-white p-5 md:p-8 lg:col-span-5 lg:self-start">
              <FactTable facts={page.facts} caption="Die Hütte in Zahlen" />
            </div>
          )}
        </div>

        {page.extra === 'buchung' && <Buchung />}

        <div className="brand-container brand-section space-y-12 md:space-y-16">
          {page.sections.map((section, index) => (
            <section
              key={section.heading}
              className={
                section.image ? 'grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-10' : ''
              }
            >
              <div className={section.image ? 'lg:col-span-6' : 'max-w-3xl'}>
                <h2 className="text-[1.5rem] leading-snug text-zirbe md:text-[1.75rem]">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-rinde">
                    {paragraph}
                  </p>
                ))}
                {section.list && (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-rinde">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.links && (
                  <ul className="mt-5 flex flex-col gap-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        {link.href.startsWith('http') ? (
                          <a href={link.href} className="brand-link">
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} className="brand-link">
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {section.image && (
                <figure className={`lg:col-span-6 ${index % 2 === 1 ? 'lg:order-first' : ''}`}>
                  <Photo image={section.image} />
                </figure>
              )}
            </section>
          ))}

          {page.faq && page.faq.length > 0 && (
            <section aria-labelledby="fragen-title" className="max-w-3xl">
              <h2
                id="fragen-title"
                className="text-[1.5rem] leading-snug text-zirbe md:text-[1.75rem]"
              >
                {page.slug === 'faq' ? 'Fragen und Antworten' : 'Häufige Fragen'}
              </h2>
              <dl className="mt-4">
                {page.faq.map((item) => (
                  <div key={item.question} className="border-t border-zirbe/20 py-4 last:border-b">
                    <dt className="font-medium text-zirbe">{item.question}</dt>
                    <dd className="mt-1 text-rinde">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {page.sister && <SisterHut />}
        </div>

        {page.extra === 'vergleich' && <ComparisonTable />}
        {page.extra === 'anfahrt' && <Location />}

        {showBookingBand && (
          <section aria-labelledby="buchen-band-title" className="on-zirbe bg-zirbe text-leinen">
            <div className="brand-container flex flex-col gap-5 py-10 md:flex-row md:items-center md:justify-between md:py-12">
              <div>
                <h2 id="buchen-band-title" className="text-[1.5rem] leading-snug">
                  Freie Termine und Preise prüfen
                </h2>
                <p className="mt-2 text-leinen/85">
                  Direkt bei uns buchen – ohne Portalgebühren, mit vollständiger Preisaufstellung.
                </p>
              </div>
              <Link href="/preise-buchen" className="brand-cta shrink-0">
                Preise &amp; Buchen
              </Link>
            </div>
          </section>
        )}

        <nav aria-labelledby="weiter-title" className="brand-container py-10 md:py-12">
          <h2 id="weiter-title" className="brand-label text-zirbe">
            Weiterlesen
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/${item.slug}`} className="brand-secondary">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </div>
  );
}

/** Alle Unterseiten für Menü und Fuß */
export const PAGE_LINKS = PAGES.map((page) => ({ href: `/${page.slug}`, name: page.name }));
