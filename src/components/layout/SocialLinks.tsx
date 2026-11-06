import { Instagram } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/constants';

// Instagram und Google-Profil als einfarbige Symbole (Kopf der Website).
// Farbe kommt vom Elternelement (currentColor).

function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18.4 5.6A9 9 0 1 0 21 12h-8.5" />
    </svg>
  );
}

interface Props {
  className?: string;
  linkClassName?: string;
}

export function SocialLinks({ className = '', linkClassName = '' }: Props) {
  const link = `inline-flex h-10 w-10 items-center justify-center rounded-[4px] transition-colors ${linkClassName}`;
  return (
    <ul className={`flex items-center gap-1 ${className}`}>
      <li>
        <a
          href={SITE_CONFIG.social.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
          aria-label={`Instagram ${SITE_CONFIG.social.instagram}`}
          title="Instagram"
        >
          <Instagram size={20} aria-hidden />
        </a>
      </li>
      <li>
        <a
          href={SITE_CONFIG.social.googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
          aria-label="Sechszirbenhütte auf Google"
          title="Google"
        >
          <GoogleMark />
        </a>
      </li>
    </ul>
  );
}
