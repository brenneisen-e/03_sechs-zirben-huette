import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface CloudflareEnv {
  DB: D1Database;
}

async function getDb(): Promise<D1Database | null> {
  try {
    const ctx = await getCloudflareContext();
    return (ctx.env as CloudflareEnv).DB;
  } catch {
    return null;
  }
}

// All guest app content based on the Welcome Guide + website
const SEED_DATA = [
  {
    title: 'Check-In & Kontakt',
    icon: 'key',
    group_name: 'Vor der Reise',
    cards: [
      {
        title: 'Check-In & Check-Out',
        content: `<p><strong>Anreise:</strong> Zwischen 16:00 und 18:00 Uhr</p>
<p><strong>Abreise:</strong> Bis 10:00 Uhr</p>
<p>Bitte nehmen Sie vorab Kontakt zu unserer Verwalterin <strong>Manuela Knallnig</strong> auf, um eine persönliche Einweisung in die Hütte zu verabreden.</p>`,
      },
      {
        title: 'Kaution',
        content: `<p>Bitte bringen Sie <strong>200 € Kaution</strong> bei Anreise in bar mit. Unsere Verwaltung wird die Kaution während Ihres Aufenthaltes sicher verwahren und bei schadenfreier Abreise selbstverständlich direkt wieder an Sie auszahlen.</p>
<p>Leider mussten wir in der Vergangenheit die Erfahrung machen, dass mit unserer Sechszirbenhütte nicht so liebevoll umgegangen wurde, wie es selbstverständlich sein sollte. Daher mussten wir die Kaution einführen. Wir hoffen auf Ihr Verständnis.</p>`,
      },
      {
        title: 'Kontakt',
        content: `<p>Für Fragen erreichen Sie uns unter:</p>
<p>📞 <strong>+49 176 60030373</strong><br/>per Anruf, WhatsApp, Telegram oder Signal</p>
<p>Unsere Hausverwalterin <strong>Manuela Knallnig</strong> bereitet die Hütte für Ihre Ankunft vor. Bitte kontaktieren Sie sie:</p>
<ul>
<li>Einen Tag vor Anreise</li>
<li>2 Stunden vor Ankunft</li>
</ul>
<p>📞 <strong>+43 664 5403185</strong></p>`,
      },
    ],
  },
  {
    title: 'Anfahrt & Parken',
    icon: 'map-pin',
    group_name: 'Vor der Reise',
    cards: [
      {
        title: 'Wegbeschreibung',
        content: `<p>Am besten funktioniert die Navigation über <strong>Google Maps</strong> (nach "Sechszirbenhütte" suchen).</p>
<p>Fahren Sie auf der B98 am See entlang bis nach <strong>Radenthein</strong> und von dort auf der B88 durch <strong>Bad Kleinkirchheim</strong>. Nach dem Ortsausgang liegt rechts der große Golfplatz. Ca. 300 m nach dessen Ende biegen Sie links ab auf die B95 Richtung <strong>Reichenau/Turracher Höhe</strong>.</p>
<p>Nach weiteren 300 m geht es links hinauf zum Feriengebiet <strong>FALKERTSEE</strong>. Oben angekommen geht es am Schild "Kärntner Haus" im spitzen Winkel rechts hinauf. Fahren Sie am Hotel vorbei und halten Sie sich an der Weggabelung rechts.</p>`,
      },
      {
        title: 'Parken',
        content: `<p>Ihnen stehen <strong>2 Parkplätze</strong> oberhalb der Ferienhaussiedlung zur Verfügung.</p>
<ul>
<li>Vor dem Haus bitte <strong>nur zum Be- und Entladen</strong> halten</li>
<li>Im Winter bitte <strong>nicht</strong> mit dem Auto vor das Haus fahren</li>
<li>Schneeschaufel etc. stehen für Sie bereit</li>
<li>Nach frischem Schneefall: Treppe vor dem Haus unbedingt von Schnee befreien!</li>
</ul>
<p><strong>Tipp:</strong> Für den Winterurlaub empfehlen wir Schneeketten mitzuführen und die Ankunft bis 16 Uhr zu planen.</p>`,
      },
    ],
  },
  {
    title: 'Die Hütte',
    icon: 'home',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Überblick',
        content: `<p>Die Sechszirbenhütte bietet Ihnen <strong>85 m² Wohnfläche</strong> auf <strong>1.700 m Höhe</strong> in den Nockbergen.</p>
<ul>
<li>Bis zu 5 Personen</li>
<li>Schlafzimmer im OG (2 Doppelbetten, 1 Einzelbett)</li>
<li>Gemütlicher Wohnbereich mit Schwedenofen</li>
<li>Vollausgestattete Küche</li>
<li>Privater Sauna-Anbau</li>
<li>Umlaufender Balkon</li>
<li>650 m² Grundstück</li>
</ul>`,
      },
      {
        title: 'Holzofen',
        content: `<p>Der Schwedenofen darf ausschließlich mit dem <strong>Holz beheizt</strong> werden, das unter dem Balkon lagert.</p>
<ul>
<li>Bitte nutzen Sie immer das Holz von der abgetragenen Reihe</li>
<li>Zum Einheizen: Kaminanzünder verwenden und etwas Kleinholz anfeuern, dann nach und nach aufschichten</li>
<li>Achten Sie auf ausreichend Luftzufuhr, damit es nicht raucht</li>
<li>Während des Anheizens: Hebel am Schornstein in <strong>vertikaler Stellung</strong></li>
<li>Danach: Hebel in <strong>horizontale Stellung</strong> (hält die Wärme besser)</li>
</ul>`,
      },
    ],
  },
  {
    title: 'Sauna & Wellness',
    icon: 'flame',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Sauna',
        content: `<p>Ihre <strong>private Sauna</strong> mit Sanarium wird über das Display rechts außerhalb der Sauna gesteuert.</p>
<ul>
<li>Laufzeit und Zieltemperatur über das Display einstellen</li>
<li>Saunazusätze finden Sie im Schrank zwischen den Liegen</li>
<li>Ausführliche Anleitung liegt ebenfalls dort</li>
<li>Nach dem Sauna-Aufenthalt bitte die Saunatür <strong>offen stehen lassen</strong> zur Lüftung</li>
<li>Bitte Fliesen und Boden in der Dusche nach Benutzung <strong>abziehen</strong></li>
</ul>`,
      },
      {
        title: 'Wellness-Bereich',
        content: `<p>Der Sauna-Anbau umfasst:</p>
<ul>
<li>Finnische Sauna mit Sanarium</li>
<li>Ruheraum mit Liegen</li>
<li>Extra Dusche mit Kneipp-Schlauch</li>
<li>Fußbodenheizung</li>
</ul>
<p>Perfekt nach einem Tag auf der Piste oder einer Wanderung!</p>`,
      },
    ],
  },
  {
    title: 'Küche & Wäsche',
    icon: 'utensils',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Küche',
        content: `<p>Die Küche ist <strong>voll ausgestattet</strong> mit allem, was Sie zur Selbstversorgung brauchen:</p>
<ul>
<li>Ceranherd & Backofen</li>
<li>Spülmaschine</li>
<li>Mikrowelle mit Grill</li>
<li>Kühlschrank mit Gefrierfach</li>
<li>Kaffeemaschine, Wasserkocher, Toaster</li>
</ul>
<p>Bitte hinterlassen Sie die Küchen-Ordnung bei Abreise so, wie Sie diese vorgefunden haben. Übrige haltbare Lebensmittel (Nudeln, Mehl, Gewürze) dürfen Sie gerne für nachfolgende Gäste in den Schränken lassen.</p>`,
      },
      {
        title: 'Bettwäsche & Handtücher',
        content: `<p>Sofern Sie <strong>kein Wäschepaket</strong> bei uns gebucht haben (22 € / Person), bringen Sie bitte mit:</p>
<ul>
<li>Eigene Bettwäsche (Decken: 135×200 cm, Kissen: 80×80 cm)</li>
<li>Handtücher</li>
<li>Saunatücher und Trockentücher</li>
</ul>
<p>Wir stellen <strong>Daunendecken und Kopfkissen</strong> in ausreichender Zahl. Im Vorraum befinden sich Waschmaschine, Trockner und Wäscheständer.</p>
<p><strong>Tipp:</strong> Elastische Spannbettlaken empfohlen – die Matratzen im Doppelbettzimmer haben Überlänge (210 cm).</p>`,
      },
    ],
  },
  {
    title: 'WiFi & TV',
    icon: 'wifi',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'WiFi & Unterhaltung',
        content: `<p><strong>WLAN / ADSL</strong></p>
<p>Netzwerkname und Passwort finden Sie im Eingangsbereich der Hütte.</p>
<p><strong>Fernsehen</strong></p>
<p>Es gibt Satelliten-TV. Netflix, Prime & Co. sind als Apps auf dem Smart TV hinterlegt. Bitte verwenden Sie Ihren privaten Account und vergessen Sie nicht, sich vor Abreise wieder <strong>abzumelden</strong>.</p>`,
      },
    ],
  },
  {
    title: 'Haustiere',
    icon: 'info',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Regeln für Haustiere',
        content: `<p>Wir sind große Tierfreunde und freuen uns, wenn Sie Ihren Vierbeiner mitbringen! 🐕</p>
<p>Ein paar Regeln für einen schönen Aufenthalt:</p>
<ul>
<li>Haustiere schlafen <strong>nicht in den Schlafräumen</strong> und dürfen nicht auf Möbel, Sofas oder unbezogene Betten</li>
<li>Die Treppe ist nicht tierrückenfreundlich – bitte Vorsicht</li>
<li>Unrat auf dem Grundstück bitte <strong>sofort entfernen</strong></li>
<li>Bitte lassen Sie Ihre Tiere <strong>nicht allein</strong> in der Hütte zurück (Kratzen an der Tür)</li>
</ul>`,
      },
    ],
  },
  {
    title: 'Müll & Reinigung',
    icon: 'info',
    group_name: 'Nach der Reise',
    cards: [
      {
        title: 'Müllentsorgung',
        content: `<p>Wir trennen <strong>Papier, Plastik, Metall, Glas</strong> und Restmüll.</p>
<ul>
<li><strong>Glas, Metall, Papier:</strong> Bitte selbst an der Sammelstelle 300 m vor der Abfahrt zum Kärntner Haus entsorgen</li>
<li><strong>Plastik & Restmüll:</strong> In den bereitgelegten großen, grauen und gelben Müllbeuteln der Gemeinde sammeln</li>
<li>Die Beutel können in den Mülltonnen vor dem Haus gelagert werden</li>
<li>Bei Abreise Müllbeutel bitte verschnüren – unsere Hausverwaltung kümmert sich darum</li>
</ul>`,
      },
      {
        title: 'Reinigung bei Abreise',
        content: `<p>Bitte hinterlassen Sie die Hütte <strong>besenrein</strong>.</p>
<ul>
<li>Angebranntes auf Herd oder Backofen bitte eigenständig reinigen</li>
<li>Endreinigung: <strong>100 € je Aufenthalt</strong></li>
<li>Pro Hund zusätzlich <strong>25 €</strong></li>
<li>Die Gebühr ist bei Abreise bar für das Reinigungsteam zu hinterlegen (sofern nicht vorab entrichtet)</li>
</ul>`,
      },
    ],
  },
  {
    title: 'Einkaufen',
    icon: 'shopping-cart',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Supermärkte in der Nähe',
        content: `<ul>
<li><strong>Billa</strong> Patergassen – Wiedweg 45, 9564 Patergassen</li>
<li><strong>Spar</strong> Ebene Reichenau – Ebene Reichenau 89, 9565 Ebene Reichenau</li>
<li><strong>Spar / Billa</strong> Bad Kleinkirchheim – Dorfstraße 44, 9546 Bach</li>
<li><strong>Hofer (Aldi)</strong> Radenthein – Hauptstraße 70, 9545 Radenthein</li>
</ul>
<p>In der Hauptsaison bekommen Sie Grundlebensmittel und Hygieneartikel auch bei <strong>Nocksport Huber</strong> am Falkert.</p>`,
      },
    ],
  },
  {
    title: 'Restaurants',
    icon: 'coffee',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Restaurants in der Nähe',
        content: `<p><strong>Direkt am Falkert:</strong></p>
<ul>
<li>Seehütte – Falkertsee 1</li>
<li>Kärntner Haus – Falkertsee 6</li>
<li>Falkertstüberl – Falkertsee 134</li>
</ul>
<p><strong>In der Umgebung:</strong></p>
<ul>
<li>Falkerthaus – Falkertweg 33, St. Oswald</li>
<li>Gasthof (Pizzeria) Sportalm – St. Oswald-Rosennockstraße 53</li>
<li>Gartenrast – Gartenraststraße 9, Radenthein</li>
</ul>`,
      },
    ],
  },
  {
    title: 'Ausflüge Sommer',
    icon: 'mountain',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Kärnten Card',
        content: `<p>Wir empfehlen den Kauf einer <strong>Kärnten Card</strong> (online oder im Heidihotel Falkertsee).</p>
<p>Für Familien besonders toll, aber auch für alle anderen rechnet sich die Card meist ab der 2. Gondelfahrt. Sie bietet freien Eintritt zu über 100 Ausflugszielen in ganz Kärnten.</p>`,
      },
      {
        title: 'Wanderungen',
        content: `<ul>
<li><strong>Falkertsee</strong> – Spaziergang um den See (direkt vor der Tür)</li>
<li><strong>Wanderung Falkert</strong> – Gipfeltour mit Panoramablick</li>
<li><strong>Rodresnock / Moschelitzen / Murmeltiertal</strong> – Ausgedehnte Rundwanderung, oft keine Menschenseelen</li>
<li><strong>Drei-Seen-Wanderung Turracher Höhe</strong> – Gemäßigt, Kaiserschmarrn in der Karl-Hütte (20 Min.)</li>
<li><strong>Panoramaweg St. Oswald</strong> – Mit Brunnachbahn, kindgerecht</li>
<li><strong>Nockalmstraße</strong> – Spektakuläre Berglandschaft</li>
</ul>`,
      },
      {
        title: 'Familienausflüge',
        content: `<ul>
<li><strong>Heidi-Alm</strong> – 5 Gehminuten, Märchenweg, Rutsche, Spielplatz, Angeln am See</li>
<li><strong>Turracher Höhe & Nocky-Flitzer</strong> – Alpen-Achterbahn, ab 3 Jahren (15 Min.)</li>
<li><strong>Ossiacher See & Familywald</strong> – Kletterwald, Fly-Line, Hochseilgarten (30 Min.)</li>
<li><strong>Tierpark Feld am See</strong> – Wildpark, Streichelzoo, kinderwagen-geeignet (25 Min.)</li>
<li><strong>Bergbahn Gerlitzen-Alpe</strong> – Spielplätze, Paraglider beobachten (40 Min.)</li>
<li><strong>Millstätter See</strong> – Baden und Wassersport</li>
</ul>`,
      },
      {
        title: 'Hundewanderungen',
        content: `<ul>
<li><strong>Falkert & Falkertsee</strong> – Leicht bis mittel, 1–3 Stunden, auch für ältere Hunde</li>
<li><strong>Rodresnock / Moschelitzen</strong> – Anspruchsvoll, Hundemantel für den Gipfel empfohlen</li>
<li><strong>Drei-Seen-Wanderung Turracher Höhe</strong> – Leicht, Kaiserschmarrn in der Karl-Hütte</li>
<li><strong>Panoramaweg Hochrindl</strong> – Leicht bis mittel, viele Frischwasserstellen für Hunde</li>
<li><strong>Strandbad Tschinder am Millstätter See</strong> – Abkühlung mit Hundebereich</li>
</ul>`,
      },
    ],
  },
  {
    title: 'Ausflüge Winter',
    icon: 'snowflake',
    group_name: 'Während der Reise',
    cards: [
      {
        title: 'Skigebiete',
        content: `<ul>
<li><strong>Familien-Skigebiet Falkert / Heidi-Alm</strong> – Direkt vor Ort! 3 Lifte, Zauberteppich, ideal für Anfänger. Peters Skischule für Kinder und Erwachsene</li>
<li><strong>Turracher Höhe</strong> – Ca. 35 Pistenkilometer, Snowpark, 16 Lifte (20 Autominuten)</li>
<li><strong>Bad Kleinkirchheim / St. Oswald</strong> – 103 Pistenkilometer, 25 Lifte (20 Autominuten)</li>
<li><strong>Gerlitzen-Alpe, Goldeck, Hochrindl</strong> – Weitere Skigebiete in der Umgebung</li>
<li><strong>Obertauern</strong> – 100 Pistenkilometer, 26 Lifte (1–1,5 Autostunden)</li>
</ul>`,
      },
      {
        title: 'Weitere Winteraktivitäten',
        content: `<ul>
<li><strong>Langlaufen</strong> – Gepflegte Loipen in der Umgebung</li>
<li><strong>Eislaufen</strong> – Auf dem Falkertsee (bei ausreichender Eisdicke)</li>
<li><strong>Schneeschuhwanderungen</strong> – Geführte Touren verfügbar</li>
<li><strong>Skitouren</strong> – Für erfahrene Tourengeher</li>
<li><strong>Fackelwanderungen</strong> – Romantische Abendwanderungen</li>
<li><strong>Nocky-Flitzer</strong> – Rodelbahn auch im Winter (Turracher Höhe)</li>
</ul>`,
      },
    ],
  },
];

