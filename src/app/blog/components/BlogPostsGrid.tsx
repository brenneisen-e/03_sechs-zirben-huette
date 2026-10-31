'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Mountain, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatGermanDate } from '@/lib/site';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  layout: 'standard' | 'carousel' | 'tabs';
  status: 'draft' | 'published';
  author: string;
  published_at: string | null;
  created_at: string;
}

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
}

interface BlogPostsGridProps {
  posts: BlogPost[];
  fallbackImages?: MediaItem[];
}

const formatDate = formatGermanDate;

export function BlogPostsGrid({ posts, fallbackImages = [] }: BlogPostsGridProps) {
  if (posts.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mb-20"
    >
      <h2 className="text-xl font-semibold text-gray-700 mb-6">Neueste Beiträge</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post, postIndex) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full"
          >
            {/* Cover Image */}
            <div className="relative aspect-video bg-gray-100 shrink-0">
              {post.cover_image_url || fallbackImages[postIndex] ? (
                <Image
                  src={post.cover_image_url || fallbackImages[postIndex]?.url || ''}
                  alt={post.cover_image_alt || post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-logo-green/10">
                  <Mountain className="w-12 h-12 text-logo-green/40" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
              <h3
                className="text-xl text-logo-green mb-2 group-hover:text-logo-green/80 transition-colors"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {post.title}
              </h3>
              {post.subtitle && (
                <p className="text-sm text-logo-green/70 font-medium mb-2">{post.subtitle}</p>
              )}
              {post.excerpt && (
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">{post.excerpt}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto pt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.published_at)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.section>
  );
}
