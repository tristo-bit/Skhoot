import React from 'react';
import { COLORS } from '../../constants';

// Custom scrollbar styles using the app's color palette
export const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
    margin: 8px 0;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: ${COLORS.nimbusCloud};
    border-radius: 3px;
    transition: background 0.2s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: ${COLORS.orchidTint};
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:active {
    background: ${COLORS.fukuBrand};
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

// Inject styles into the document
export const ScrollbarStyles: React.FC = () => (
  <style>{scrollbarStyles}</style>
);
