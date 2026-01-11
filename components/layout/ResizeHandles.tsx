// Resize handles for borderless window - extracted from App.tsx
import React from 'react';

type ResizeDirection = 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West';

interface ResizeHandlesProps {
  onResizeStart: (direction: ResizeDirection) => void;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ onResizeStart }) => (
  <div className="absolute inset-0 pointer-events-none z-50">
    {/* Edge handles - thin 4px strips along borders */}
    <div 
      className="absolute top-0 left-2 right-2 h-1 cursor-n-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('North')} 
    />
    <div 
      className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('South')} 
    />
    <div 
      className="absolute top-2 bottom-2 left-0 w-1 cursor-w-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('West')} 
    />
    <div 
      className="absolute top-2 bottom-2 right-0 w-1 cursor-e-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('East')} 
    />
    {/* Corner handles - small 8x8px squares at corners */}
    <div 
      className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('NorthWest')} 
    />
    <div 
      className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('NorthEast')} 
    />
    <div 
      className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('SouthWest')} 
    />
    <div 
      className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize pointer-events-auto" 
      onMouseDown={() => onResizeStart('SouthEast')} 
    />
  </div>
);

export default ResizeHandles;
