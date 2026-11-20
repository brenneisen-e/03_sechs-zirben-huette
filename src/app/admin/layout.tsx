import '@fontsource-variable/manrope';
import '@fontsource-variable/bricolage-grotesque';
import '@/styles/office.css';

export const metadata = {
  title: 'Admin Center · Sechszirbenhütte',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Eigene Vollbild-Ansicht (page.tsx), ohne Kopf und Fuß der Website.
  // .office schaltet das Erscheinungsbild „Kontor“ ein (src/styles/office.css)
  return <div className="office">{children}</div>;
}
