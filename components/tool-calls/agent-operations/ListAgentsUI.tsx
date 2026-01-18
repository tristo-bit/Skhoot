/**
 * List Agents UI Plugin
 * 
 * Displays available agents with their capabilities and status.
 */

import React, { memo, useState, useMemo } from 'react';
import { Copy, Check, Bot, Circle } from 'lucide-react';
import { ToolCallUIProps } from '../registry/types';

// ============================================================================
// Types
// ============================================================================

interface Agent {
  id: string;
  name: string;
  description: string;
  state: 'on' | 'off' | 'sleeping' | 'failing';
  tags?: string[];
}

// ============================================================================
// Component
// ============================================================================

const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const stateColors = {
    on: 'text-emerald-600 bg-emerald-500/20',
    off: 'text-gray-600 bg-gray-500/20',
    sleeping: 'text-amber-600 bg-amber-500/20',
    failing: 'text-red-600 bg-red-500/20',
  };

  return (
    <div className="p-3 rounded-lg glass-subtle hover:glass-elevated transition-all">
      <div className="flex items-start gap-2">
        <Bot size={16} className="text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-text-primary">{agent.name}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${stateColors[agent.state]}`}>
              <Circle size={6} fill="currentColor" />
              {agent.state}
            </span>
          </div>
          <p className="text-[10px] text-text-secondary mt-1">{agent.description}</p>
          {agent.tags && agent.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {agent.tags.map((tag, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ListAgentsUI = memo<ToolCallUIProps>(({ 
  toolCall,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  const agents = useMemo<Agent[]>(() => {
    if (!result?.output) return [];
    try {
      const parsed = JSON.parse(result.output);
      return parsed.agents || parsed.data || [];
    } catch {
      return [];
    }
  }, [result]);

  const handleCopy = async () => {
    const content = result?.output || '';
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return null;
  }

  return (
    <div className="mt-2">
      {/* Output header with actions */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {result.success ? 'Available Agents' : 'Error'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-accent/80 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Agents list */}
      {result.success && agents.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {agents.map((agent, i) => (
            <AgentCard key={agent.id || i} agent={agent} />
          ))}
        </div>
      ) : result.success ? (
        <div className="p-4 text-center text-text-secondary text-[11px] glass-subtle rounded-lg">
          No agents available
        </div>
      ) : (
        <pre className="text-[11px] font-mono p-3 rounded-xl border border-glass-border overflow-x-auto max-h-[250px] text-red-600 bg-red-500/10 border-red-500/20">
          {result.output || result.error || 'No output'}
        </pre>
      )}
    </div>
  );
});

ListAgentsUI.displayName = 'ListAgentsUI';
