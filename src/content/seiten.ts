// Inhalte der Unterseiten (SEO-/GEO-Strategie, Todo-Liste von Malte,
// 13.11.2026). Reiner Text ohne JavaScript: Die Seiten werden beim Build
// fertig erzeugt (src/app/[seite]/page.tsx) und stehen vollständig im HTML.
//
// Regeln:
// - Ansprache „Sie“, sachlich, nur belegte Angaben (Quelle: Sprachdateien,
//   Todo-Liste). Keine Preise — die zeigt nur der Buchungskalender (Beds24).
// - Jede Seite beginnt mit einem Antwortsatz (`lead`), danach Faktentabelle.
// - Title steht vollständig da (kein Anhängen von „| Sechszirbenhütte“).
// - `updated` bei jeder inhaltlichen Änderung anpassen — daraus entsteht
//   `lastmod` in der Sitemap.
// - Keine Seiten je Nachbarort, kein versteckter Text.

export interface PageImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface PageSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
  image?: PageImage;
  links?: { href: string; label: string }[];
}

export interface PageFaq {
  question: string;
  answer: string;
}

export type FactKey =
  | 'lage'
  | 'alter'
  | 'personen'
  | 'schlafzimmer'
  | 'baeder'
  | 'wohnflaeche'
  | 'sauna'
  | 'hunde'
  | 'wlan'
  | 'heizung'
  | 'garten'
  | 'falkertsee'
  | 'skigebiet'
  | 'orte'
  | 'zeiten'
  | 'preise'
  | 'parken';

export interface ContentPage {
  slug: string;
  /** Kurzname für Menü, Brotkrumen und Verweise */
  name: string;
  title: string;
  description: string;
  h1: string;
  label: string;
  lead: string;
  updated: string;
  image: PageImage;
  facts: FactKey[];
  sections: PageSection[];
  faq?: PageFaq[];
  /** Zusatzbaustein unter dem Text */
  extra?: 'buchung' | 'anfahrt' | 'vergleich';
  /** Schwesterhütten-Block anzeigen */
  sister?: boolean;
  related: string[];
}

export const NATBERGER_URL = 'https://www.natberger-huette.de/';

/** Belegte Kerndaten — eine Quelle für alle Faktentabellen */
export const FACTS: Record<FactKey, { label: string; value: string }> = {
  lage: { label: 'Lage', value: 'Alleinlage auf 1.700 m am Falkert, Kärnten (Nockberge)' },
  alter: { label: 'Alter der Hütte', value: 'über 250 Jahre' },
  personen: { label: 'Personen', value: 'bis 5' },
  schlafzimmer: {
    label: 'Schlafzimmer',
    value: '2 (Doppelbett; Doppelbett und Einzelbett)',
  },
  baeder: { label: 'Bäder', value: '2 Bäder und ein separates WC, Fußbodenheizung' },
  wohnflaeche: { label: 'Wohnfläche', value: '85 m² auf zwei Etagen' },
  sauna: {
    label: 'Sauna',
    value: 'eigene finnische Sauna mit Ruheraum, Regendusche und Sauna-Terrasse',
  },
  hunde: { label: 'Hunde', value: 'willkommen' },
  wlan: { label: 'WLAN', value: '220 Mbit/s' },
  heizung: { label: 'Heizung', value: 'Pelletofen in der Stube, Fußbodenheizung in den Bädern' },
  garten: { label: 'Almgarten', value: '1.200 m², nicht eingezäunt' },
  falkertsee: { label: 'Falkertsee', value: '800 m' },
  skigebiet: { label: 'Skigebiet Heidi Alm Falkert', value: '800 m mit dem Auto' },
  orte: {
    label: 'Bad Kleinkirchheim, Turracher Höhe',
    value: 'jeweils ca. 20 Minuten mit dem Auto',
  },
  zeiten: { label: 'Check-in / Check-out', value: 'ab 15 Uhr / bis 10 Uhr' },
  preise: {
    label: 'Preise und Mindestaufenthalt',
    value: 'im Buchungskalender und im Buchungsformular, mit allen Pflichtgebühren',
  },
  parken: { label: 'Parken', value: 'eigener Parkplatz an der Hütte' },
};

const img = (name: string, alt: string, width = 1600, height = 1205): PageImage => ({
  src: `/images/seiten/${name}.jpg`,
  alt,
  width,
  height,
});

const UPDATED = '2026-11-13';

