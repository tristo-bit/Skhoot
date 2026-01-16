/**
 * MiniTerminalView Component
 * 
 * Displays a compact terminal view in the chat when AI executes commands.
 * Mirrors the output from TerminalView's AI terminal via the shared aiTerminalOutputStore.
 * This ensures both views show the same data without timing issues.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { aiTerminalOutputStore } from '../terminal/TerminalView';

interface MiniTerminalViewProps {
  sessionId: string;
  command?: string;
  maxLines?: number;
}

export const MiniTerminalView: React.FC<MiniTerminalViewProps> = ({
  sessionId,
  command,
  maxLines = 5,
}) => {
  const [output, setOutput] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Subscribe to AI terminal output store
  useEffect(() => {
    if (!sessionId) {
      console.log('[MiniTerminalView] No sessionId provided');
      return;
    }
    
    console.log('[MiniTerminalView] Subscribing to AI terminal output for session:', sessionId);
    
    // Subscribe to the shared store - this will immediately receive current state
    const unsubscribe = aiTerminalOutputStore.subscribe((newOutput, storeSessionId) => {
      console.log('[MiniTerminalView] Received output update:', { 
        storeSessionId, 
        sessionId, 
        outputLength: newOutput.length 
      });
      
      // Only update if this is our session
      if (storeSessionId === sessionId) {
        setOutput(newOutput);
      }
    });
    
    // Also check if there's already output in the store for this session
    const existingOutput = aiTerminalOutputStore.getOutput(sessionId);
    if (existingOutput.length > 0) {
      console.log('[MiniTerminalView] Found existing output:', existingOutput.length, 'lines');
      setOutput(existingOutput);
    }
    
    return unsubscribe;
  }, [sessionId]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Get lines to display based on expanded state
  const displayOutput = isExpanded ? output : output.slice(-maxLines);
  const hasMoreLines = output.length > maxLines;

  return (
    <div 
      className="mt-2 rounded-lg overflow-hidden border border-glass-border bg-background-secondary dark:bg-background-tertiary"
    >
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-3 py-2 border-b border-glass-border bg-background-tertiary dark:bg-background-secondary"
      >
        <Terminal size={14} className="text-accent" />
        <span className="text-xs font-medium text-text-primary">AI Terminal</span>
        {command && (
          <code className="text-xs text-text-secondary font-mono truncate max-w-[200px]">
            $ {command}
          </code>
        )}
      </div>

      {/* Output */}
      <div
        ref={terminalRef}
        className="p-3 font-mono text-xs overflow-y-auto text-text-primary"
        style={{
          maxHeight: isExpanded ? '400px' : `${maxLines * 1.5}rem`,
          scrollbarWidth: 'thin',
        }}
      >
        {displayOutput.length === 0 ? (
          <div className="text-text-secondary italic">
            <span className="text-accent">&gt;</span> Executing command...
          </div>
        ) : (
          displayOutput.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap break-words leading-relaxed">
              {line}
            </div>
          ))
        )}
      </div>

      {/* Expand/Collapse footer */}
      {hasMoreLines && (
        <div 
          className="px-3 py-1.5 text-xs text-center border-t border-glass-border cursor-pointer hover:bg-accent/10 transition-colors text-text-secondary flex items-center justify-center gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>+{output.length - maxLines} more lines • Click to expand</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
