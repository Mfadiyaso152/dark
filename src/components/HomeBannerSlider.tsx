import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import { BannerItem, BannerSettings } from '../types';

interface HomeBannerSliderProps {
  banners: BannerItem[];
  settings: BannerSettings;
}

export const HomeBannerSlider: React.FC<HomeBannerSliderProps> = ({
  banners,
  settings
}) => {
  // Only show active banners on the home view (never deleted and must not be deactivated)
  const activeBanners = banners.filter((b) => b.isActive !== false && !b.isDeleted);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const intervalSeconds = Math.max(1, settings?.intervalSeconds || 5);
  const autoPlay = settings?.autoPlay !== false;

  // Preload all banner images immediately for 0ms delay image switching
  useEffect(() => {
    activeBanners.forEach((b) => {
      const urls = [b.imageUrl, b.desktopImageUrl, b.tabletImageUrl, b.mobileImageUrl].filter(Boolean);
      urls.forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    });
  }, [activeBanners]);

  // Ensure index stays in range if activeBanners length changes
  useEffect(() => {
    if (currentIndex >= activeBanners.length && activeBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  // Autoplay timer
  useEffect(() => {
    if (!autoPlay || isPaused || activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, activeBanners.length, intervalSeconds]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeBanners.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeBanners.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  const handleSelectIndex = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (idx === currentIndex) return;
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  // Handle banner slide click to navigate to linkUrl if provided
  const handleBannerClick = (banner: BannerItem) => {
    const link = banner.linkUrl?.trim();
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  // If no active banners, do not display
  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];
  const hasTitle = Boolean(currentBanner.title?.trim());
  const hasDescription = Boolean(currentBanner.description?.trim());
  const hasLink = Boolean(currentBanner.linkUrl?.trim());
  const hasAnyTextOrLink = hasTitle || hasDescription || hasLink;

  const variants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 1.01
    }),
    center: {
      x: '0%',
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 26, mass: 0.75 },
        opacity: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.99,
      transition: {
        x: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
      }
    })
  };

  return (
    <div
      className="relative w-full rounded-[2.2rem] sm:rounded-[2.5rem] overflow-hidden shadow-md border border-slate-200/80 bg-slate-900 group select-none my-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Aspect Ratio Box: Responsive Height */}
      <div className="relative h-48 sm:h-60 md:h-72 lg:h-80 w-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentBanner.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
            onClick={() => handleBannerClick(currentBanner)}
            className={`absolute inset-0 w-full h-full ${
              hasLink ? 'cursor-pointer' : ''
            }`}
          >
            {/* Responsive Background Image (Device Specific) */}
            <picture className="w-full h-full block">
              {currentBanner.desktopImageUrl && (
                <source media="(min-width: 1024px)" srcSet={currentBanner.desktopImageUrl} />
              )}
              {currentBanner.tabletImageUrl && (
                <source media="(min-width: 640px)" srcSet={currentBanner.tabletImageUrl} />
              )}
              {currentBanner.mobileImageUrl && (
                <source media="(max-width: 639px)" srcSet={currentBanner.mobileImageUrl} />
              )}
              <img
                src={currentBanner.imageUrl || currentBanner.desktopImageUrl || currentBanner.tabletImageUrl || currentBanner.mobileImageUrl}
                alt={hasTitle ? currentBanner.title!.trim() : 'إعلان منصة زاد'}
                className="w-full h-full object-cover object-center"
                loading="eager"
              />
            </picture>

            {/* Gradient Overlays for optimal readability when text exists */}
            {hasAnyTextOrLink && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent pointer-events-none" />
              </>
            )}

            {/* Banner Text / Content */}
            {hasAnyTextOrLink && (
              <div className="absolute bottom-0 right-0 left-0 p-5 sm:p-7 md:p-8 z-10 text-right space-y-1.5 md:space-y-2 text-white">
                {hasTitle && (
                  <h3 className="text-base sm:text-xl md:text-2xl font-black text-white drop-shadow-md leading-tight max-w-2xl font-['Alexandria',sans-serif]">
                    {currentBanner.title!.trim()}
                  </h3>
                )}
                {hasDescription && (
                  <p className="text-xs sm:text-sm text-slate-200/90 font-medium line-clamp-2 max-w-xl leading-relaxed">
                    {currentBanner.description!.trim()}
                  </p>
                )}

                {hasLink && (
                  <div className="pt-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 py-1.5 px-3.5 bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-400/30 rounded-xl text-xs font-bold backdrop-blur-md transition shadow-sm"
                    >
                      <span>الانتقال للرابط المرفق</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