export const PAGES: ContentPage[] = [
  {
    slug: 'sauna',
    name: 'Sauna',
    title: 'Berghütte mit eigener Sauna in Kärnten · Falkert 1.700 m',
    description:
      'Private Sauna mit Ruheraum und Sauna-Terrasse in einer 250 Jahre alten Hütte. Nur für Sie, bis 5 Personen, im Biosphärenpark Nockberge.',
    h1: 'Eigene Sauna mit Ruheraum und Terrasse auf 1.700 m',
    label: 'Sauna',
    lead: 'Die Sechszirbenhütte am Falkert in Kärnten hat eine eigene finnische Sauna mit Ruheraum, Regendusche und Sauna-Terrasse – sie gehört während Ihres Aufenthalts nur Ihnen und liegt in einem Anbau direkt an der Hütte.',
    updated: UPDATED,
    image: img('sauna', 'Finnische Sauna der Sechszirbenhütte mit Holzbänken und Saunaofen'),
    facts: ['sauna', 'personen', 'lage', 'baeder', 'heizung', 'zeiten'],
    sections: [
      {
        heading: 'Ein Sauna-Anbau nur für Ihre Gruppe',
        paragraphs: [
          'Die Sauna teilen Sie mit niemandem. Sie liegt im Anbau der über 250 Jahre alten Hütte, wenige Schritte von der Stube entfernt. Sie heizen ein, wann es Ihnen passt: nach dem Skitag, nach einer Wanderung in den Nockbergen oder an einem Regentag.',
          'Zur Sauna gehören eine Regendusche und eine eigene Sauna-Terrasse. Dort kühlen Sie an der Bergluft ab – auf 1.700 m, in Alleinlage, ohne Nachbarn.',
        ],
      },
      {
        heading: 'Ruheraum mit Liegen und Blick ins Freie',
        paragraphs: [
          'Neben der Sauna liegt der Ruheraum mit Liegen. Durch die Terrassentür sehen Sie auf die Fichten und Zirben rund um die Hütte, im Winter auf den Schnee vor der Tür.',
          'Die beiden Bäder und das separate WC haben Fußbodenheizung. In der Stube wärmt der Pelletofen.',
        ],
        image: img(
          'ruheraum',
          'Ruheraum mit Liege vor der Terrassentür, draußen der verschneite Balkon',
        ),
      },
      {
        heading: 'Sauna nach dem Skitag oder der Wanderung',
        paragraphs: [
          'Das Skigebiet Heidi Alm Falkert erreichen Sie nach 800 m mit dem Auto, den Falkertsee nach 800 m. Bad Kleinkirchheim und die Turracher Höhe liegen jeweils rund 20 Minuten entfernt.',
        ],
        links: [
          { href: '/winter-skiurlaub', label: 'Winterurlaub am Falkert' },
          { href: '/sommer-wandern', label: 'Wandern ab der Hüttentür' },
        ],
      },
    ],
    faq: [
      {
        question: 'Ist die Sauna privat?',
        answer:
          'Ja. Die Sauna mit Ruheraum, Regendusche und Sauna-Terrasse gehört zur Hütte und steht nur Ihnen und Ihren Mitreisenden zur Verfügung.',
      },
      {
        question: 'Was für eine Sauna ist es?',
        answer: 'Eine finnische Sauna in einem Anbau direkt an der Hütte.',
      },
      {
        question: 'Kann ich die Sauna das ganze Jahr nutzen?',
        answer: 'Ja, die Sauna gehört in jeder Jahreszeit zur Hütte.',
      },
    ],
    related: ['winter-skiurlaub', 'preise-buchen', 'faq'],
  },
  {
    slug: 'huette-mit-hund',
    name: 'Urlaub mit Hund',
    title: 'Hütte mit Hund in Kärnten: Alleinlage am Falkert',
    description:
      'Berghütte auf 1.700 m, in der Hunde willkommen sind: 1.200 m² Almgarten (nicht eingezäunt), Wanderwege ab Tür, Falkertsee 800 m. Hundetipps für die Nockberge.',
    h1: 'Urlaub mit Hund: Berghütte in Alleinlage am Falkert',
    label: 'Mit Hund',
    lead: 'In der Sechszirbenhütte am Falkert in Kärnten sind Hunde willkommen: Die Berghütte liegt in Alleinlage auf 1.700 m, hat einen 1.200 m² großen Almgarten (nicht eingezäunt) und Wanderwege direkt ab der Tür.',
    updated: UPDATED,
    image: img(
      'huette-sommer-hund',
      'Die Sechszirbenhütte im Frühsommer, auf der Wiese davor liegt ein Hund',
    ),
    facts: ['hunde', 'garten', 'lage', 'falkertsee', 'personen', 'preise'],
    sections: [
      {
        heading: 'Warum die Hütte zu Hunden passt',
        paragraphs: [
          'Die Hütte steht allein zwischen Zirben und Lärchen. Es gibt keine direkten Nachbarn und keine Durchgangsstraße vor der Tür. Der Almgarten ist 1.200 m² groß, aber nicht eingezäunt – Ihr Hund sollte also abrufbar sein oder an der Schleppleine bleiben.',
          'Die Hundegebühr sehen Sie in der Preisaufstellung des Buchungsformulars, bevor Sie anfragen.',
        ],
      },
      {
        heading: 'Wanderungen mit Hund ab der Hüttentür',
        paragraphs: [
          'Der Falkertsee liegt 800 m entfernt. Der Spaziergang um den See ist auch für ältere Hunde gut zu schaffen. Die Wanderung auf den Falkert dauert je nach Fitness eine bis drei Stunden; es gibt einen steilen und einen gemäßigten Auf- und Abstieg. Der Hund sollte bergerfahren und fit sein.',
          'Unser heimlicher Favorit ist die Runde über Rodresnock und Moschelitzen durch das Murmeltiertal: ausgedehnt, stellenweise sportlich und meist windig. Oft begegnen Sie dort keinem Menschen.',
        ],
        image: img(
          'kuehe-rodresnock',
          'Zwei Kühe liegen auf der Almwiese, dahinter der Gipfel des Rodresnock',
          1600,
          1200,
        ),
      },
      {
        heading: 'Ausflüge mit Hund in der Umgebung',
        paragraphs: ['Mit dem Auto erreichen Sie weitere hundefreundliche Ziele in Kärnten:'],
        list: [
          'Drei-Seen-Wanderung an der Turracher Höhe: gemäßigt, für alle geeignet',
          'Panoramaweg Hochrindl: viele Stellen mit frischem Wasser',
          'Strandbad Tschinder am Millstätter See: eigener Bereich für Hunde, Leinenpflicht',
        ],
        links: [
          {
            href: '/blog/urlaub-mit-hund-in-kaernten-5-gruende-fuer-die-sechszirbenhuette',
            label: 'Blog: Urlaub mit Hund in Kärnten',
          },
        ],
      },
      {
        heading: 'Im Winter mit Hund',
        paragraphs: [
          'Auch im Schnee ist die Hütte mit dem Auto erreichbar; von November bis April sollten Schneeketten im Gepäck sein. Für windige Gipfel empfehlen wir einen Hundemantel.',
        ],
        image: img(
          'huette-winter-hund',
          'Die verschneite Sechszirbenhütte, davor steht ein Hund im Schnee',
          1600,
          1204,
        ),
      },
    ],
    faq: [
      {
        question: 'Sind Hunde in der Sechszirbenhütte erlaubt?',
        answer: 'Ja, Hunde sind willkommen.',
      },
      {
        question: 'Ist der Garten eingezäunt?',
        answer:
          'Nein. Der Almgarten ist 1.200 m² groß und nicht eingezäunt. Die Hütte liegt in Alleinlage.',
      },
      {
        question: 'Was kostet der Aufenthalt mit Hund?',
        answer:
          'Die Hundegebühr steht in der Preisaufstellung des Buchungsformulars, zusammen mit allen anderen Kosten.',
      },
    ],
    related: ['sommer-wandern', 'preise-buchen', 'faq'],
  },
  {
    slug: 'workation',
    name: 'Workation',
    title: 'Workation in den Nockbergen: Hütte mit 220 Mbit/s WLAN',
    description:
      'Arbeiten auf 1.700 m in Alleinlage: 220 Mbit/s WLAN, 2 Schlafzimmer, eigene Sauna für den Feierabend. Ideal für die ruhigen Monate.',
    h1: 'Workation am Falkert: schnelles Internet, keine Nachbarn',
    label: 'Workation',
    lead: 'Die Sechszirbenhütte am Falkert in Kärnten eignet sich für eine Workation: WLAN mit 220 Mbit/s, Alleinlage auf 1.700 m, zwei Schlafzimmer und eine eigene Sauna für den Feierabend.',
    updated: UPDATED,
    image: img('wohnzimmer', 'Wohnzimmer der Sechszirbenhütte mit Sofa, Holzdecke und Fenstern'),
    facts: ['wlan', 'lage', 'schlafzimmer', 'wohnflaeche', 'sauna', 'heizung', 'preise'],
    sections: [
      {
        heading: 'Arbeiten mit 220 Mbit/s auf 1.700 m',
        paragraphs: [
          'Das WLAN der Hütte liefert 220 Mbit/s. Das reicht für Videokonferenzen und große Dateien, auch wenn zwei Personen gleichzeitig arbeiten.',
          'Auf 85 m² und zwei Etagen finden Sie mehrere Plätze zum Arbeiten: den Esstisch in der Stube neben dem Pelletofen, das Wohnzimmer oder bei gutem Wetter den umlaufenden Balkon.',
        ],
      },
      {
        heading: 'Ruhe in Alleinlage',
        paragraphs: [
          'Die Hütte steht allein. Es gibt keine Nachbarn nebenan und keinen Durchgangsverkehr. Wer konzentriert arbeiten will, findet hier lange ungestörte Stunden.',
          'Besonders ruhig sind die Monate außerhalb der Ferienzeiten.',
        ],
        image: img(
          'wohnzimmer-galerie',
          'Blick von der Galerie in das Wohnzimmer mit grünem Sofa und Couchtisch',
          1600,
          1204,
        ),
      },
      {
        heading: 'Feierabend: Sauna, See und Berge',
        paragraphs: [
          'Nach der Arbeit gehört die eigene Sauna mit Ruheraum Ihnen. Zum Falkertsee sind es 800 m, die Wanderwege beginnen an der Hüttentür. Bad Kleinkirchheim liegt rund 20 Minuten mit dem Auto entfernt.',
        ],
        links: [
          { href: '/sauna', label: 'Die Sauna der Hütte' },
          {
            href: '/blog/workation-in-den-nockbergen-arbeiten-auf-1-700-m-mit-sauna-zum-feierabend',
            label: 'Blog: Workation in den Nockbergen',
          },
        ],
      },
    ],
    faq: [
      {
        question: 'Wie schnell ist das Internet in der Hütte?',
        answer: 'Das WLAN liefert 220 Mbit/s.',
      },
      {
        question: 'Gibt es Waschmaschine und Trockner für längere Aufenthalte?',
        answer: 'Ja, beides ist vorhanden.',
      },
    ],
    related: ['sauna', 'preise-buchen', 'anreise'],
  },
  {
    slug: 'winter-skiurlaub',
    name: 'Winter',
    title: 'Skiurlaub am Falkert: Hütte mit Sauna nahe Heidi Alm',
    description:
      'Winter in den Nockbergen: 800 m zum Skigebiet Heidi Alm Falkert (Auto), Bad Kleinkirchheim und Turracher Höhe in ca. 20 Min. Danach in die eigene Sauna.',
    h1: 'Winterurlaub am Falkert: Skifahren, Sauna, Pelletofen',
    label: 'Winter',
    lead: 'Von der Sechszirbenhütte am Falkert in Kärnten sind es 800 m mit dem Auto zum Skigebiet Heidi Alm Falkert; Bad Kleinkirchheim und die Turracher Höhe erreichen Sie in rund 20 Minuten. Nach dem Skitag warten die eigene Sauna und der Pelletofen.',
    updated: UPDATED,
    image: img(
      'huette-schnee-rueckseite',
      'Die tief verschneite Sechszirbenhütte zwischen schneebedeckten Fichten',
    ),
    facts: ['skigebiet', 'orte', 'sauna', 'heizung', 'personen', 'lage', 'parken'],
    sections: [
      {
        heading: 'Skigebiet Heidi Alm Falkert: klein, familiär, ohne Warteschlangen',
        paragraphs: [
          'Das Skigebiet der Heidi Alm liegt 800 m von der Hütte entfernt und ist mit dem Auto erreichbar. Es hat drei Lifte, einen Zauberteppich und Pisten für Anfänger bis Fortgeschrittene. An den Liften steht man in der Regel nicht an.',
          'In der Skischule vor Ort lernen Kinder und Erwachsene Skifahren und Snowboarden. Dazu kommen Langlaufen, Eislaufen auf dem See, geführte Schneeschuhwanderungen, Skitouren und Fackelwanderungen.',
        ],
      },
      {
        heading: 'Bad Kleinkirchheim und Turracher Höhe in 20 Minuten',
        paragraphs: [
          'Wer mehr Pistenkilometer sucht, fährt in rund 20 Minuten nach Bad Kleinkirchheim oder auf die Turracher Höhe. Beide Skigebiete lassen sich gut als Tagesausflug mit der Hütte verbinden.',
        ],
        image: img(
          'nockberge-winter',
          'Verschneite Gipfel der Nockberge unter blauem Himmel',
          1600,
          765,
        ),
      },
      {
        heading: 'Nach dem Skitag: Sauna und warme Stube',
        paragraphs: [
          'Zurück in der Hütte heizen Sie die eigene finnische Sauna ein und kühlen auf der Sauna-Terrasse im Schnee ab. In der Stube brennt der Pelletofen, die Bäder haben Fußbodenheizung.',
        ],
        image: img('balkon-schnee', 'Verschneiter Balkon der Hütte mit roten Fensterläden'),
        links: [{ href: '/sauna', label: 'Mehr zur Sauna' }],
      },
      {
        heading: 'Anreise im Winter',
        paragraphs: [
          'Die Hütte ist mit dem Auto erreichbar, der Parkplatz liegt an der Hütte. Die letzten rund 8 km führen über eine Bergstraße. Von November bis April sollten Schneeketten im Gepäck sein.',
        ],
        links: [{ href: '/anreise', label: 'Anreise und Lage' }],
      },
    ],
    faq: [
      {
        question: 'Wie weit ist das nächste Skigebiet entfernt?',
        answer:
          'Das Skigebiet Heidi Alm Falkert liegt 800 m entfernt und ist mit dem Auto erreichbar. Bad Kleinkirchheim und die Turracher Höhe erreichen Sie in rund 20 Minuten.',
      },
      {
        question: 'Brauche ich im Winter Schneeketten?',
        answer:
          'Von November bis April sollten Sie für die Bergstraße zum Falkertsee Schneeketten dabeihaben.',
      },
      {
        question: 'Ist das Skigebiet für Kinder geeignet?',
        answer:
          'Ja. Das Skigebiet der Heidi Alm hat einen Zauberteppich, Anfängerpisten und eine Skischule für Kinder und Erwachsene.',
      },
    ],
    sister: true,
    related: ['sauna', 'anreise', 'preise-buchen'],
  },
  {
    slug: 'sommer-wandern',
    name: 'Sommer',
    title: 'Wandern am Falkertsee: Berghütte im Biosphärenpark Nockberge',
    description:
      'Wanderungen direkt ab der Hütte auf 1.700 m: Falkertsee 800 m, Rundwanderweg, Murmeltiertal. Touren, Einkehr und Tipps vom Gastgeber.',
    h1: 'Sommer am Falkert: Wandern ab der Hüttentür',
    label: 'Sommer',
    lead: 'Von der Sechszirbenhütte auf 1.700 m am Falkert in Kärnten starten Sie direkt zu Fuß: Der Falkertsee liegt 800 m entfernt, der Gipfel des Falkert und die Runde durch das Murmeltiertal beginnen an der Hüttentür.',
    updated: UPDATED,
    image: img('huette-sommer', 'Die Sechszirbenhütte im Sommer mit Balkon und Holzstapel'),
    facts: ['lage', 'falkertsee', 'orte', 'garten', 'hunde', 'sauna'],
    sections: [
      {
        heading: 'Touren ab der Hütte',
        paragraphs: [
          'Der Spaziergang zum Falkertsee und um den See ist der einfachste Einstieg. Auf den Falkert steigen Sie je nach Fitness in einer bis drei Stunden; es gibt eine steile und eine gemäßigte Variante.',
          'Länger und einsamer ist die Rundwanderung über Rodresnock und Moschelitzen durch das Murmeltiertal. Mit etwas Glück sehen Sie dort Murmeltiere. Am Weg blühen Enzian und Almrausch.',
        ],
        links: [
          {
            href: '/blog/die-schoensten-wanderungen-vor-der-tuer',
            label: 'Blog: Die schönsten Wanderungen vor der Tür',
          },
        ],
      },
      {
        heading: 'Die Nockberge: sanfte Gipfel, weite Sicht',
        paragraphs: [
          'Die Hütte liegt im Biosphärenpark Nockberge. Die runden, grasbewachsenen Gipfel sind typisch für die Region und machen viele Touren auch für Kinder und weniger Geübte gut gehbar.',
          'Die Nockalmstraße erreichen Sie in rund 15 Minuten mit dem Auto, die Turracher Höhe mit der Drei-Seen-Wanderung und der Alpen-Achterbahn Nocky Flitzer in rund 20 Minuten.',
        ],
        image: img(
          'nockberge-kamm',
          'Blick über einen grasbewachsenen Kamm der Nockberge',
          1600,
          1200,
        ),
      },
      {
        heading: 'Ausflüge an warmen Tagen',
        paragraphs: [
          'Zum Baden fahren Sie an den Millstätter See oder an den Ossiacher See (rund 30 Minuten). In Bad Kleinkirchheim bringt Sie die Brunnachbahn zum Panoramaweg St. Oswald; dort gibt es auch einen 18-Loch-Golfplatz.',
        ],
        image: img(
          'laerchen-nebelmeer',
          'Herbstlich gefärbte Lärchen über einem Nebelmeer in den Nockbergen',
          1600,
          1200,
        ),
        links: [{ href: '/blog/ausfluege-in-kaernten', label: 'Blog: Ausflüge in Kärnten' }],
      },
      {
        heading: 'Zurück an der Hütte',
        paragraphs: [
          'Nach der Tour sitzen Sie auf dem umlaufenden Balkon oder im 1.200 m² großen Almgarten mit Gartenmöbeln und Grill. Für müde Beine gibt es die eigene Sauna.',
        ],
      },
    ],
    faq: [
      {
        question: 'Kann ich direkt an der Hütte loswandern?',
        answer:
          'Ja. Die Wege zum Falkertsee (800 m), auf den Falkert und durch das Murmeltiertal beginnen an der Hütte.',
      },
      {
        question: 'Sind die Wanderungen für Kinder geeignet?',
        answer:
          'Der Weg um den Falkertsee ist leicht. Für die Gipfeltour auf den Falkert gibt es eine gemäßigte und eine steile Variante.',
      },
    ],
    related: ['huette-mit-hund', 'falkert-falkertsee', 'preise-buchen'],
  },
  {
    slug: 'zirbenhuette-falkert',
    name: 'Zirbenhütte am Falkert',
    title: 'Zirbenhütte am Falkert? Übernachten in der Sechszirbenhütte',
    description:
      'Die Zirbenhütte am Falkertsee ist ein Tageslokal. Übernachten können Sie 800 m vom See in der Sechszirbenhütte: eigene Sauna, bis 5 Personen, Hunde willkommen.',
    h1: 'Zirbenhütte am Falkertsee: Einkehr oder Übernachtung?',
    label: 'Gut zu wissen',
    lead: 'Die Zirbenhütte am Falkertsee ist ein Tageslokal zum Einkehren – übernachten können Sie dort nicht. Die Sechszirbenhütte ist ein eigenes Haus: eine Ferienhütte zum Mieten, 800 m vom Falkertsee, mit eigener Sauna, für bis zu 5 Personen.',
    updated: UPDATED,
    image: img(
      'huette-front-sommer',
      'Die Sechszirbenhütte von vorn mit umlaufendem Balkon zwischen Fichten',
      1600,
      765,
    ),
    facts: ['lage', 'falkertsee', 'personen', 'schlafzimmer', 'sauna', 'hunde', 'preise'],
    sections: [
      {
        heading: 'Zwei Häuser mit ähnlichem Namen',
        paragraphs: [
          'Wer nach „Zirbenhütte Falkert“ sucht, meint oft eines von zwei Häusern. Die Zirbenhütte am Falkertsee ist eine Gaststätte für die Einkehr am Tag. Die Sechszirbenhütte ist eine über 250 Jahre alte Berghütte in Alleinlage, die Sie als Ferienhaus für sich allein mieten.',
          'Beide Häuser gehören nicht zusammen.',
        ],
      },
      {
        heading: 'Übernachten in der Sechszirbenhütte',
        paragraphs: [
          'Die Sechszirbenhütte liegt auf 1.700 m, 800 m vom Falkertsee. Auf 85 m² gibt es zwei Schlafzimmer für bis zu fünf Personen, zwei Bäder, ein separates WC, eine Stube mit Pelletofen und eine voll ausgestattete Küche.',
          'Dazu kommen die eigene Sauna mit Ruheraum und Sauna-Terrasse, der umlaufende Balkon und 1.200 m² Almgarten. Hunde sind willkommen.',
        ],
        image: img(
          'schlafzimmer',
          'Schlafzimmer unter der Holzdecke mit Doppelbett und Einzelbett',
        ),
        links: [
          { href: '/preise-buchen', label: 'Preise und freie Termine' },
          { href: '/sauna', label: 'Die Sauna der Hütte' },
        ],
      },
      {
        heading: 'Einkehren am Falkertsee',
        paragraphs: [
          'Von der Sechszirbenhütte gehen Sie zu Fuß zum See. Am See und an der Heidi Alm kehren Sie zum Beispiel in der Seehütte oder in der Bogi Alm ein.',
        ],
        image: img(
          'falkertsee-winter',
          'Der Falkertsee im Winter bei Nebel und Abendlicht',
          1600,
          900,
        ),
      },
    ],
    faq: [
      {
        question: 'Kann man in der Zirbenhütte am Falkertsee übernachten?',
        answer:
          'Nein, die Zirbenhütte am Falkertsee ist ein Tageslokal. Übernachten können Sie in der Sechszirbenhütte, einem Ferienhaus 800 m vom See.',
      },
      {
        question: 'Gehören Zirbenhütte und Sechszirbenhütte zusammen?',
        answer: 'Nein, es sind zwei verschiedene Häuser mit ähnlichem Namen.',
      },
    ],
    related: ['huetten-am-falkertsee', 'preise-buchen', 'anreise'],
  },
  {
    slug: 'huetten-am-falkertsee',
    name: 'Hütten am Falkertsee',
    title: 'Hütten & Ferienhäuser am Falkertsee: unsere zwei Hütten',
    description:
      'Zwei Hütten am Falkert: Sechszirbenhütte (bis 5 Personen, 1.700 m, Alleinlage) und Natberger Hütte (8 Personen, 125 m², 1.800 m). Beide mit Sauna.',
    h1: 'Urlaub am Falkertsee: zwei Hütten mit Sauna im Vergleich',
    label: 'Zwei Hütten',
    lead: 'Am Falkert in Kärnten vermietet unsere Familie zwei Ferienhütten mit eigener Sauna: die Sechszirbenhütte für bis zu 5 Personen in Alleinlage auf 1.700 m und die Natberger Hütte für 8 Personen mit 125 m² auf 1.800 m.',
    updated: UPDATED,
    image: img(
      'huette-herbst-seite',
      'Die Sechszirbenhütte im Herbst am Hang zwischen Lärchen und Fichten',
      1600,
      900,
    ),
    facts: [],
    extra: 'vergleich',
    sections: [
      {
        heading: 'Sechszirbenhütte: für Paare, kleine Familien und Hundebesitzer',
        paragraphs: [
          'Die Sechszirbenhütte ist über 250 Jahre alt und steht allein auf 1.700 m. Sie bietet 85 m², zwei Schlafzimmer für bis zu fünf Personen, zwei Bäder, eine finnische Sauna mit Ruheraum und Sauna-Terrasse sowie 1.200 m² Almgarten. Der Falkertsee liegt 800 m entfernt.',
          'Sie passt, wenn Sie Ruhe suchen, zu zweit oder als Familie reisen oder Ihren Hund mitbringen.',
        ],
        links: [{ href: '/preise-buchen', label: 'Sechszirbenhütte: Preise und freie Termine' }],
      },
      {
        heading: 'Natberger Hütte: für Gruppen und zwei Familien',
        paragraphs: [
          'Die Natberger Hütte ist ein Almhaus auf 1.800 m am Falkertsee. Sie bietet 125 m² für 8 Personen in drei Schlafzimmern, eine eigene Sauna und liegt direkt am Skigebiet Falkert. Bis zu zwei Hunde sind willkommen.',
          'Sie passt, wenn Sie mit Freunden, mit mehreren Generationen oder als zwei Familien reisen.',
        ],
        image: {
          src: '/images/seiten/natberger-huette.jpg',
          alt: 'Die Natberger Hütte auf 1.800 m am Falkertsee',
          width: 1320,
          height: 880,
        },
        links: [{ href: NATBERGER_URL, label: 'Zur Natberger Hütte – Ferienhaus für 8 Personen' }],
      },
    ],
    related: ['zirbenhuette-falkert', 'falkert-falkertsee', 'preise-buchen'],
  },
  {
    slug: 'falkert-falkertsee',
    name: 'Falkert & Falkertsee',
    title: 'Falkert & Falkertsee: Ratgeber für Ihren Urlaub in den Nockbergen',
    description:
      'Der Falkert in Kärnten auf einen Blick: Falkertsee, Skigebiet Heidi Alm, Wanderungen, Ausflüge mit Kindern und Hund. Tipps der Gastgeber der Sechszirbenhütte.',
    h1: 'Falkert und Falkertsee: Was Sie vor Ihrem Urlaub wissen sollten',
    label: 'Ratgeber',
    lead: 'Der Falkert ist ein Berg in den Kärntner Nockbergen; an seinem Fuß liegen der Falkertsee und das Skidorf Falkertsee mit dem Skigebiet Heidi Alm. Im Winter fahren Sie hier Ski, im Sommer wandern Sie im Biosphärenpark Nockberge.',
    updated: UPDATED,
    image: img('falkertsee-winter', 'Der Falkertsee im Winter bei Nebel und Abendlicht', 1600, 900),
    facts: ['lage', 'falkertsee', 'skigebiet', 'orte'],
    sections: [
      {
        heading: 'Der Falkertsee',
        paragraphs: [
          'Der Falkertsee ist ein kleiner Bergsee mit einem leichten Rundweg. An der Heidi Alm gibt es einen Themenweg für Kinder, eine große Rutsche und einen Spielplatz. Im Winter läuft man auf dem See Eis.',
        ],
      },
      {
        heading: 'Skigebiet Heidi Alm Falkert',
        paragraphs: [
          'Das familiäre Skigebiet hat drei Lifte, einen Zauberteppich und eine Skischule. Es eignet sich für Anfänger und Familien; Wartezeiten an den Liften sind selten.',
        ],
        links: [{ href: '/winter-skiurlaub', label: 'Winterurlaub am Falkert' }],
      },
      {
        heading: 'Wandern in den Nockbergen',
        paragraphs: [
          'Vom See führen Wege auf den Falkert, über Rodresnock und Moschelitzen und durch das Murmeltiertal. Die Nockalmstraße, eine Panoramastraße durch die Nockberge, erreichen Sie in rund 15 Minuten mit dem Auto.',
        ],
        image: img(
          'nockberge-kamm',
          'Blick über einen grasbewachsenen Kamm der Nockberge',
          1600,
          1200,
        ),
        links: [
          { href: '/sommer-wandern', label: 'Wandern ab der Hüttentür' },
          {
            href: '/blog/die-schoensten-wanderungen-vor-der-tuer',
            label: 'Blog: Die schönsten Wanderungen vor der Tür',
          },
        ],
      },
      {
        heading: 'Ausflüge mit Kindern und Hund',
        paragraphs: [
          'In der Umgebung liegen die Turracher Höhe mit der Alpen-Achterbahn Nocky Flitzer (ab 3 Jahren in Begleitung), der Familywald am Ossiacher See, der Alpen-Tierpark in Feld am See und die Gerlitzen Alpe.',
        ],
        image: img(
          'alpen-achterbahn',
          'Alpen-Achterbahn Nocky Flitzer auf der Turracher Höhe im Herbst',
          1600,
          1200,
        ),
        links: [
          { href: '/blog/ausfluege-in-kaernten', label: 'Blog: Ausflüge in Kärnten' },
          {
            href: '/blog/urlaub-mit-hund-in-kaernten-5-gruende-fuer-die-sechszirbenhuette',
            label: 'Blog: Urlaub mit Hund in Kärnten',
          },
          { href: '/blog', label: 'Alle Beiträge im Blog' },
        ],
      },
      {
        heading: 'Übernachten am Falkert',
        paragraphs: [
          'Die Sechszirbenhütte liegt 800 m vom Falkertsee in Alleinlage und bietet Platz für bis zu fünf Personen. Für Gruppen bis acht Personen gibt es unsere zweite Hütte, die Natberger Hütte.',
        ],
        links: [{ href: '/huetten-am-falkertsee', label: 'Beide Hütten im Vergleich' }],
      },
    ],
    related: ['sommer-wandern', 'winter-skiurlaub', 'huetten-am-falkertsee'],
  },
  {
    slug: 'preise-buchen',
    name: 'Preise & Buchen',
    title: 'Preise & Verfügbarkeit · Sechszirbenhütte am Falkert',
    description:
      'Freie Termine im Buchungskalender, vollständige Preisaufstellung mit allen Pflichtgebühren im Buchungsformular. Direkt buchen ohne Portalgebühren.',
    h1: 'Preise und freie Termine',
    label: 'Buchen',
    lead: 'Freie Termine der Sechszirbenhütte sehen Sie tagesaktuell im Buchungskalender auf dieser Seite. Den Preis für Ihren Zeitraum zeigt das Buchungsformular mit allen Pflichtgebühren; bei der Direktbuchung fallen keine Portalgebühren an.',
    updated: UPDATED,
    image: img(
      'huette-herbst',
      'Die Sechszirbenhütte im Herbst mit Holzstapel unter dem Balkon',
      1600,
      1280,
    ),
    facts: ['preise', 'personen', 'zeiten', 'hunde', 'sauna', 'parken'],
    extra: 'buchung',
    sections: [
      {
        heading: 'So buchen Sie',
        paragraphs: [
          'Wählen Sie im Kalender Anreise und Abreise und die Zahl der Personen. Mit „Anfragen“ öffnet sich das Buchungsformular mit der vollständigen Preisaufstellung für Ihren Zeitraum. Erst dort geben Sie Ihre Daten ein.',
        ],
      },
      {
        heading: 'Was die Preisaufstellung enthält',
        paragraphs: [
          'Der Preis hängt von Saison und Aufenthaltsdauer ab. Die Aufstellung im Buchungsformular nennt den Mietpreis und alle weiteren Posten einzeln:',
        ],
        list: [
          'Endreinigung',
          'Ortstaxe',
          'Hund, falls Sie einen mitbringen',
          'Wäschepaket mit Bettwäsche und Handtüchern (25 € pro Person), falls gewünscht',
        ],
      },
      {
        heading: 'Gut zu wissen',
        paragraphs: [
          'Den Mindestaufenthalt für Ihren Anreisetag zeigt der Kalender an. Check-in ist ab 15 Uhr, Check-out bis 10 Uhr. Bettwäsche und Handtücher bringen Sie mit oder buchen das Wäschepaket dazu.',
        ],
        links: [{ href: '/faq', label: 'Häufige Fragen zur Hütte' }],
      },
    ],
    faq: [
      {
        question: 'Warum direkt buchen?',
        answer:
          'Bei der Direktbuchung über unseren Buchungskalender zahlen Sie keine Portalgebühren.',
      },
      {
        question: 'Sind Endreinigung und Ortstaxe im Preis ausgewiesen?',
        answer:
          'Ja. Die Preisaufstellung im Buchungsformular nennt alle Pflichtgebühren einzeln, bevor Sie anfragen.',
      },
    ],
    related: ['faq', 'anreise', 'sauna'],
  },
  {
    slug: 'anreise',
    name: 'Anreise',
    title: 'Anreise zur Sechszirbenhütte: Falkert im Sommer & Winter',
    description:
      'So finden Sie die Hütte auf 1.700 m: Route, Parken, Zufahrt im Winter, Entfernungen zu Falkertsee, Heidi Alm, Bad Kleinkirchheim.',
    h1: 'Anreise und Lage am Falkert',
    label: 'Anreise',
    lead: 'Die Sechszirbenhütte liegt in Alleinlage auf 1.700 m am Falkertsee in Kärnten (Falkertsee 36, 9564 Patergassen). Sie fahren mit dem Auto bis vor die Hütte; im Winter sollten Schneeketten im Gepäck sein.',
    updated: UPDATED,
    image: img(
      'huette-herbst-treppe',
      'Die Sechszirbenhütte im Herbst, eine Steintreppe führt vom Weg zum Eingang',
      1600,
      1200,
    ),
    facts: ['lage', 'parken', 'falkertsee', 'skigebiet', 'orte', 'zeiten'],
    extra: 'anfahrt',
    sections: [
      {
        heading: 'Route mit dem Auto',
        paragraphs: [
          'Über die Tauernautobahn A10 nehmen Sie die Abfahrt Spittal/Millstätter See und fahren am See entlang nach Radenthein. Am Ortsausgang geht es im Kreisverkehr Richtung Bad Kleinkirchheim.',
          'Rund 2 km hinter Bad Kleinkirchheim biegen Sie links Richtung Turrach und Falkertsee ab. Nach etwa 500 m weist eine Heidi-Figur die Bergstraße hinauf; nach rund 8 km erreichen Sie Falkertsee. Im Ort stehen Hinweistafeln mit den Hausnummern.',
        ],
      },
      {
        heading: 'Zufahrt im Winter',
        paragraphs: [
          'Von November bis April sollten Sie Schneeketten dabeihaben. Der Parkplatz liegt direkt an der Hütte.',
        ],
        image: img(
          'schild-schnee',
          'Verschneites Holzschild mit der Aufschrift Sechszirben',
          1205,
          1600,
        ),
      },
      {
        heading: 'Entfernungen',
        paragraphs: ['Von der Hütte aus erreichen Sie:'],
        list: [
          'Falkertsee: 800 m',
          'Skigebiet Heidi Alm Falkert: 800 m mit dem Auto',
          'Nockalmstraße: ca. 15 Minuten',
          'Bad Kleinkirchheim: ca. 20 Minuten',
          'Turracher Höhe: ca. 20 Minuten',
          'Ossiacher See: ca. 30 Minuten',
        ],
      },
    ],
    faq: [
      {
        question: 'Kann ich bis zur Hütte fahren?',
        answer: 'Ja, Sie fahren mit dem Auto bis vor die Hütte. Dort liegt der eigene Parkplatz.',
      },
      {
        question: 'Wann ist Check-in?',
        answer: 'Check-in ist ab 15 Uhr, Check-out bis 10 Uhr.',
      },
    ],
    related: ['winter-skiurlaub', 'preise-buchen', 'faq'],
  },
  {
    slug: 'faq',
    name: 'Häufige Fragen',
    title: 'Fragen zur Sechszirbenhütte: Hund, Sauna, WLAN, Anreise',
    description:
      'Antworten auf die häufigsten Fragen: Hunde, Sauna, Internet, Heizung, Winterzufahrt, Skigebiet, Check-in.',
    h1: 'Häufige Fragen zur Hütte',
    label: 'Fragen und Antworten',
    lead: 'Die Sechszirbenhütte ist eine über 250 Jahre alte Berghütte auf 1.700 m am Falkert in Kärnten, mit eigener Sauna, für bis zu 5 Personen, Hunde willkommen. Hier beantworten wir die häufigsten Fragen unserer Gäste.',
    updated: UPDATED,
    image: img('stube-eckbank', 'Stube mit Eckbank, Holztisch und holzvertäfelten Wänden'),
    facts: [
      'lage',
      'alter',
      'personen',
      'schlafzimmer',
      'baeder',
      'wohnflaeche',
      'sauna',
      'hunde',
      'wlan',
      'heizung',
      'garten',
      'parken',
      'falkertsee',
      'skigebiet',
      'orte',
      'zeiten',
      'preise',
    ],
    sections: [],
    faq: [
      {
        question: 'Für wie viele Personen ist die Hütte geeignet?',
        answer:
          'Für bis zu 5 Personen. Es gibt zwei Schlafzimmer: eines mit Doppelbett, eines mit Doppelbett und Einzelbett.',
      },
      {
        question: 'Sind Hunde erlaubt?',
        answer: 'Ja, Hunde sind willkommen. Der 1.200 m² große Almgarten ist nicht eingezäunt.',
      },
      {
        question: 'Gibt es eine Sauna?',
        answer:
          'Ja, eine eigene finnische Sauna mit Ruheraum, Regendusche und Sauna-Terrasse. Sie steht nur Ihnen zur Verfügung.',
      },
      {
        question: 'Wie schnell ist das Internet?',
        answer: 'Das WLAN liefert 220 Mbit/s.',
      },
      {
        question: 'Wie wird die Hütte geheizt?',
        answer: 'In der Stube steht ein Pelletofen, die Bäder haben Fußbodenheizung.',
      },
      {
        question: 'Komme ich im Winter mit dem Auto zur Hütte?',
        answer:
          'Ja, die Hütte ist mit dem Auto erreichbar. Von November bis April sollten Sie Schneeketten dabeihaben.',
      },
      {
        question: 'Wie weit ist das Skigebiet entfernt?',
        answer:
          'Das Skigebiet Heidi Alm Falkert liegt 800 m entfernt (mit dem Auto). Bad Kleinkirchheim und die Turracher Höhe erreichen Sie in rund 20 Minuten.',
      },
      {
        question: 'Wann sind Check-in und Check-out?',
        answer: 'Check-in ist ab 15 Uhr, Check-out bis 10 Uhr.',
      },
      {
        question: 'Muss ich Bettwäsche und Handtücher mitbringen?',
        answer: 'Sie bringen beides mit oder buchen das Wäschepaket für 25 € pro Person dazu.',
      },
      {
        question: 'Wie ist die Küche ausgestattet?',
        answer:
          'Die Küche ist voll ausgestattet: Geschirrspüler, Herd und Backofen, Kühlschrank mit Gefrierfach, Kaffeemaschine, Wasserkocher und Toaster.',
      },
      {
        question: 'Gibt es Waschmaschine und Trockner?',
        answer: 'Ja, beides ist vorhanden.',
      },
      {
        question: 'Wo finde ich Preise und freie Termine?',
        answer:
          'Freie Termine zeigt der Buchungskalender unter „Preise & Buchen“. Die Preisaufstellung im Buchungsformular nennt alle Pflichtgebühren.',
      },
      {
        question: 'Ist die Sechszirbenhütte die Zirbenhütte am Falkertsee?',
        answer:
          'Nein. Die Zirbenhütte am Falkertsee ist ein Tageslokal. Die Sechszirbenhütte ist ein Ferienhaus zum Mieten, 800 m vom See.',
      },
    ],
    sister: true,
    related: ['preise-buchen', 'anreise', 'sauna'],
  },
];

export function getPage(slug: string): ContentPage | undefined {
  return PAGES.find((page) => page.slug === slug);
}

/** Stand der Startseite für die Sitemap — bei Änderungen an der Startseite anpassen */
export const HOME_UPDATED = '2026-11-13';
