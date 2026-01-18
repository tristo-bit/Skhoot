import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Image as ImageIcon, RefreshCw, MoreHorizontal, Trash2, 
  MessageSquarePlus, Download, ExternalLink, Filter, X, ChevronDown
} from 'lucide-react';
import { imageStorage, StoredImage, ImageFilter, ImageSortOrder } from '../../services/imageStorage';

interface ImagesTabProps {
  viewMode: 'list' | 'grid';
  isLoading?: boolean;
}

// Image context menu component
const ImageContextMenu: React.FC<{
  image: StoredImage;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onDelete: (id: string) => void;
}> = ({ image, isOpen, onClose, position, onDelete }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const handleAddToChat = () => {
    // Dispatch event to add image to chat
    const event = new CustomEvent('add-image-to-chat', {
      detail: { imageUrl: image.url, fileName: image.fileName || 'image' }
    });
    window.dispatchEvent(event);
    
    // Focus the textarea
    const textarea = document.querySelector('textarea.file-mention-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
    
    console.log(`[ImagesTab] Added image to chat: ${image.fileName || image.url}`);
  };
  
  const handleDownload = async () => {
    try {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = image.fileName || `image_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('❌ Failed to download image');
    }
  };
  
  const handleViewDetails = () => {
    const details = [
      `Name: ${image.fileName || 'Unknown'}`,
      `Source: ${image.source === 'user' ? 'User Upload' : 'Web Search'}`,
      `Date: ${new Date(image.timestamp).toLocaleString()}`,
      image.searchQuery ? `Search: ${image.searchQuery}` : null,
      `URL: ${image.url.substring(0, 100)}${image.url.length > 100 ? '...' : ''}`,
    ].filter(Boolean).join('\n\n');
    
    alert(`🖼️ Image Details\n\n${details}`);
  };
  
  const handleDelete = () => {
    if (confirm(`⚠️ Delete this image?\n\n${image.fileName || 'Image'}\n\nThis cannot be undone.`)) {
      onDelete(image.id);
      onClose();
    }
  };
  
  const menuItems = [
    { icon: <MessageSquarePlus size={14} />, label: 'Add to chat', action: handleAddToChat, highlight: true },
    { divider: true },
    { icon: <ExternalLink size={14} />, label: 'View details', action: handleViewDetails },
    { icon: <Download size={14} />, label: 'Download', action: handleDownload },
    { divider: true },
    { icon: <Trash2 size={14} />, label: 'Delete', action: handleDelete, danger: true },
  ];
  
  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[99999] min-w-[180px] py-1.5 rounded-xl backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        top: Math.min(position.y, window.innerHeight - 250),
        left: Math.min(position.x, window.innerWidth - 200),
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {menuItems.map((item, i) => 
        item.divider ? (
          <div key={i} className="my-1 border-t border-white/10" />
        ) : (
          <button
            key={i}
            onClick={async (e) => {
              e.stopPropagation();
              await item.action?.();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-all hover:bg-white/10 ${
              item.danger ? 'text-red-400 hover:bg-red-500/10' : 
              (item as any).highlight ? 'bg-purple-500/10 hover:bg-purple-500/20' : ''
            }`}
            style={{ color: item.danger ? undefined : (item as any).highlight ? '#a78bfa' : 'var(--text-primary)' }}
          >
            <span className={item.danger ? 'text-red-400' : (item as any).highlight ? 'text-purple-400' : 'text-text-secondary'}>{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </div>
  );
  
  return createPortal(menu, document.body);
};

export const ImagesTab: React.FC<ImagesTabProps> = memo(({ viewMode, isLoading: externalLoading }) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ image: StoredImage; position: { x: number; y: number } } | null>(null);
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<ImageFilter>({ source: 'all' });
  const [sortOrder, setSortOrder] = useState<ImageSortOrder>('recent');
  
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
  
  const handleContextMenu = (image: StoredImage, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ image, position: { x: e.clientX, y: e.clientY } });
  };
  
  const handleMoreClick = (image: StoredImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({ image, position: { x: rect.left, y: rect.bottom + 4 } });
  };
  
  const handleDelete = (id: string) => {
    imageStorage.deleteImage(id);
    loadImages();
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
              onContextMenu={(e) => handleContextMenu(image, e)}
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
              
              {/* More button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoreClick(image, e);
                }}
                className="absolute top-2 right-2 p-1 rounded-lg bg-black/50 hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={12} className="text-white" />
              </button>
              
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
              onContextMenu={(e) => handleContextMenu(image, e)}
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
              
              <button 
                onClick={(e) => handleMoreClick(image, e)}
                className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-all opacity-60 group-hover:opacity-100"
                title="More actions"
              >
                <MoreHorizontal size={14} className="text-purple-400" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Context menu */}
      {contextMenu && (
        <ImageContextMenu
          image={contextMenu.image}
          isOpen={true}
          onClose={() => setContextMenu(null)}
          position={contextMenu.position}
          onDelete={handleDelete}
        />
      )}
      
      {/* Full-size image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            <X size={24} className="text-white" />
          </button>
          
          <div className="max-w-[90vw] max-h-[90vh] overflow-auto">
            <img
              src={selectedImage.url}
              alt={selectedImage.alt || selectedImage.fileName || 'Full size image'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {selectedImage.fileName && (
              <div className="mt-4 text-center text-white text-sm">
                {selectedImage.fileName}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});

ImagesTab.displayName = 'ImagesTab';
