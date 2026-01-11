import { memo } from 'react';
import { FileText, MessageSquare, Search, Trash2 } from 'lucide-react';
import { COLORS } from '../../src/constants';

export const SearchingIndicator = memo<{ type: 'files' | 'messages' | 'disk' | 'cleanup' }>(({ type }) => {
  const labels = {
    files: 'Searching files...',
    messages: 'Searching messages...',
    disk: 'Analyzing disk...',
    cleanup: 'Scanning for cleanup...',
  };

  const icons = {
    files: <FileText size={16} />,
    messages: <MessageSquare size={16} />,
    disk: <Search size={16} />,
    cleanup: <Trash2 size={16} />,
  };

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-subtle border-glass-border">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center glass-subtle">
            <span className="text-accent animate-pulse">{icons[type]}</span>
          </div>
          <div 
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{ 
              background: `linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)`,
              opacity: 0.3,
              animation: 'scan 1.5s ease-in-out infinite',
            }}
          />
        </div>
        <div>
          <p className="text-[12px] font-bold font-jakarta text-text-primary">
            {labels[type]}
          </p>
          <div className="flex gap-1 mt-1">
            {[0, 0.2, 0.4].map((delay, i) => (
              <div 
                key={i}
                className="w-1 h-1 rounded-full animate-bounce"
                style={{ 
                  animationDelay: `${delay}s`,
                  backgroundColor: COLORS.fukuBrand,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
});
SearchingIndicator.displayName = 'SearchingIndicator';

export const LoadingIndicator = memo(() => (
  <div className="flex justify-start">
    <div className="px-1 py-2 flex gap-1.5 items-center">
      {[0, 0.15, 0.3].map((delay, i) => (
        <div 
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{ 
            animationDelay: `${delay}s`, 
            backgroundColor: '#888',
            boxShadow: '1px 1px 1px rgba(255, 255, 255, 0.9), -0.5px -0.5px 0.5px rgba(0, 0, 0, 0.15)',
          }}
        />
      ))}
    </div>
  </div>
));
LoadingIndicator.displayName = 'LoadingIndicator';
