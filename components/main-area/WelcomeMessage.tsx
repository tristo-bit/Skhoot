import { memo, useMemo } from 'react';
import { ACTION_PROMPTS, ACTION_ACTIVE_COLORS } from '../../src/constants';
import { SplittingText } from '../ui';
import { LogoBackground } from './LogoBackground';

interface WelcomeMessageProps {
  welcomeMessage: string;
  isExiting?: boolean;
  activeMode?: string | null;
  promptKey?: number;
}

/**
 * Welcome message displayed in the empty state with typewriter animation
 * Shows action-specific prompts when a quick action mode is active
 */
export const WelcomeMessage = memo<WelcomeMessageProps>(({ 
  welcomeMessage, 
  isExiting = false, 
  activeMode, 
  promptKey = 0 
}) => {
  // Pick a random action-specific prompt when a mode is activated
  const actionPrompt = useMemo(() => {
    if (!activeMode || !(activeMode in ACTION_PROMPTS)) return '';
    const prompts = ACTION_PROMPTS[activeMode as keyof typeof ACTION_PROMPTS];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, [activeMode, promptKey]);
  
  // Determine which text to display and its color
  const displayText = activeMode && actionPrompt ? actionPrompt : welcomeMessage;
  const textColor = activeMode ? ACTION_ACTIVE_COLORS[activeMode as keyof typeof ACTION_ACTIVE_COLORS] : undefined;
  
  return (
    <div 
      className={`text-center max-w-[480px] transition-all duration-600 ease-out ${
        isExiting ? 'empty-state-exit' : 'animate-in fade-in zoom-in duration-700'
      }`}
      style={{
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(0.8) translateY(-30px)' : 'scale(1) translateY(0)',
        filter: isExiting ? 'blur(8px)' : 'blur(0px)',
        transition: 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1), transform 600ms cubic-bezier(0.4, 0, 0.2, 1), filter 400ms ease-out',
      }}
    >
      <LogoBackground isExiting={isExiting} />
      
      <h2 
        className="text-2xl font-bold tracking-tight font-jakarta" 
        style={{ 
          transform: isExiting ? 'translateY(20px)' : 'translateY(0)',
          opacity: isExiting ? 0 : 1,
          transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out, color 300ms ease-out',
          color: textColor || 'var(--text-primary)',
        }}
      >
        <SplittingText text={displayText} key={displayText} type="chars" />
      </h2>
    </div>
  );
});

WelcomeMessage.displayName = 'WelcomeMessage';
