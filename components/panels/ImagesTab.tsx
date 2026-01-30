import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Image as ImageIcon, RefreshCw, Trash2, 
  MessageSquarePlus, Filter, X, ChevronDown
} from 'lucide-react';
import { imageStorage, StoredImage, ImageFilter, ImageSortOrder } from '../../services/imageStorage';
import { chatAttachmentService } from '../../services/chatAttachmentService';
import { Modal } from '../ui/Modal';
import { useToast, ToastContainer } from '../ui/Toast';

interface ImagesTabProps {
  viewMode: 'list' | 'grid';
  isLoading?: boolean;
}

export const ImagesTab: React.FC<ImagesTabProps> = memo(({ viewMode, isLoading: externalLoading }) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<ImageFilter>({ source: 'all' });
  const [sortOrder, setSortOrder] = useState<ImageSortOrder>('recent');
  const [clickedButtons, setClickedButtons] = useState<Set<string>>(new Set());
  const { toasts, showToast, closeToast } = useToast();
  
  const loadImages = useCallback(() => {
    setIsLoading(true);
    try {
      const loaded = imageStorage.getImages(
        filter.source === 'all' ? undefined : filter,
        sortOrder
      );
      setImages(loaded);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, sortOrder]);
  
  useEffect(() => {
    loadImages();
  }, [loadImages]);
  
  const handleAddToChat = (image: StoredImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Button feedback
    const buttonId = `add-${image.id}`;
    setClickedButtons(prev => new Set(prev).add(buttonId));
    setTimeout(() => setClickedButtons(prev => {
      const next = new Set(prev);
      next.delete(buttonId);
      return next;
    }), 300);
    
    const fileName = image.fileName || 'image';
    
    // Use centralized service
    chatAttachmentService.addToChat({ 
      fileName, 
      filePath: image.url,
      source: image.source
    });
    
    console.log(`[ImagesTab] Added to chat: ${fileName} -> ${image.url.startsWith('data:') ? 'data-url' : image.url}`);
  };
  
  const handleDelete = (image: StoredImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Button feedback
    const buttonId = `delete-${image.id}`;
    setClickedButtons(prev => new Set(prev).add(buttonId));
    
    // Delete from image panel only (not from disk)
    imageStorage.deleteImage(image.id);
    loadImages();
    
    // Clear button feedback after animation
    setTimeout(() => setClickedButtons(prev => {
      const next = new Set(prev);
      next.delete(buttonId);
      return next;
    }), 300);
  };
  
  const handleImageClick = (image: StoredImage) => {
    setSelectedImage(image);
  };
  
  const stats = imageStorage.getStats();
  
  if (isLoading || externalLoading) {
    return <div className="flex items-center justify-center h-full">
      <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
    </div>;
  }
  
  if (images.length === 0) {
    return <div className="flex flex-col items-center justify-center h-full text-center">
      <ImageIcon size={32} className="mb-3 opacity-40" style={{ color: 'var(--text-secondary)' }} />
      <p className="text-sm font-jakarta" style={{ color: 'var(--text-secondary)' }}>No images yet</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
        Images from chat will appear here
      </p>
    </div>;
  }
  
  return (
    <>
      {/* Stats and filters bar */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {stats.total} Images • {stats.userImages} User • {stats.webSearchImages} Web
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Filter size={12} />
            <span>Filter</span>
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {showFilters && (
          <div className="flex gap-2 p-2 rounded-lg bg-white/5">
            <select
              value={filter.source || 'all'}
              onChange={(e) => setFilter({ ...filter, source: e.target.value as any })}
              className="flex-1 px-2 py-1 rounded-lg bg-white/10 text-xs outline-none"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="all">All Sources</option>
              <option value="user">User Uploads</option>
              <option value="web_search">Web Search</option>
            </select>
            
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as ImageSortOrder)}
              className="flex-1 px-2 py-1 rounded-lg bg-white/10 text-xs outline-none"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="source">By Source</option>
            </select>
          </div>
        )}
      </div>
      
      {/* Images grid/list */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-4 gap-3">
          {images.map(image => (
            <div 
              key={image.id} 
              className="relative rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all cursor-pointer group aspect-square"
              onClick={() => handleImageClick(image)}
            >
              <img
                src={image.thumbnailUrl || image.url}
                alt={image.alt || image.fileName || 'Image'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Source badge */}
              <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                image.source === 'user' ? 'bg-purple-500/80 text-white' : 'bg-cyan-500/80 text-white'
              }`}>
                {image.source === 'user' ? 'USER' : 'WEB'}
              </div>
              
              {/* Action buttons - visible on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleAddToChat(image, e)}
                  disabled={clickedButtons.has(`add-${image.id}`)}
                  className={`p-1 rounded-lg bg-fuku-brand/80 hover:bg-fuku-brand transition-all ${
                    clickedButtons.has(`add-${image.id}`) ? 'scale-90 opacity-70' : 'scale-100'
                  }`}
                  title="Add to chat"
                >
                  <MessageSquarePlus size={12} className="text-[#1e1e2e]" />
                </button>
                <button
                  onClick={(e) => handleDelete(image, e)}
                  disabled={clickedButtons.has(`delete-${image.id}`)}
                  className={`p-1 rounded-lg bg-red-500/80 hover:bg-red-500 transition-all ${
                    clickedButtons.has(`delete-${image.id}`) ? 'scale-90 opacity-70' : 'scale-100'
                  }`}
                  title="Delete"
                >
                  <Trash2 size={12} className="text-white" />
                </button>
              </div>
              
              {/* Filename overlay */}
              {image.fileName && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-2 py-1 truncate">
                  {image.fileName}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {images.map(image => (
            <div 
              key={image.id} 
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group"
            >
              <div 
                className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 cursor-pointer"
                onClick={() => handleImageClick(image)}
              >
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={image.alt || image.fileName || 'Image'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {image.fileName || 'Untitled Image'}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {image.source === 'user' ? 'User Upload' : 'Web Search'} • {new Date(image.timestamp).toLocaleDateString()}
                </p>
              </div>
              
              {/* Action buttons */}
              <button 
                onClick={(e) => handleAddToChat(image, e)}
                disabled={clickedButtons.has(`add-${image.id}`)}
                className={`p-1.5 rounded-lg bg-fuku-brand/10 hover:bg-fuku-brand/20 transition-all opacity-60 group-hover:opacity-100 ${
                  clickedButtons.has(`add-${image.id}`) ? 'scale-90 opacity-50' : 'scale-100'
                }`}
                title="Add to chat"
              >
                <MessageSquarePlus size={14} className="text-fuku-brand" />
              </button>
              <button 
                onClick={(e) => handleDelete(image, e)}
                disabled={clickedButtons.has(`delete-${image.id}`)}
                className={`p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all opacity-60 group-hover:opacity-100 ${
                  clickedButtons.has(`delete-${image.id}`) ? 'scale-90 opacity-50' : 'scale-100'
                }`}
                title="Delete"
              >
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Full-size image modal */}
      {selectedImage && (
        <Modal
          onClose={() => setSelectedImage(null)}
          showClose={false}
          overlayClassName="backdrop-blur-xl bg-black/30 dark:bg-black/60 rounded-[var(--app-radius)]"
          panelClassName="!bg-transparent !shadow-none !border-none !outline-none !ring-0 !p-0 rounded-2xl max-w-[85vw] max-h-[85vh] overflow-hidden"
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
          
          {/* Image container with rounded corners */}
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={selectedImage.url}
              alt={selectedImage.alt || selectedImage.fileName || 'Full size image'}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
          
          {/* Image filename label */}
          {selectedImage.fileName && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-xl bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white text-sm backdrop-blur-sm shadow-md max-w-[80%] truncate">
              {selectedImage.fileName}
            </div>
          )}
        </Modal>
      )}
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  );
});

ImagesTab.displayName = 'ImagesTab';
