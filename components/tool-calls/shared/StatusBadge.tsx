/**
 * Status Badge Component
 * 
 * Displays the status of a tool call execution with appropriate styling.
 */

import React, { memo } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

export interface StatusBadgeProps {
  status: 'executing' | 'success' | 'error';
  durationMs?: number;
}

export const StatusBadge = memo<StatusBadgeProps>(({ status, durationMs }) => {
  const configs = {
    executing: {
      icon: <Clock size={12} className="animate-pulse" />,
      text: 'Executing...',
      className: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    },
    success: {
      icon: <CheckCircle2 size={12} />,
      text: durationMs ? `${durationMs}ms` : 'Done',
      className: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    },
    error: {
      icon: <XCircle size={12} />,
      text: 'Failed',
      className: 'bg-red-500/20 text-red-600 border-red-500/30',
    },
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.className}`}>
      {config.icon}
      {config.text}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';
