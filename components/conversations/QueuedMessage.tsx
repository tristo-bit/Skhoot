import React, { useState, memo, useRef, useEffect } from 'react';
import { Send, X, Edit3, Zap } from 'lucide-react';
import { IconButton } from '../buttonFormat';

interface QueuedMessageProps {
  message: string;
  onSendNow: () => void;
  onDiscard: () => void;
  onEdit?: (newText: string) => void;
}

export const QueuedMessage = memo<QueuedMessageProps>(({ 
  message, 
  onSendNow, 
  onDiscard,
  onEdit,
}) => {
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Check if content is small and adjust button size accordingly
  useEffect(() => {
    if (contentRef.current) {
      const width = contentRef.current.offsetWidth;
      setIsCompact(width < 180);
    }
  }, [message]);
  
  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);
  
  const handleDiscard = () => {
    setIsDiscarding(true);
    setTimeout(() => {
      onDiscard();
    }, 400);
  };
  
  const handleEdit = () => {
    setEditedText(message);
    setIsEditing(true);
  };
  
  const handleSaveEdit = () => {
    if (editedText.trim() && onEdit) {
      onEdit(editedText.trim());
    }
    setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText('');
  };
  
  if (isDiscarding) {
    return (
      <div className="flex justify-end">
        <div 
          className="flex items-center justify-center"
          style={{
            animation: 'morphToIcon 400ms ease-out forwards',
          }}
        >
          <style>{`
            @keyframes morphToIcon {
              0% {
                opacity: 1;
                transform: scale(1);
              }
              50% {
                opacity: 0.7;
                transform: scale(0.5);
              }
              100% {
                opacity: 0;
                transform: scale(0) translateY(-20px);
              }
            }
          `}</style>
          <div className="glass-subtle rounded-full p-3 flex items-center justify-center">
            <Zap size={20} className="text-text-secondary" />
          </div>
        </div>
      </div>
    );
  }

  const buttonSize = isCompact ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-2xl';
  const iconSize = isCompact ? 14 : 18;
  
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative max-w-[85%]">
        {/* Queued indicator - lightning bolt */}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center z-10">
          <Zap size={12} className="text-white" fill="white" />
        </div>
        
        <div 
          ref={contentRef}
          className={`glass-elevated rounded-3xl rounded-tr-none border border-amber-500/30 ${isEditing ? 'min-w-[400px]' : ''}`}
          style={{ background: 'rgba(245, 158, 11, 0.05)' }}
        >
          {/* Header */}
          <div className={`flex items-center gap-2 ${isCompact ? 'px-3 pt-2' : 'px-4 pt-3'}`}>
            <span className={`text-amber-500 font-semibold font-jakarta ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
              Queued - will interrupt AI
            </span>
          </div>
          
          <div className={isCompact ? 'p-3 pt-1.5 space-y-1.5' : 'p-4 pt-2 space-y-2'}>
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-transparent border border-amber-500/30 rounded-xl p-3 outline-none font-semibold font-jakarta text-text-primary resize-none focus:border-amber-500"
                style={{
                  fontSize: '14px',
                  minHeight: '100px',
                  lineHeight: '1.5',
                }}
                placeholder="Edit your message..."
              />
            ) : (
              <p 
                className={`leading-relaxed font-semibold font-jakarta text-text-primary ${isCompact ? 'text-[12px]' : 'text-[13px]'}`}
              >
                {message}
              </p>
            )}
          </div>
          
          {/* Action buttons */}
          <div className={`flex items-center ${isCompact ? 'px-3 pb-2.5 gap-1.5' : 'px-4 pb-3 gap-2'}`}>
            {isEditing ? (
              <>
                <IconButton
                  onClick={handleSaveEdit}
                  icon={<Send size={iconSize} />}
                  variant="glass"
                  size={isCompact ? 'sm' : 'md'}
                  className="text-text-primary hover:brightness-95"
                />
                
                <IconButton
                  onClick={handleCancelEdit}
                  icon={<X size={iconSize} />}
                  variant="ghost"
                  size={isCompact ? 'sm' : 'md'}
                  className="text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                />
              </>
            ) : (
              <>
                <IconButton
                  onClick={onSendNow}
                  icon={<Zap size={iconSize} />}
                  variant="glass"
                  size={isCompact ? 'sm' : 'md'}
                  className="text-amber-500 hover:bg-amber-500/20"
                  title="Send now (interrupts AI)"
                />
                
                <IconButton
                  onClick={handleEdit}
                  icon={<Edit3 size={iconSize} />}
                  variant="ghost"
                  size={isCompact ? 'sm' : 'md'}
                  className="text-text-secondary hover:text-text-primary"
                  title="Edit message"
                />
                
                <IconButton
                  onClick={handleDiscard}
                  icon={<X size={iconSize} />}
                  variant="ghost"
                  size={isCompact ? 'sm' : 'md'}
                  className="text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Discard"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

QueuedMessage.displayName = 'QueuedMessage';
