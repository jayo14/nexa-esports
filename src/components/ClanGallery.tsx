
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GalleryItem {
  id: number;
  type: 'image' | 'video';
  src: string;
  thumbnail?: string;
  title: string;
  description: string;
}

const mockGalleryItems: GalleryItem[] = [
  {
    id: 1,
    type: 'image',
    src: 'https://ik.imagekit.io/mshcgnjju/NeXa/clan.jpg',
    title: 'Clan War',
    description: 'Gearing up for for Clan Wars'
  },
  {
    id: 2,
    type: 'video',
    src: 'https://ik.imagekit.io/mshcgnjju/NeXa/training_day.mp4',
    thumbnail: '/placeholder.svg',
    title: 'Training Day: Tactical Gameplay',
    description: 'Perfect team coordination in Ranked MP'
  },
  {
    id: 3,
    type: 'image',
    src: 'https://ik.imagekit.io/mshcgnjju/NeXa/winners_circle.jpg',
    title: 'Tournament Win',
    description: 'Nexa Esports claims championship title'
  },
  {
    id: 4,
    type: 'image',
    src: 'https://ik.imagekit.io/mshcgnjju/NeXa/scrim.jpg',
    title: 'Scrim formation',
    description: 'Elite team formation ready for battle'
  },
  {
    id: 5,
    type: 'video',
    src: 'https://ik.imagekit.io/mshcgnjju/NeXa/clan_war.mp4',
    thumbnail: 'https://ik.imagekit.io/mshcgnjju/NeXa/team.jpg',
    title: 'Clan Setup',
    description: 'Clan ready for Clan War '
  }
];

export const ClanGallery: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === mockGalleryItems.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(currentIndex === 0 ? mockGalleryItems.length - 1 : currentIndex - 1);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(currentIndex === mockGalleryItems.length - 1 ? 0 : currentIndex + 1);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    setTimeout(() => setIsAutoPlaying(true), 5000);
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background to-background/95">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-orbitron font-bold mb-4 bg-gradient-to-r from-primary to-red-300 bg-clip-text text-transparent">
            Clan Gallery
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Witness our legendary moments, epic victories, and tactical excellence in action.
          </p>
        </div>

        <div className="relative group">
          {/* Main Gallery Display */}
          <div className="relative w-full h-96 md:h-[500px] overflow-hidden rounded-xl border border-border/30 nexa-glow">
            <div
              className="flex transition-transform duration-500 ease-out h-full"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {mockGalleryItems.map((item, index) => (
                <div key={item.id} className="w-full h-full flex-shrink-0 relative">
                  <img
                    src={item.type === 'video' ? item.thumbnail || item.src : item.src}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center gap-2 mb-2">
                        {item.type === 'video' ? (
                          <Play className="w-5 h-5 text-primary" />
                        ) : (
                          <Image className="w-5 h-5 text-primary" />
                        )}
                        <span className="text-primary font-orbitron text-sm font-medium">
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-xl font-orbitron font-bold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-300">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Play Button for Videos */}
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        size="lg"
                        className="nexa-button rounded-full w-16 h-16 p-0"
                      >
                        <Play className="w-6 h-6 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
              onClick={goToPrevious}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all duration-300"
              onClick={goToNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {mockGalleryItems.map((_, index) => (
              <button
                key={index}
                className={`w-5 h-2 rounded-sm transition-all duration-300 ${index === currentIndex
                    ? 'bg-primary scale-125'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>

          {/* Autoplay Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
            <div className={`w-2 h-2 rounded-full ${isAutoPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            {isAutoPlaying ? 'Auto' : 'Manual'}
          </div>
        </div>
      </div>
    </section>
  );
};
