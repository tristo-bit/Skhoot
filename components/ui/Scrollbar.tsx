import React from 'react';
import { COLORS } from '../../src/constants';

// Custom scrollbar styles using the app's color palette
export const getScrollbarStyles = (topMargin: number = 8, bottomMargin: number = 8) => `
  .custom-scrollbar::-webkit-scrollbar {
    width: 14px;
    transition: width 0.2s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 8px;
    margin-top: ${topMargin}px;
    margin-bottom: ${bottomMargin}px;
    margin-right: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: ${COLORS.nimbusCloud};
    border-radius: 8px;
    border: 5px solid transparent;
    border-right-width: 8px;
    background-clip: padding-box;
    transition: background 0.2s ease, border 0.2s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: ${COLORS.orchidTint};
    border: 3px solid transparent;
    border-right-width: 6px;
    background-clip: padding-box;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: ${COLORS.fukuBrand};
    border: 3px solid transparent;
    border-right-width: 6px;
    background-clip: padding-box;
  }
  
  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: ${COLORS.nimbusCloud} transparent;
  }
  
  .custom-scrollbar:hover {
    scrollbar-color: ${COLORS.orchidTint} transparent;
  }
`;

// Default styles for backward compatibility
export const scrollbarStyles = getScrollbarStyles(8, 8);

interface ScrollbarStylesProps {
  topMargin?: number;
  bottomMargin?: number;
}

// Inject styles into the document
export const ScrollbarStyles: React.FC<ScrollbarStylesProps> = ({ topMargin = 8, bottomMargin = 8 }) => (
  <style>{getScrollbarStyles(topMargin, bottomMargin)}</style>
);
