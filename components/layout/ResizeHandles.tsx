// Resize handles for borderless window - extracted from App.tsx
import React from 'react';

type ResizeDirection = 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West';

interface ResizeHandlesProps {
  onResizeStart: (direction: ResizeDirection) => void;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ onResizeStart }) => (
  <div className="absolute inset-0 pointer-events-none z-50">
    <div 
      className="absolute top-0 left-0 right-0 h-6 cursor-n-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('North')} 
    />
    <div 
      className="absolute bottom-0 left-0 right-0 h-6 cursor-s-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('South')} 
    />
    <div 
      className="absolute top-0 bottom-0 left-0 w-6 cursor-w-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('West')} 
    />
    <div 
      className="absolute top-0 bottom-0 right-0 w-6 cursor-e-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('East')} 
    />
    <div 
      className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('NorthWest')} 
    />
    <div 
      className="absolute top-0 right-0 w-8 h-8 cursor-ne-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('NorthEast')} 
    />
    <div 
      className="absolute bottom-0 left-0 w-8 h-8 cursor-sw-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('SouthWest')} 
    />
    <div 
      className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('SouthEast')} 
    />
  </div>
);

export default ResizeHandles;
