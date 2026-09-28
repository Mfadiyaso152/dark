import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';
import { BannerItem, BannerSettings } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface HomeBannerSliderProps {
  banners: BannerItem[];
  settings: BannerSettings;
}

export const HomeBannerSlider: React.FC<HomeBannerSliderProps> = ({
  banners,
  settings
}) => {
  // Only show active banners on the home view sorted by order
  const activeBanners = [...banners]
    .filter((b) => b.isActive !== false && !b.isDeleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const intervalSeconds = Math.max(2, settings?.intervalSeconds || 5);
  const autoPlay = settings?.autoPlay !== false;

  // Preload all banner images immediately
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

  // Autoplay timer with smooth interval
  useEffect(() => {
    if (!autoPlay || isPaused || activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, activeBanners.length, intervalSeconds]);

  const handleNext = useCallback(() => {
    if (activeBanners.length <= 1) return;
    triggerHaptic('light');
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const handlePrev = useCallback(() => {
    if (activeBanners.length <= 1) return;
    triggerHaptic('light');
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  const handleSelectIndex = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (idx === currentIndex) return;
    triggerHaptic('selection');
    setDirection(idx > currentIndex ? 1 : -1);
    setCurrentIndex(idx);
  };

  // Drag End handler for touch swiping with low threshold for smooth feel
  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number } }) => {
    const swipeThreshold = 30;
    // In RTL / standard horizontal swipe
    if (info.offset.x < -swipeThreshold || info.velocity.x < -200) {
      handleNext();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 200) {
      handlePrev();
    }
  };

  // Handle banner slide click to navigate to linkUrl if provided
  const handleBannerClick = (banner: BannerItem) => {
    const link = banner.linkUrl?.trim();
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];
  const hasTitle = Boolean(currentBanner.title?.trim());
  const hasDescription = Boolean(currentBanner.description?.trim());
  const hasLink = Boolean(currentBanner.linkUrl?.trim());
  const hasAnyTextOrLink = hasTitle || hasDescription || hasLink;

  const slideVariants: Variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0.1,
      scale: 0.98
    }),
    center: {
      x: '0%',
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 30, mass: 0.8 },
        opacity: { duration: 0.35, ease: 'easeOut' },
        scale: { duration: 0.35, ease: 'easeOut' }
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0.1,
      scale: 0.98,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 30, mass: 0.8 },
        opacity: { duration: 0.25, ease: 'easeIn' },
        scale: { duration: 0.25, ease: 'easeIn' }
      }
    })
  };

  return (
    <div
      className="relative w-full rounded-[2.2rem] sm:rounded-[2.5rem] overflow-hidden shadow-md border border-slate-200/80 bg-slate-950 group select-none my-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Aspect Ratio Box: Responsive Height */}
      <div className="relative h-48 sm:h-60 md:h-72 lg:h-80 w-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentBanner.id || currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            onClick={() => handleBannerClick(currentBanner)}
            style={{ touchAction: 'pan-y' }}
            className={`absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing will-change-transform ${
              hasLink ? 'cursor-pointer' : ''
            }`}
          >
            {/* Responsive Background Image (Device Specific) */}
            <picture className="w-full h-full block pointer-events-none">
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
                className="w-full h-full object-cover object-center pointer-events-none"
                loading="eager"
                draggable={false}
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
              <div className="absolute bottom-0 right-0 left-0 p-5 sm:p-7 md:p-8 z-10 text-right space-y-1.5 md:space-y-2 text-white pointer-events-none">
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
                  <div className="pt-1 pointer-events-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(currentBanner.linkUrl!.trim(), '_blank', 'noopener,noreferrer');
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 active:bg-white/45 text-white border border-white/40 shadow-xs backdrop-blur-md transition-all duration-200 cursor-pointer group/link hover:scale-105"
                      title="فتح الرابط المرفق"
                      aria-label="فتح الرابط المرفق"
                    >
                      <ExternalLink className="w-4 h-4 text-white group-hover/link:translate-x-[-1px] group-hover/link:translate-y-[-1px] transition-transform duration-200" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next / Prev Navigation Buttons on Hover */}
        {activeBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/40 hover:bg-slate-950/75 text-white/90 hover:text-white border border-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md cursor-pointer hover:scale-105"
              aria-label="السابق"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/40 hover:bg-slate-950/75 text-white/90 hover:text-white border border-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md cursor-pointer hover:scale-105"
              aria-label="التالي"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}

        {/* Pagination Dots */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/50 backdrop-blur-md border border-white/15">
            {activeBanners.map((b, idx) => (
              <button
                key={b.id || idx}
                type="button"
                onClick={(e) => handleSelectIndex(idx, e)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex ? 'w-5 bg-white shadow-xs' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`انتقل إلى الشريحة ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
