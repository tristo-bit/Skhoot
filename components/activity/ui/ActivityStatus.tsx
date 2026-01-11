// Reusable activity status indicator
import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { ActivityStatus as Status } from '../../../services/activityLogger';

interface ActivityStatusProps {
  status: Status;
  size?: number;
}

export const ActivityStatus: React.FC<ActivityStatusProps> = ({ status, size = 12 }) => {
  switch (status) {
    case 'success':
      return <CheckCircle size={size} className="text-green-400" />;
    case 'error':
      return <XCircle size={size} className="text-red-400" />;
    case 'pending':
      return <Clock size={size} className="text-yellow-400 animate-pulse" />;
    default:
      return null;
  }
};

export default ActivityStatus;
