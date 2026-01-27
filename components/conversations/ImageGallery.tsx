import { memo, useState } from 'react';
import { ZoomIn, X } from 'lucide-react';
import { Modal } from '../ui/Modal';

export interface ImageItem {
  url: string;
  alt?: string;
  fileName?: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  maxDisplay?: number;
  className?: string;
}

export const ImageGallery = memo<ImageGalleryProps>(({ 
  images, 
  maxDisplay = 6,
  className = ''
}) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  
  if (!images || images.length === 0) return null;
  
  const displayImages = showAll ? images : images.slice(0, maxDisplay);
  const hasMore = images.length > maxDisplay;
  
  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {displayImages.map((image, index) => (
          <div
            key={index}
            className="relative group cursor-pointer rounded-lg overflow-hidden glass-subtle hover:glass-elevated transition-all"
            style={{
              width: '120px',
              height: '120px',
            }}
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={image.url}
              alt={image.alt || image.fileName || `Image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Fallback for broken images
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center text-text-secondary text-xs">
                      <span>Failed to load</span>
                    </div>
                  `;
                }
              }}
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn size={24} className="text-white" />
            </div>
            
            {/* Image label */}
            {image.fileName && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-2 py-1 truncate">
                {image.fileName}
              </div>
            )}
          </div>
        ))}
        
        {/* Show more button */}
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center justify-center rounded-lg glass-subtle hover:glass-elevated transition-all text-text-secondary hover:text-text-primary"
            style={{
              width: '120px',
              height: '120px',
            }}
          >
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">+{images.length - maxDisplay}</div>
              <div className="text-xs">View More</div>
            </div>
          </button>
        )}
      </div>
      
      {/* Full-size image modal */}
      {selectedImage && (
        <Modal
          onClose={() => setSelectedImage(null)}
          showClose={false}
          overlayClassName="backdrop-blur-xl bg-black/30 dark:bg-black/60 rounded-[var(--app-radius)]"
          panelClassName="!bg-transparent !shadow-none !border-none !outline-none !ring-0 !p-0 !rounded-none max-w-[90vw] max-h-[90vh]"
          bodyClassName="!p-0 !border-none !outline-none flex flex-col items-center justify-center gap-3 relative"
        >
          {/* Close button - fixed to top right of viewport */}
          <button
            onClick={() => setSelectedImage(null)}
            className="fixed top-6 right-6 z-[60] p-2.5 rounded-full bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black/90 transition-all shadow-lg group"
            aria-label="Close image"
          >
            <X size={20} className="text-gray-800 dark:text-white group-hover:scale-110 transition-transform" />
          </button>
          
          {/* Image */}
          <img
            src={selectedImage.url}
            alt={selectedImage.alt || selectedImage.fileName || 'Full size image'}
            className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg"
          />
          
          {/* Image filename label */}
          {selectedImage.fileName && (
            <div className="px-4 py-2 rounded-lg bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white text-sm backdrop-blur-sm shadow-md max-w-full truncate">
              {selectedImage.fileName}
            </div>
          )}
        </Modal>
      )}
    </>
  );
});

ImageGallery.displayName = 'ImageGallery';
