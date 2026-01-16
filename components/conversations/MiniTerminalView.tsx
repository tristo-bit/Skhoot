/**
 * MiniTerminalView Component
 * 
 * Displays a compact terminal view in the chat when AI executes commands.
 * Shows the last few lines of terminal output with ability to expand to full terminal.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Maximize2 } from 'lucide-react';
import { terminalService } from '../../services/terminalService';

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

  // Listen for terminal output
  useEffect(() => {
    const handleTerminalData = (event: CustomEvent) => {
      const { sessionId: eventSessionId, data } = event.detail;
      
      if (eventSessionId === sessionId) {
        setOutput(prev => {
          const newOutput = [...prev, data];
          // Keep only the last maxLines * 2 to avoid memory issues
          return newOutput.slice(-maxLines * 2);
        });
      }
    };

    window.addEventListener('terminal-data', handleTerminalData as EventListener);
    
    return () => {
      window.removeEventListener('terminal-data', handleTerminalData as EventListener);
    };
  }, [sessionId, maxLines]);

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
        borderColor: 'rgba(139, 92, 246, 0.2)',
        background: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: 'rgba(139, 92, 246, 0.2)',
          background: 'rgba(139, 92, 246, 0.1)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-purple-400" />
          <span className="text-xs font-medium text-purple-300">Terminal Output</span>
          {command && (
            <span className="text-xs text-text-secondary font-mono">
              $ {command}
            </span>
          )}
        </div>
        <button
          onClick={handleExpandToTerminal}
          className="p-1 rounded hover:bg-purple-500/20 transition-colors"
          title="Open in Terminal Panel"
        >
          <Maximize2 size={14} className="text-purple-400" />
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
          scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent',
        }}
      >
        {displayOutput.length === 0 ? (
          <div className="text-text-secondary italic">
            Waiting for output...
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
          className="px-3 py-1 text-xs text-center border-t cursor-pointer hover:bg-purple-500/10 transition-colors"
          style={{
            borderColor: 'rgba(139, 92, 246, 0.2)',
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
