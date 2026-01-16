/**
 * MiniTerminalView Component
 * 
 * Displays a compact terminal view in the chat when AI executes commands.
 * Mirrors the output from TerminalView's AI terminal via the shared aiTerminalOutputStore.
 * This ensures both views show the same data without timing issues.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Maximize2 } from 'lucide-react';
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

  const handleExpandToTerminal = () => {
    // Dispatch event to open terminal panel and focus this session
    window.dispatchEvent(new CustomEvent('focus-terminal-session', {
      detail: { sessionId }
    }));
  };

  // Get the last N lines
  const displayOutput = output.slice(-maxLines);

  return (
    <div 
      className="mt-2 rounded-lg overflow-hidden border"
      style={{
        borderColor: 'rgba(6, 182, 212, 0.3)',
        background: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: 'rgba(6, 182, 212, 0.2)',
          background: 'rgba(6, 182, 212, 0.1)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          <span className="text-xs font-medium text-cyan-300">AI Terminal</span>
          {command && (
            <code className="text-xs text-cyan-400/70 font-mono truncate max-w-[200px]">
              $ {command}
            </code>
          )}
        </div>
        <button
          onClick={handleExpandToTerminal}
          className="p-1 rounded hover:bg-cyan-500/20 transition-colors"
          title="Open in Terminal Panel"
        >
          <Maximize2 size={14} className="text-cyan-400" />
        </button>
      </div>

      {/* Output */}
      <div
        ref={terminalRef}
        className="p-3 font-mono text-xs overflow-y-auto"
        style={{
          maxHeight: `${maxLines * 1.5}rem`,
          color: 'var(--text-primary)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(6, 182, 212, 0.3) transparent',
        }}
      >
        {displayOutput.length === 0 ? (
          <div className="text-cyan-400/50 italic">
            <span className="text-cyan-500">&gt;</span> Executing command...
          </div>
        ) : (
          displayOutput.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap break-words leading-relaxed">
              {line}
            </div>
          ))
        )}
      </div>

      {output.length > maxLines && (
        <div 
          className="px-3 py-1 text-xs text-center border-t cursor-pointer hover:bg-cyan-500/10 transition-colors"
          style={{
            borderColor: 'rgba(6, 182, 212, 0.2)',
            color: 'var(--text-secondary)',
          }}
          onClick={handleExpandToTerminal}
        >
          +{output.length - maxLines} more lines • Click to expand
        </div>
      )}
    </div>
  );
};
