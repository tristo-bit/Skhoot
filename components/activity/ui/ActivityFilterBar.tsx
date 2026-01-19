// Filter bar for activity logs - reusable UI component
import React from 'react';
import { ActivityFilter } from '../../../services/activityLogger';

interface FilterOption {
  id: ActivityFilter;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'search', label: 'Searches' },
  { id: 'chat', label: 'Chat' }
];

interface ActivityFilterBarProps {
  activeFilter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
}

export const ActivityFilterBar: React.FC<ActivityFilterBarProps> = ({
  activeFilter,
  onFilterChange
}) => {
  return (
    <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
      {FILTER_OPTIONS.map(option => (
        <button
          key={option.id}
          onClick={() => onFilterChange(option.id)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-jakarta whitespace-nowrap transition-all active:scale-95 ${
            activeFilter === option.id 
              ? 'glass-subtle text-accent' 
              : 'glass-subtle text-text-secondary hover:glass'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ActivityFilterBar;
