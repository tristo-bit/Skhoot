import { memo, useRef, useEffect } from 'react';
import { FileText, MessageSquare, Search, Trash2 } from 'lucide-react';
import { AnimationSearchDiscovery } from '../tool-calls/AnimationSearchDiscovery';
import { AnimationFileOperations } from '../tool-calls/AnimationFileOperations';
import { AnimationCommandExecution } from '../tool-calls/AnimationCommandExecution';
import { AnimationWebAccess } from '../tool-calls/AnimationWebAccess';
import { AnimationAgentOperations } from '../tool-calls/AnimationAgentOperations';

export interface SearchingIndicatorProps {
  type: 'files' | 'messages' | 'disk' | 'cleanup' | null;
  status?: string;
  toolName?: string; // NEW: Actual tool being executed
}

export const SearchingIndicator = memo<SearchingIndicatorProps>(({ type, status, toolName }) => {
  // Sticky animation: mémorise la dernière animation de tool pour éviter le switch de retour
  const lastToolAnimationRef = useRef<{ component: JSX.Element; category: string } | null>(null);
  
  // Reset la sticky animation quand le composant est démonté (fin du loading)
  useEffect(() => {
    return () => {
      lastToolAnimationRef.current = null;
    };
  }, []);
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

  // Determine which animation to use - SIMPLIFIED with STICKY behavior
  const getAnimation = () => {
    // Si on a un tool name, déterminer et MÉMORISER l'animation spécifique
    if (toolName) {
      let toolAnimation: { component: JSX.Element; category: string } | null = null;
      
      // File Operations (read/write)
      if (['read_file', 'write_file', 'fsWrite', 'fsAppend', 'strReplace', 'deleteFile'].includes(toolName)) {
        toolAnimation = { component: <AnimationFileOperations isProcessing={true} />, category: 'file' };
      }
      // Search & Discovery (list/search)
      else if (['list_directory', 'search_files', 'fileSearch', 'grepSearch', 'message_search'].includes(toolName)) {
        toolAnimation = { component: <AnimationSearchDiscovery isProcessing={true} />, category: 'search' };
      }
      // Command Execution (shell/terminal)
      else if (['shell', 'execute_command', 'create_terminal', 'read_output', 'list_terminals', 'inspect_terminal', 'executeBash', 'controlBashProcess'].includes(toolName)) {
        toolAnimation = { component: <AnimationCommandExecution isProcessing={true} />, category: 'command' };
      }
      // Web Access
      else if (['web_search', 'remote_web_search', 'webFetch', 'browse'].includes(toolName)) {
        toolAnimation = { component: <AnimationWebAccess isProcessing={true} />, category: 'web' };
      }
      // Agent Operations
      else if (['invoke_agent', 'list_agents', 'create_agent'].includes(toolName)) {
        toolAnimation = { component: <AnimationAgentOperations isProcessing={true} />, category: 'agent' };
      }
      
      // Mémoriser cette animation pour la garder même après onToolComplete
      if (toolAnimation) {
        lastToolAnimationRef.current = toolAnimation;
        return toolAnimation;
      }
    }
    
    // Si pas de toolName MAIS on a une animation mémorisée, la garder (sticky behavior)
    // Cela évite le switch de retour vers le violet après onToolComplete
    if (lastToolAnimationRef.current) {
      return lastToolAnimationRef.current;
    }
    
    // Sinon (phase de connexion initiale), toujours violet
    return { component: <AnimationSearchDiscovery isProcessing={true} />, category: 'connecting' };
  };

  const animation = getAnimation();

  // Use Framer Motion animations when available
  if (animation) {
    // Determine display text based on status or type
    let displayText = type ? labels[type] : 'Processing...';
    
    // If status contains "Connecting", show that as the main text
    if (status && status.toLowerCase().includes('connecting')) {
      displayText = status;
    } else if (status && status.toLowerCase().includes('executing')) {
      // Show the executing status as main text
      displayText = status;
    }
    
    return (
      <div className="flex flex-col items-start gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-subtle border-glass-border">
          {/* Framer Motion Animation */}
          <div className="w-16 h-16 flex items-center justify-center">
            {animation.component}
          </div>
          <div>
            <p className="text-[12px] font-bold font-jakarta text-text-primary">
              {displayText}
            </p>
            {/* Show secondary status only if it's different from main text */}
            {status && !status.toLowerCase().includes('connecting') && !status.toLowerCase().includes('executing') && (
              <p className="text-[10px] italic text-text-secondary font-jakarta mt-1">
                {status}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for disk and cleanup (keep original animation)
  return (
    <div className="flex flex-col items-start gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-subtle border-glass-border">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center glass-subtle">
          <span className="text-accent animate-pulse">{type && icons[type]}</span>
        </div>
        <div>
          <p className="text-[12px] font-bold font-jakarta text-text-primary">
            {type ? labels[type] : 'Processing...'}
          </p>
        </div>
      </div>
      {status && (
        <p className="text-[10px] italic text-text-secondary font-jakarta pl-1 animate-in fade-in duration-200">
          {status}
        </p>
      )}
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
