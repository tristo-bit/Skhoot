import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Image as ImageIcon, RefreshCw, Trash2, 
  MessageSquarePlus, Download, Filter, X, ChevronDown
} from 'lucide-react';
import { imageStorage, StoredImage, ImageFilter, ImageSortOrder } from '../../services/imageStorage';
import { Modal } from '../ui/Modal';

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
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [clickedButton, setClickedButton] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2000);
  };

  const handleButtonClick = (buttonId: string) => {
    setClickedButton(buttonId);
    setTimeout(() => setClickedButton(null), 200);
  };
  
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
  
  const handleDelete = (id: string) => {
    // Only remove from Images panel storage, not from disk
    imageStorage.deleteImage(id);
    loadImages();
  };
  
  const handleImageClick = (image: StoredImage) => {
    setSelectedImage(image);
  };
  
  const handleAddToChat = (image: StoredImage, e: React.MouseEvent) => {
    e.stopPropagation();
    handleButtonClick(`add-${image.id}`);
    
    // Dispatch event to add image to chat - using same event as FileExplorer
    const fileName = image.fileName || `image_${Date.now()}.jpg`;
    
    console.log('[ImagesTab] Adding image to chat:', {
      fileName,
      url: image.url,
      source: image.source
    });
    
    const event = new CustomEvent('add-file-reference', {
      detail: { fileName, filePath: image.url }
    });
    window.dispatchEvent(event);
    
    console.log('[ImagesTab] Event dispatched: add-file-reference');
    
    // Focus the textarea
    const textarea = document.querySelector('textarea.file-mention-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
      console.log('[ImagesTab] Textarea focused');
    } else {
      console.warn('[ImagesTab] Textarea not found');
    }
  };
  
  const handleDownloadImage = async (image: StoredImage, e: React.MouseEvent) => {
    e.stopPropagation();
    handleButtonClick(`download-${image.id}`);
    
    try {
      // Fetch the image as a blob to trigger actual download
      const response = await fetch(image.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = image.fileName || `image_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
      
      console.log('[ImagesTab] Download successful:', image.fileName);
      showToast(`✓ Downloaded: ${image.fileName || 'image'}`);
    } catch (error) {
      console.error('[ImagesTab] Download failed:', error);
      alert(`❌ Download failed\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleDeleteDirect = (image: StoredImage, e: React.MouseEvent) => {
    e.stopPropagation();
    handleButtonClick(`delete-${image.id}`);
    
    if (confirm(`⚠️ Remove this image from Images panel?\n\n${image.fileName || 'Image'}\n\nThe file will remain on your disk.`)) {
      handleDelete(image.id);
    }
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
      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-green-500/90 text-white text-sm font-medium shadow-lg animate-fade-in">
          {toast.message}
        </div>
      )}
      
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
              
              {/* Action buttons - Add to chat, Download, and Delete */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleAddToChat(image, e)}
                  className={`p-1 rounded-lg hover:bg-white/10 transition-all ${clickedButton === `add-${image.id}` ? 'scale-90' : 'scale-100'}`}
                  title="Add to chat"
                >
                  <MessageSquarePlus size={12} className="text-purple-400" />
                </button>
                <button
                  onClick={(e) => handleDownloadImage(image, e)}
                  className={`p-1 rounded-lg hover:bg-white/10 transition-all ${clickedButton === `download-${image.id}` ? 'scale-90' : 'scale-100'}`}
                  title="Download"
                >
                  <Download size={12} className="text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={(e) => handleDeleteDirect(image, e)}
                  className={`p-1 rounded-lg hover:bg-white/10 transition-all ${clickedButton === `delete-${image.id}` ? 'scale-90' : 'scale-100'}`}
                  title="Delete"
                >
                  <Trash2 size={12} className="text-red-400" />
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
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => handleImageClick(image)}
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
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
              
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                <button 
                  onClick={(e) => handleAddToChat(image, e)}
                  className={`p-1.5 rounded-lg hover:bg-white/10 transition-all ${clickedButton === `add-${image.id}` ? 'scale-90' : 'scale-100'}`}
                  title="Add to chat"
                >
                  <MessageSquarePlus size={14} className="text-purple-400" />
                </button>
                <button 
                  onClick={(e) => handleDownloadImage(image, e)}
                  className={`p-1.5 rounded-lg hover:bg-white/10 transition-all ${clickedButton === `download-${image.id}` ? 'scale-90' : 'scale-100'}`}
                  title="Download"
                >
                  <Download size={14} className="text-gray-700 dark:text-gray-300" />
                </button>
                <button 
                  onClick={(e) => handleDeleteDirect(image, e)}
                  className={`p-1.5 rounded-lg hover:bg-white/10 transition-all ${clickedButton === `delete-${image.id}` ? 'scale-90' : 'scale-100'}`}
                  title="Delete"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
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
    </>
  );
});

ImagesTab.displayName = 'ImagesTab';