export async function POST() {
  try {
    const db = await getDb();
    if (!db) return NextResponse.json({ error: 'DB not available' }, { status: 500 });

    // Ensure tables exist
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS guest_app_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        icon TEXT DEFAULT 'info',
        group_name TEXT DEFAULT '',
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      )
      .run();
    try {
      await db
        .prepare('ALTER TABLE guest_app_categories ADD COLUMN group_name TEXT DEFAULT ""')
        .run();
    } catch {
      /* exists */
    }
    await db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS guest_app_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        image_alt TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES guest_app_categories(id) ON DELETE CASCADE
      )
    `,
      )
      .run();

    // Check if data already exists
    const existing = await db
      .prepare('SELECT COUNT(*) as count FROM guest_app_categories')
      .first<{ count: number }>();
    if (existing && existing.count > 0) {
      return NextResponse.json({
        message: `Guest app already has ${existing.count} categories. Delete existing data first or use the admin panel to edit.`,
        skipped: true,
      });
    }

    // Insert all categories and cards
    let categoriesCreated = 0;
    let cardsCreated = 0;

    for (let i = 0; i < SEED_DATA.length; i++) {
      const cat = SEED_DATA[i];
      if (!cat) continue;

      await db
        .prepare(
          'INSERT INTO guest_app_categories (title, icon, group_name, display_order, is_active) VALUES (?, ?, ?, ?, 1)',
        )
        .bind(cat.title, cat.icon, cat.group_name || '', i)
        .run();

      // Get the inserted category ID
      const inserted = await db
        .prepare('SELECT id FROM guest_app_categories WHERE title = ? ORDER BY id DESC LIMIT 1')
        .bind(cat.title)
        .first<{ id: number }>();

      if (!inserted) continue;
      categoriesCreated++;

      for (let j = 0; j < cat.cards.length; j++) {
        const card = cat.cards[j];
        if (!card) continue;
        await db
          .prepare(
            'INSERT INTO guest_app_cards (category_id, title, content, display_order, is_active) VALUES (?, ?, ?, ?, 1)',
          )
          .bind(inserted.id, card.title, card.content, j)
          .run();
        cardsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${categoriesCreated} categories with ${cardsCreated} cards`,
      categoriesCreated,
      cardsCreated,
    });
  } catch (e) {
    console.error('[guest-app-seed] Error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
