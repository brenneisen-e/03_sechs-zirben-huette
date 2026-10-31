'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatGermanDate, toIsoDate } from '@/lib/site';
import {
  ArrowLeft,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Mountain,
  Globe,
  Dog,
  Baby,
  Car,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  layout: 'standard' | 'carousel' | 'tabs';
  status: 'draft' | 'published';
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogPostImage {
  id: string;
  image_url: string;
  image_alt: string | null;
  caption: string | null;
  display_order: number;
}

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
  category?: string;
}

// Carousel Cards component matching the original FeatureCarousel style
function CarouselCards({
  images,
  mediaImages,
  onImageClick,
}: {
  images: BlogPostImage[];
  mediaImages: MediaItem[];
  onImageClick: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemCount = images.length;
  const maxIndex = isMobile ? itemCount - 1 : Math.ceil(itemCount / 2) - 1;
  const totalDots = isMobile ? itemCount : Math.ceil(itemCount / 2);
  const translateValue = isMobile ? currentIndex * 100 : currentIndex * 50;

  const prev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const next = () => setCurrentIndex(Math.min(maxIndex, currentIndex + 1));

  return (
    <div className="relative">
      {/* Navigation Buttons */}
      <button
        onClick={prev}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition -translate-x-1/2 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
        disabled={currentIndex === 0}
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={next}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition translate-x-1/2 ${currentIndex >= maxIndex ? 'opacity-30 cursor-not-allowed' : ''}`}
        disabled={currentIndex >= maxIndex}
      >
        <ChevronRight size={24} />
      </button>

      {/* Carousel Track */}
      <div className="overflow-hidden mx-4 md:mx-8 pb-2">
        <div
          className="flex items-start transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${translateValue}%)` }}
        >
          {images.map((slide, index) => {
            const mediaImage = mediaImages[index] || null;
            const imageUrl = slide.image_url || (mediaImage ? mediaImage.url : '');

            return (
              <div key={index} className="w-full md:w-1/2 flex-shrink-0 px-2">
                <div className="bg-gray-50 rounded-2xl shadow-md overflow-hidden flex flex-col">
                  {/* Portrait Image or Placeholder */}
                  <div className="relative aspect-[3/4] bg-gray-100">
                    {imageUrl ? (
                      <button onClick={() => onImageClick(index)} className="w-full h-full">
                        <Image
                          src={imageUrl}
                          alt={slide.image_alt || ''}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </button>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-logo-green/10 to-logo-green/20">
                        <Mountain size={80} className="text-logo-green/40" />
                      </div>
                    )}
                    {/* Number Badge */}
                    <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-logo-green flex items-center justify-center text-white font-bold shadow-lg">
                      {index + 1}
                    </div>
                    {/* Icon Badge */}
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-logo-green shadow-lg">
                      <Mountain size={20} />
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="p-5">
                    {slide.image_alt && (
                      <h4 className="text-lg font-bold text-logo-green mb-3">{slide.image_alt}</h4>
                    )}
                    {slide.caption && (
                      <div
                        className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: slide.caption }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: totalDots }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              currentIndex === index
                ? 'bg-logo-green w-6'
                : 'bg-logo-green/30 hover:bg-logo-green/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Dog trip carousel categories
const DOG_TRIP_CATEGORIES = [
  'hund-falkert',
  'hund-rodresnock',
  'hund-drei-seen',
  'hund-hochrindl',
  'hund-millstaetter',
];

interface TabSlide {
  title: string;
  description: string;
  image_url?: string;
  image_alt?: string;
  tip?: string;
  difficulty?: string;
  duration?: string;
  distance?: string;
  age?: string;
}

interface TabData {
  title: string;
  type?: 'dog-carousel' | 'kids-accordion';
  sectionTitle?: string;
  imageCategories?: string[];
  featured?: { title: string; description: string; distance: string; age: string };
  slides: TabSlide[];
}

interface TabsData {
  intro?: string;
  tabs?: TabData[];
}

// Dog Trips Carousel - matches DogTripsCarousel.tsx exactly
function DogTripsCarouselDynamic({
  tab,
  dogTripImages,
}: {
  tab: TabData;
  dogTripImages: Record<string, MediaItem[]>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemCount = tab.slides.length;
  const maxIndex = isMobile ? itemCount - 1 : Math.ceil(itemCount / 2) - 1;
  const totalDots = isMobile ? itemCount : Math.ceil(itemCount / 2);
  const translateValue = isMobile ? currentIndex * 100 : currentIndex * 50;
  const categories = tab.imageCategories || DOG_TRIP_CATEGORIES;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Section Title */}
      {tab.sectionTitle && (
        <div className="flex flex-col items-center text-center mb-8">
          <h3
            className="text-2xl sm:text-3xl md:text-4xl text-logo-green"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {tab.sectionTitle}
          </h3>
        </div>
      )}

      <div className="relative">
        {/* Navigation Buttons */}
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition -translate-x-1/2 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => setCurrentIndex(Math.min(maxIndex, currentIndex + 1))}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition translate-x-1/2 ${currentIndex >= maxIndex ? 'opacity-30 cursor-not-allowed' : ''}`}
          disabled={currentIndex >= maxIndex}
        >
          <ChevronRight size={24} />
        </button>

        {/* Carousel Track */}
        <div className="overflow-hidden mx-4 md:mx-8">
          <div
            className="flex items-stretch transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${translateValue}%)` }}
          >
            {tab.slides.map((trip, index) => {
              const categoryKey = categories[index] as string | undefined;
              const tripImages = categoryKey ? dogTripImages[categoryKey] || [] : [];
              const categoryImage = tripImages[0];
              const slideImage = trip.image_url
                ? { url: trip.image_url, alt_text: trip.image_alt || trip.title }
                : null;
              const firstImage = slideImage || categoryImage;

              return (
                <div key={index} className="w-full md:w-1/2 flex-shrink-0 px-2">
                  <div className="bg-gray-50 rounded-2xl shadow-md overflow-hidden h-full flex flex-col">
                    {/* Portrait Image */}
                    <div className="relative aspect-[3/4] bg-gray-100">
                      {firstImage ? (
                        <Image
                          src={firstImage.url}
                          alt={firstImage.alt_text || trip.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-wood-100 to-wood-200">
                          <div className="text-center text-wood-600">
                            <Dog size={48} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Bild im Blog-Editor hochladen</p>
                          </div>
                        </div>
                      )}
                      {/* Number Badge */}
                      <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-wood-600 flex items-center justify-center text-white font-bold shadow-lg">
                        {index + 1}
                      </div>
                    </div>

                    {/* Text Content */}
                    <div className="p-5 flex-1">
                      <h4 className="text-lg font-bold text-logo-green mb-1">{trip.title}</h4>
                      {trip.difficulty && (
                        <p className="text-sm text-logo-green/70 font-medium mb-3">
                          {trip.difficulty}
                        </p>
                      )}
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {trip.description}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {trip.duration && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock size={14} /> {trip.duration}
                          </span>
                        )}
                        {trip.tip && (
                          <span className="text-wood-600 font-medium">Hinweis: {trip.tip}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalDots }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                currentIndex === index
                  ? 'bg-logo-green w-6'
                  : 'bg-logo-green/30 hover:bg-logo-green/50'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Kids Trips Section - matches KidsTripsSection.tsx exactly
function KidsTripsSectionDynamic({ tab }: { tab: TabData }) {
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Section Title */}
      {tab.sectionTitle && (
        <div className="flex flex-col items-center text-center mb-8">
          <h3
            className="text-2xl sm:text-3xl md:text-4xl text-logo-green"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {tab.sectionTitle}
          </h3>
        </div>
      )}

      {/* Featured Trip */}
      {tab.featured && (
        <div className="mb-8">
          <div className="bg-logo-green/15 rounded-2xl p-6 md:p-8 shadow-md border-2 border-logo-green/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-logo-green/20 flex items-center justify-center text-logo-green font-bold">
                1
              </span>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-logo-green">
                  {tab.featured.title}
                </h4>
                <p className="text-sm text-gray-500 font-medium">
                  <Car className="inline w-4 h-4 mr-1" />
                  {tab.featured.distance} | {tab.featured.age}
                </p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{tab.featured.description}</p>
          </div>
        </div>
      )}

      {/* Grid: Trips as expandable accordion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tab.slides.map((trip, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-logo-green/20"
          >
            <button
              onClick={() => setExpandedTrip(expandedTrip === index ? null : index)}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-logo-green/20 flex items-center justify-center text-logo-green font-bold text-sm flex-shrink-0">
                  {index + 2}
                </span>
                <div>
                  <h4 className="font-bold text-logo-green text-sm md:text-base">{trip.title}</h4>
                  {(trip.distance || trip.age) && (
                    <p className="text-xs text-gray-500">
                      <Car className="inline w-3 h-3 mr-1" />
                      {trip.distance}
                      {trip.age ? ` | ${trip.age}` : ''}
                    </p>
                  )}
                </div>
              </div>
              {expandedTrip === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {expandedTrip === index && (
              <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-logo-green/20">
                <p className="text-gray-600 text-sm leading-relaxed pt-4">{trip.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Tabs Content component for tabs layout blog posts
function TabsContent({
  content,
  dogTripImages,
}: {
  content: string;
  dogTripImages: Record<string, MediaItem[]>;
}) {
  const [activeTab, setActiveTab] = useState(0);

  let data: TabsData;
  try {
    data = JSON.parse(content);
  } catch {
    return <p className="text-gray-600">{content}</p>;
  }

  const tabs = data.tabs || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Intro */}
      {data.intro && <p className="text-gray-600 mb-10 max-w-3xl">{data.intro}</p>}

      {/* Tab buttons */}
      {tabs.length > 0 && (
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-gray-100 rounded-xl p-1.5">
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  activeTab === idx
                    ? 'bg-logo-green text-white shadow-md'
                    : 'text-gray-500 hover:text-logo-green'
                }`}
              >
                {tab.type === 'dog-carousel' && <Dog size={18} />}
                {tab.type === 'kids-accordion' && <Baby size={18} />}
                {tab.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active tab content - render based on type */}
      {tabs[activeTab] && tabs[activeTab].type === 'dog-carousel' && (
        <DogTripsCarouselDynamic tab={tabs[activeTab]} dogTripImages={dogTripImages} />
      )}
      {tabs[activeTab] && tabs[activeTab].type === 'kids-accordion' && (
        <KidsTripsSectionDynamic tab={tabs[activeTab]} />
      )}
      {tabs[activeTab] && !tabs[activeTab].type && (
        <div className="space-y-4">
          {tabs[activeTab].slides.map((slide, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{slide.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{slide.description}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Simple markdown-to-HTML converter for blog content that was saved as markdown
function markdownToHtml(md: string): string {
  // If content already looks like HTML (has tags), return as-is
  if (/<[a-z][\s\S]*>/i.test(md) && !md.startsWith('#')) {
    return md;
  }

  let html = md;

  // Convert markdown links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Split by double newlines for paragraphs, or by ## for headings
  const lines = html.split(/\n/);
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = (lines[i] ?? '').trim();
    if (!line) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(`<h3>${line.slice(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(`<h2>${line.slice(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      // Skip h1 since the title is already displayed in the header
      continue;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${line.slice(2)}</li>`);
    } else if (line.startsWith('> ')) {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(`<blockquote><p>${line.slice(2)}</p></blockquote>`);
    } else if (line === '---' || line === '***') {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push('<hr />');
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      // Bold and italic
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      line = line.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      result.push(`<p>${line}</p>`);
    }
  }
  if (inList) result.push('</ul>');

  return result.join('\n');
}

interface BlogPostViewProps {
  post: BlogPost;
  images: BlogPostImage[];
}

// Wird serverseitig mit dem fertigen Beitrag gerendert (siehe page.tsx), damit
// Text, Titel und Beschreibung schon im ausgelieferten HTML stehen — auch für
// Crawler ohne JavaScript. Nur Ersatzbilder aus der Mediathek kommen im
// Browser dazu.
export function BlogPostView({ post, images }: BlogPostViewProps) {
  const [mediaImages, setMediaImages] = useState<MediaItem[]>([]);
  const [dogTripImages, setDogTripImages] = useState<Record<string, MediaItem[]>>({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    // Karussell: Mediathek als Ersatz für Folien ohne eigenes Bild
    if (post.layout === 'carousel' && images.some((image) => !image.image_url)) {
      fetch('/api/media?category=aussen&type=image')
        .then((res) => res.json() as Promise<{ media?: MediaItem[] }>)
        .then((mediaData) => {
          if (mediaData.media) {
            setMediaImages(mediaData.media);
          }
        })
        .catch(() => {});
    }

    // Reiter: Bilder der Hunde-Ausflüge nach Kategorie (Altbestand)
    if (post.layout === 'tabs') {
      fetch('/api/media')
        .then((res) => res.json() as Promise<{ media?: (MediaItem & { category: string })[] }>)
        .then((mediaData) => {
          if (mediaData.media) {
            const grouped: Record<string, MediaItem[]> = {};
            DOG_TRIP_CATEGORIES.forEach((cat) => {
              grouped[cat] = mediaData.media!.filter((m) => m.category === cat);
            });
            setDogTripImages(grouped);
          }
        })
        .catch(() => {});
    }
  }, [post.layout, images]);

  // „Zuletzt aktualisiert“ nur, wenn es ein anderer Tag als die Veröffentlichung ist
  const updated =
    post.updated_at && formatGermanDate(post.updated_at) !== formatGermanDate(post.published_at)
      ? post.updated_at
      : null;

  // Get the image URL for lightbox (prefer blog image, fallback to media)
  const getLightboxImageUrl = (index: number): string => {
    const blogImage = images[index];
    if (blogImage?.image_url) return blogImage.image_url;
    const mediaImage = mediaImages[index];
    if (mediaImage?.url) return mediaImage.url;
    return '';
  };

  // Article-style layout for carousel and tabs posts (matches original static articles)
  const isArticleLayout = post.layout === 'carousel' || post.layout === 'tabs';
  const ArticleIcon = post.layout === 'carousel' ? Mountain : Globe;

  if (isArticleLayout) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-12 pb-20">
          <div className="container">
            {/* Back Link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-logo-green hover:text-logo-green/80 mb-8 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Zurück zum Blog</span>
            </Link>

            {/* Article Card */}
            <motion.article
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl shadow-lg overflow-hidden"
            >
              <div className="p-8 md:p-12">
                {/* Article Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-logo-green/10 flex items-center justify-center">
                    <ArticleIcon className="w-6 h-6 text-logo-green" />
                  </div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                    Blogartikel
                  </span>
                </div>

                {/* Title */}
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl text-logo-green mb-4"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {post.title}
                </h1>

                {/* Subtitle */}
                {post.subtitle && (
                  <p className="text-lg md:text-xl text-logo-green font-medium mb-4">
                    {post.subtitle}
                  </p>
                )}

                {(post.published_at || updated) && (
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-6">
                    {post.published_at && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={16} />
                        <time dateTime={toIsoDate(post.published_at)}>
                          {formatGermanDate(post.published_at)}
                        </time>
                      </span>
                    )}
                    {updated && (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw size={16} />
                        Zuletzt aktualisiert am{' '}
                        <time dateTime={toIsoDate(updated)}>{formatGermanDate(updated)}</time>
                      </span>
                    )}
                  </p>
                )}

                {/* Content / Intro text */}
                {post.layout === 'carousel' && post.content && (
                  <p className="text-gray-600 mb-10 max-w-3xl">{post.content}</p>
                )}

                {/* Carousel */}
                {post.layout === 'carousel' && images.length > 0 && (
                  <CarouselCards
                    images={images}
                    mediaImages={mediaImages}
                    onImageClick={(index) => {
                      setCurrentImageIndex(index);
                      setLightboxOpen(true);
                    }}
                  />
                )}

                {/* Tabs Content */}
                {post.layout === 'tabs' && (
                  <TabsContent content={post.content} dogTripImages={dogTripImages} />
                )}
              </div>
            </motion.article>
          </div>
        </div>

        {/* Lightbox */}
        {lightboxOpen && images.length > 0 && getLightboxImageUrl(currentImageIndex) && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            >
              <X size={32} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                  }}
                  className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
                >
                  <ChevronLeft size={40} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev + 1) % images.length);
                  }}
                  className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
                >
                  <ChevronRight size={40} />
                </button>
              </>
            )}
            <Image
              src={getLightboxImageUrl(currentImageIndex)}
              alt={images[currentImageIndex]?.image_alt || ''}
              width={1200}
              height={800}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // Standard blog post layout
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-12 pb-20">
        <article className="container max-w-4xl">
          {/* Back Link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-logo-green hover:text-logo-green/80 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Zurück zum Blog</span>
          </Link>

          {/* Cover Image */}
          {post.cover_image_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-video rounded-2xl overflow-hidden mb-8 shadow-lg"
            >
              <Image
                src={post.cover_image_url}
                alt={post.cover_image_alt || post.title}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          )}

          {/* Post Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h1
              className="text-3xl sm:text-4xl md:text-5xl text-logo-green mb-4"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {post.title}
            </h1>
            {post.subtitle && (
              <p className="text-xl text-logo-green/80 font-medium mb-4">{post.subtitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm">
              <span className="flex items-center gap-1.5">
                <User size={16} />
                {post.author}
              </span>
              {post.published_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  <time dateTime={toIsoDate(post.published_at)}>
                    {formatGermanDate(post.published_at)}
                  </time>
                </span>
              )}
              {updated && (
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={16} />
                  Zuletzt aktualisiert am{' '}
                  <time dateTime={toIsoDate(updated)}>{formatGermanDate(updated)}</time>
                </span>
              )}
            </div>
          </motion.header>

          {/* Post Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="prose prose-lg prose-green max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
          />

          {/* Standard Layout Images (after content) */}
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setCurrentImageIndex(index);
                    setLightboxOpen(true);
                  }}
                >
                  <Image
                    src={img.image_url}
                    alt={img.image_alt || ''}
                    fill
                    className="object-cover hover:scale-105 transition-transform"
                  />
                  {img.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm">{img.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </article>
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <X size={32} />
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                }}
                className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
              >
                <ChevronLeft size={40} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => (prev + 1) % images.length);
                }}
                className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
              >
                <ChevronRight size={40} />
              </button>
            </>
          )}
          <Image
            src={images[currentImageIndex]?.image_url ?? ''}
            alt={images[currentImageIndex]?.image_alt || ''}
            width={1200}
            height={800}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Blog content styles matching TipTap editor output */}
      <style jsx global>{`
        .prose img[data-style='default'] {
          border-radius: 8px;
          max-width: 100%;
          height: auto;
          margin: 1.5rem auto;
          display: block;
        }
        .prose img[data-style='rounded'] {
          border-radius: 16px;
          max-width: 80%;
          height: auto;
          margin: 1.5rem auto;
          display: block;
        }
        .prose img[data-style='circle'] {
          border-radius: 50%;
          width: 250px;
          height: 250px;
          object-fit: cover;
          margin: 1.5rem auto;
          display: block;
        }
        .prose img[data-style='full'] {
          border-radius: 0;
          width: 100%;
          height: auto;
          margin: 2rem 0;
          display: block;
        }
        .prose img:not([data-style]) {
          border-radius: 8px;
          max-width: 100%;
          height: auto;
          margin: 1.5rem auto;
          display: block;
        }
        .prose h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 0.75rem;
          margin-top: 2rem;
          color: #263d35;
        }
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1.5rem;
          color: #263d35;
        }
        .prose p {
          margin-bottom: 1rem;
          line-height: 1.75;
        }
        .prose ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose li {
          margin-bottom: 0.25rem;
        }
        .prose blockquote {
          border-left: 4px solid #263d35;
          padding-left: 1rem;
          font-style: italic;
          color: #6b7280;
          margin: 1.5rem 0;
        }
        .prose hr {
          border-top: 1px solid #e5e7eb;
          margin: 2rem 0;
        }
        .prose a {
          color: #263d35;
          text-decoration: underline;
        }
        .prose a:hover {
          color: #163f24;
        }
      `}</style>
    </>
  );
}
