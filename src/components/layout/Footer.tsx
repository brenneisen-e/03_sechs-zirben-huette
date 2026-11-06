'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import Link from 'next/link';
import { Phone, Mail, MapPin, Instagram } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';
import { MotionToggle } from '@/components/brand/MotionToggle';

export function Footer() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();

  // Don't render on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  // Abschluss: dunkelgrüne Fläche, Links hell und unterstrichen.
  return (
    <>
      <footer className="brand-footer on-zirbe bg-zirbe text-leinen relative z-10">
        <div className="brand-container py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="lg:col-span-1">
              <h3 className="text-xl mb-4" style={getTextStyle('footer_company')}>
                {getText('footer_company') || 'Sechszirbenhütte'}
              </h3>
              <p className="text-leinen text-sm" style={getTextStyle('footer_description')}>
                {getText('footer_description') ||
                  'Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen. Über 250 Jahre alte Berghütte mit Sauna in Alleinlage.'}
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="mb-4 text-holz" style={getTextStyle('footer_contact_title')}>
                {getText('footer_contact_title') || t.footer.contact}
              </h4>
              <ul className="space-y-3 text-leinen text-sm">
                <li className="flex items-start gap-2">
                  <MapPin size={18} className="text-holz flex-shrink-0 mt-0.5" />
                  <span>
                    {SITE_CONFIG.address.street}
                    <br />
                    {SITE_CONFIG.address.zip} {SITE_CONFIG.address.city}
                    <br />
                    {SITE_CONFIG.address.country}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={18} className="text-holz flex-shrink-0" />
                  <a
                    href={`tel:${SITE_CONFIG.phone.replace(/\s/g, '')}`}
                    className="brand-link brand-link--light"
                  >
                    {SITE_CONFIG.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={18} className="text-holz flex-shrink-0" />
                  <a href={`mailto:${SITE_CONFIG.email}`} className="brand-link brand-link--light">
                    {SITE_CONFIG.email}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 text-holz" style={getTextStyle('footer_legal_title')}>
                {getText('footer_legal_title') || t.footer.legal}
              </h4>
              <ul className="space-y-2 text-leinen text-sm">
                <li>
                  <Link href="/impressum" className="brand-link brand-link--light">
                    {t.navigation.impressum}
                  </Link>
                </li>
                <li>
                  <Link href="/datenschutz" className="brand-link brand-link--light">
                    {t.navigation.datenschutz}
                  </Link>
                </li>
                <li>
                  <Link href="/agb" className="brand-link brand-link--light">
                    {t.navigation.agb}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="mb-4 text-holz" style={getTextStyle('footer_social_title')}>
                {getText('footer_social_title') || t.footer.followUs}
              </h4>
              <a
                href={SITE_CONFIG.social.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-leinen brand-link brand-link--light"
              >
                <Instagram size={20} />
                <span>{SITE_CONFIG.social.instagram}</span>
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-leinen/25 text-center text-leinen/85 text-sm">
            <p style={getTextStyle('footer_copyright')}>
              {(getText('footer_copyright') || t.footer.copyright).replace(
                '{year}',
                currentYear.toString(),
              )}
            </p>
            <p className="mt-2">{SITE_CONFIG.owners}</p>
            <div className="mt-4 flex justify-center">
              <MotionToggle />
            </div>
            <p className="mt-4">
              <Link href="/admin" className="brand-link brand-link--light text-xs">
                Admin
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
