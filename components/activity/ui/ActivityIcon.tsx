// Reusable activity icon component
import React from 'react';
import { 
  FileText, 
  MessageSquare, 
  Archive, 
  Trash2, 
  HardDrive, 
  Search,
  MessageCircle,
  Mic,
  Settings
} from 'lucide-react';
import { COLORS } from '../../../src/constants';
import { ActivityAction } from '../../../services/activityLogger';

interface ActivityIconProps {
  action: ActivityAction;
  size?: number;
}

const iconMap: Record<ActivityAction, React.ElementType> = {
  'File Search': FileText,
  'Content Search': Search,
  'Message Search': MessageSquare,
  'Archive': Archive,
  'Cleanup': Trash2,
  'Disk Analysis': HardDrive,
  'AI Chat': MessageCircle,
  'Voice Input': Mic,
  'Settings Change': Settings
};

const colorMap: Record<ActivityAction, string> = {
  'File Search': COLORS.almostAqua,
  'Content Search': COLORS.almostAqua,
  'Message Search': COLORS.raindropsOnRoses,
  'Archive': COLORS.orchidTint,
  'Cleanup': COLORS.lemonIcing,
  'Disk Analysis': COLORS.iceMelt,
  'AI Chat': COLORS.nimbusCloud,
  'Voice Input': COLORS.raindropsOnRoses,
  'Settings Change': COLORS.orchidTint
};

export const ActivityIcon: React.FC<ActivityIconProps> = ({ action, size = 14 }) => {
  const Icon = iconMap[action] || Search;
  return <Icon size={size} />;
};

export const getActivityColor = (action: ActivityAction): string => {
  return colorMap[action] || COLORS.nimbusCloud;
};

export default ActivityIcon;
