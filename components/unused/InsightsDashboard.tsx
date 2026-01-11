import React from 'react';
import { TrendingUp, Clock, HardDrive, Zap } from 'lucide-react';
import { COLORS, GLASS_STYLES } from '../../src/constants';

interface Insight {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

const INSIGHTS: Insight[] = [
  {
    id: 'storage',
    title: 'Storage Saved',
    value: '12.4 GB',
    change: '+2.1 GB this week',
    trend: 'up',
    icon: HardDrive,
    color: COLORS.almostAqua
  },
  {
    id: 'efficiency',
    title: 'Search Efficiency',
    value: '94%',
    change: '+5% improvement',
    trend: 'up',
    icon: Zap,
    color: COLORS.lemonIcing
  },
  {
    id: 'activity',
    title: 'Files Organized',
    value: '247',
    change: '32 today',
    trend: 'up',
    icon: TrendingUp,
    color: COLORS.orchidTint
  },
  {
    id: 'time',
    title: 'Time Saved',
    value: '4.2 hrs',
    change: 'This month',
    trend: 'stable',
    icon: Clock,
    color: COLORS.raindropsOnRoses
  }
];

export const InsightsDashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {INSIGHTS.map((insight) => {
        const IconComponent = insight.icon;
        return (
          <div
            key={insight.id}
            className="p-4 rounded-lg"
            style={{
              backgroundColor: insight.color,
              ...GLASS_STYLES.subtle
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <IconComponent className="w-5 h-5" style={{ color: COLORS.textPrimary }} />
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  insight.trend === 'up' ? 'bg-green-100 text-green-700' : 
                  insight.trend === 'down' ? 'bg-red-100 text-red-700' : 
                  'bg-gray-100 text-gray-700'
                }`}
              >
                {insight.change}
              </span>
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: COLORS.textPrimary }}>
              {insight.value}
            </div>
            <div className="text-sm" style={{ color: COLORS.textSecondary }}>
              {insight.title}
            </div>
          </div>
        );
      })}
    </div>
  );
};