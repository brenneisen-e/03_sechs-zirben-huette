'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { SITE_CONFIG } from '@/lib/constants';
import { GA_MEASUREMENT_ID } from '@/lib/analytics';

export default function DatenschutzPage() {
  const { language } = useLanguage();
  const isDE = language === 'de';

  return (
    <div className="pt-12 pb-16">
      <div className="container max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {isDE ? 'Datenschutzerklärung' : 'Privacy Policy'}
        </h1>

        <div className="prose prose-gray max-w-none">
          <h2>{isDE ? 'Allgemeine Hinweise' : 'General Information'}</h2>
          <p>
            {isDE
              ? 'Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.'
              : 'The following information provides a simple overview of what happens to your personal data when you visit this website. Personal data is any data with which you could be personally identified.'}
          </p>

          <h2>{isDE ? 'Datenerfassung auf dieser Website' : 'Data Collection on This Website'}</h2>

          <h3>
            {isDE
              ? 'Wer ist verantwortlich für die Datenerfassung?'
              : 'Who is responsible for data collection?'}
          </h3>
          <p>
            {isDE
              ? 'Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber:'
              : 'Data processing on this website is carried out by the website operator:'}
          </p>
          <p>
            <strong>Malte Brenneisen</strong>
            <br />
            {SITE_CONFIG.addressGermany?.street || SITE_CONFIG.address.street}
            <br />
            {SITE_CONFIG.addressGermany?.zip || SITE_CONFIG.address.zip}{' '}
            {SITE_CONFIG.addressGermany?.city || SITE_CONFIG.address.city}
            <br />
            {isDE ? 'Telefon' : 'Phone'}: {SITE_CONFIG.phone}
            <br />
            E-Mail: {SITE_CONFIG.email}
          </p>

          <h3>{isDE ? 'Wie erfassen wir Ihre Daten?' : 'How do we collect your data?'}</h3>
          <p>
            {isDE
              ? 'Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst.'
              : 'Your data is collected in part by you providing it to us. This could, for example, be data you enter on a contact form. Other data is collected automatically or after your consent when you visit the website by our IT systems.'}
          </p>

          <h3>{isDE ? 'Wofür nutzen wir Ihre Daten?' : 'What do we use your data for?'}</h3>
          <p>
            {isDE
              ? 'Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.'
              : 'Some of the data is collected to ensure the proper functioning of the website. Other data can be used to analyze how visitors use the site.'}
          </p>

          <h3>
            {isDE
              ? 'Welche Rechte haben Sie bezüglich Ihrer Daten?'
              : 'What rights do you have regarding your data?'}
          </h3>
          <p>
            {isDE
              ? 'Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.'
              : 'You always have the right to request information about your stored data, its origin, its recipients, and the purpose of its collection at no charge. You also have the right to request that it be corrected or deleted.'}
          </p>

          <h2>{isDE ? 'Externes Hosting' : 'External Hosting'}</h2>
          <p>
            {isDE
              ? 'Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.'
              : 'This website is hosted by an external service provider (hoster). Personal data collected on this website are stored on the servers of the hoster.'}
          </p>
          <p>{isDE ? 'Wir setzen folgenden Hoster ein:' : 'We use the following hoster:'}</p>
          <p>
            <strong>Cloudflare, Inc.</strong>
            <br />
            101 Townsend St
            <br />
            San Francisco, CA 94107
            <br />
            USA
          </p>

          <h2>Cookies</h2>
          <p>
            {isDE
              ? 'Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.'
              : 'Our website uses so-called "cookies". Cookies are small text files and do not cause any damage to your device. They are either stored temporarily for the duration of a session (session cookies) or permanently (permanent cookies) on your device.'}
          </p>

          {GA_MEASUREMENT_ID && (
            <>
              <h2>Google Analytics</h2>
              <p>
                {isDE
                  ? 'Mit Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG) nutzen wir Google Analytics 4, einen Webanalysedienst der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Google setzt dafür Cookies und verarbeitet Nutzungsdaten (z. B. aufgerufene Seiten, ungefährer Standort, Geräteangaben); IP-Adressen werden von Google Analytics 4 nicht gespeichert. Daten können auch in die USA übermittelt werden; Google ist nach dem EU-U.S. Data Privacy Framework zertifiziert. Ohne Ihre Einwilligung wird Google Analytics nicht geladen. Sie können Ihre Einwilligung jederzeit über „Cookie-Einstellungen“ am Seitenende widerrufen. Weitere Informationen: https://policies.google.com/privacy'
                  : 'With your consent (Art. 6(1)(a) GDPR, Sec. 25(1) TDDDG) we use Google Analytics 4, a web analytics service of Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. Google sets cookies for this purpose and processes usage data (e.g. pages viewed, approximate location, device information); Google Analytics 4 does not store IP addresses. Data may also be transferred to the USA; Google is certified under the EU-U.S. Data Privacy Framework. Without your consent, Google Analytics is not loaded. You can withdraw your consent at any time via “Cookie settings” at the bottom of the page. Further information: https://policies.google.com/privacy'}
              </p>
            </>
          )}

          <h2>{isDE ? 'Kontaktformular' : 'Contact Form'}</h2>
          <p>
            {isDE
              ? 'Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.'
              : 'When you send us inquiries via contact form, your information from the inquiry form including the contact details you provided there will be stored by us for the purpose of processing the inquiry and in case of follow-up questions. We do not pass this data on without your consent.'}
          </p>

          <h2>{isDE ? 'SSL-Verschlüsselung' : 'SSL Encryption'}</h2>
          <p>
            {isDE
              ? 'Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte eine SSL-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt.'
              : 'This site uses SSL encryption for security reasons and for the protection of the transmission of confidential content. You can recognize an encrypted connection by the address line of the browser changing from "http://" to "https://".'}
          </p>

          <h2>Google Maps</h2>
          <p>
            {isDE
              ? 'Diese Seite nutzt den Kartendienst Google Maps. Anbieter ist die Google Ireland Limited („Google"), Gordon House, Barrow Street, Dublin 4, Irland. Zur Nutzung der Funktionen von Google Maps ist es notwendig, Ihre IP-Adresse zu speichern.'
              : 'This page uses the map service Google Maps. The provider is Google Ireland Limited ("Google"), Gordon House, Barrow Street, Dublin 4, Ireland. To use the functions of Google Maps it is necessary to save your IP address.'}
          </p>
          <p>
            {isDE
              ? 'Mehr Informationen zum Umgang mit Nutzerdaten finden Sie in der Datenschutzerklärung von Google:'
              : "For more information on how user data is handled, please refer to Google's privacy policy:"}{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              https://policies.google.com/privacy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
