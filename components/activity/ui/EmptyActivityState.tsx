// Empty state for activity logs - reusable UI component
import React from 'react';
import { Clock } from 'lucide-react';

export const EmptyActivityState: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <Clock size={32} className="mx-auto mb-3 text-text-secondary opacity-50" />
      <p className="text-[12px] font-semibold text-text-secondary font-jakarta">
        No activity yet
      </p>
      <p className="text-[10px] text-text-secondary font-jakarta mt-1 opacity-70">
        Your actions will appear here
      </p>
    </div>
  );
};

export default EmptyActivityState;
