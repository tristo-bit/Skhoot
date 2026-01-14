import React, { useEffect, useState, useCallback, memo } from 'react';
import { Message } from '../../types';
import { COLORS } from '../../src/constants';

interface MessageMarkersProps {
  messages: Message[];
  scrollRef: React.RefObject<HTMLDivElement>;
  containerHeight: number;
  scrollHeight: number;
  promptAreaHeight: number;
}

// Header height threshold - tooltips near the top will be positioned below the marker
const HEADER_HEIGHT = 60;
const TOOLTIP_HEIGHT = 48; // Approximate tooltip height

export const MessageMarkers = memo<MessageMarkersProps>(({
  messages,
  scrollRef,
  containerHeight,
  scrollHeight,
  promptAreaHeight,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [messagePositions, setMessagePositions] = useState<Map<string, number>>(new Map());

  // Calculate positions of user messages
  useEffect(() => {
    if (!scrollRef.current || scrollHeight === 0) return;

    const positions = new Map<string, number>();
    const scrollEl = scrollRef.current;
    
    messages.forEach((msg) => {
      if (msg.role === 'user') {
        const msgEl = scrollEl.querySelector(`[data-message-id="${msg.id}"]`);
        if (msgEl) {
          const rect = msgEl.getBoundingClientRect();
          const scrollRect = scrollEl.getBoundingClientRect();
          const relativeTop = rect.top - scrollRect.top + scrollEl.scrollTop;
          // Calculate position as percentage of scroll height, accounting for prompt area
          const availableTrackHeight = containerHeight - promptAreaHeight - 16; // 16px for margins
          const position = (relativeTop / scrollHeight) * availableTrackHeight;
          positions.set(msg.id, Math.max(8, Math.min(position, availableTrackHeight - 24)));
        }
      }
    });
    
    setMessagePositions(positions);
  }, [messages, scrollRef, scrollHeight, containerHeight, promptAreaHeight]);

  const handleMarkerClick = useCallback((msgId: string) => {
    if (!scrollRef.current) return;
    const msgEl = scrollRef.current.querySelector(`[data-message-id="${msgId}"]`);
    if (msgEl) {
      msgEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollRef]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getMessageTitle = (content: string) => {
    const firstLine = content.split('\n')[0];
    return firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine;
  };

  // Determine tooltip placement based on marker position
  const getTooltipPlacement = (markerPosition: number): 'center' | 'below' | 'above' => {
    // If marker is near the top (would overlap header), show tooltip below
    if (markerPosition < HEADER_HEIGHT + TOOLTIP_HEIGHT / 2) {
      return 'below';
    }
    // If marker is near the bottom (would overlap prompt area), show tooltip above
    if (markerPosition > containerHeight - promptAreaHeight - TOOLTIP_HEIGHT) {
      return 'above';
    }
    return 'center';
  };

  const getTooltipStyles = (placement: 'center' | 'below' | 'above', isHovered: boolean) => {
    const baseStyles = {
      opacity: isHovered ? 1 : 0,
      pointerEvents: isHovered ? 'auto' as const : 'none' as const,
      minWidth: 120,
      maxWidth: 200,
    };

    switch (placement) {
      case 'below':
        return {
          ...baseStyles,
          top: '100%',
          right: 0,
          marginTop: 8,
          transform: `translateX(${isHovered ? 0 : 8}px)`,
        };
      case 'above':
        return {
          ...baseStyles,
          bottom: '100%',
          right: 0,
          marginBottom: 8,
          transform: `translateX(${isHovered ? 0 : 8}px)`,
        };
      default: // center
        return {
          ...baseStyles,
          top: '50%',
          right: 24,
          transform: `translateY(-50%) translateX(${isHovered ? 0 : 8}px)`,
        };
    }
  };

  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return null;

  return (
    <div 
      className="absolute right-0 top-0 w-8 z-10 pointer-events-none"
      style={{ 
        height: `calc(100% - ${promptAreaHeight}px)`,
        right: 20,
      }}
    >
      {userMessages.map((msg) => {
        const position = messagePositions.get(msg.id);
        if (position === undefined) return null;

        const isHovered = hoveredId === msg.id;
        const timestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
        const tooltipPlacement = getTooltipPlacement(position);
        const tooltipStyles = getTooltipStyles(tooltipPlacement, isHovered);

        return (
          <div
            key={msg.id}
            className="absolute pointer-events-auto cursor-pointer group"
            style={{
              top: position,
              right: 4,
              transform: 'translateY(-50%)',
            }}
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleMarkerClick(msg.id)}
          >
            {/* Marker dot */}
            <div
              className="w-3 h-3 rounded-full transition-all duration-200"
              style={{
                backgroundColor: isHovered ? COLORS.fukuBrand : COLORS.orchidTint,
                boxShadow: isHovered ? `0 0 8px ${COLORS.fukuBrand}80` : 'none',
                transform: isHovered ? 'scale(1.3)' : 'scale(1)',
              }}
            />
            
            {/* Tooltip with smart placement */}
            <div
              className="absolute whitespace-nowrap transition-all duration-200 glass-elevated rounded-lg px-3 py-2 shadow-lg"
              style={tooltipStyles}
            >
              <div 
                className="text-xs font-semibold text-text-primary truncate"
                style={{ fontSize: 11 }}
              >
                {getMessageTitle(msg.content)}
              </div>
              <div 
                className="text-text-secondary mt-0.5"
                style={{ fontSize: 10 }}
              >
                {formatDate(timestamp)} · {formatTime(timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

MessageMarkers.displayName = 'MessageMarkers';
