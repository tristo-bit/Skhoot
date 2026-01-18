/**
 * Tool Call Dropdown Component
 * 
 * Displays a dropdown menu of available tool calls when user types "/" at the start of input.
 * Allows users to select and trigger tool calls directly without AI interpretation.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Terminal, 
  FileText, 
  FolderOpen, 
  Search, 
  Globe,
  Bot,
  Users,
  Plus,
  Command,
  Eye,
  List,
  ChevronRight
} from 'lucide-react';

// Tool definitions - matches AGENT_TOOLS from agentChatService.ts
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  category?: string;
}

// Icon mapping for tool calls
const TOOL_ICONS: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  create_terminal: Terminal,
  execute_command: Terminal,
  read_output: Terminal,
  list_terminals: List,
  inspect_terminal: Eye,
  shell: Command,
  read_file: FileText,
  write_file: FileText,
  list_directory: FolderOpen,
  search_files: Search,
  web_search: Globe,
  invoke_agent: Bot,
  list_agents: Users,
  create_agent: Plus,
};

// Tool categories for organization
const TOOL_CATEGORIES = {
  terminal: ['create_terminal', 'execute_command', 'read_output', 'list_terminals', 'inspect_terminal', 'shell'],
  files: ['read_file', 'write_file', 'list_directory', 'search_files'],
  web: ['web_search'],
  agents: ['invoke_agent', 'list_agents', 'create_agent'],
};

export interface ToolCallDropdownProps {
  searchQuery: string;
  onSelectTool: (tool: ToolDefinition) => void;
  onClose: () => void;
  tools: ToolDefinition[];
  position?: { top: number; left: number };
}

export const ToolCallDropdown: React.FC<ToolCallDropdownProps> = ({
  searchQuery,
  onSelectTool,
  onClose,
  tools,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return tools;
    
    return tools.filter(tool => 
      tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query)
    );
  }, [tools, searchQuery]);

  // Group tools by category
  const groupedTools = useMemo(() => {
    const groups: Record<string, ToolDefinition[]> = {
      terminal: [],
      files: [],
      web: [],
      agents: [],
      other: [],
    };

    filteredTools.forEach(tool => {
      let added = false;
      for (const [category, toolNames] of Object.entries(TOOL_CATEGORIES)) {
        if (toolNames.includes(tool.name)) {
          groups[category].push(tool);
          added = true;
          break;
        }
      }
      if (!added) {
        groups.other.push(tool);
      }
    });

    // Remove empty categories
    return Object.entries(groups).filter(([_, tools]) => tools.length > 0);
  }, [filteredTools]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => Math.min(prev + 1, filteredTools.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (filteredTools[selectedIndex]) {
          onSelectTool(filteredTools[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [filteredTools, selectedIndex, onSelectTool, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredTools.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute bottom-full mb-2 w-full max-w-2xl glass-elevated border border-glass-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={position}
      >
        <div className="p-4 text-center">
          <p className="text-sm text-text-secondary font-medium">
            No tools found matching "{searchQuery}"
          </p>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'terminal': return <Terminal size={14} />;
      case 'files': return <FileText size={14} />;
      case 'web': return <Globe size={14} />;
      case 'agents': return <Bot size={14} />;
      default: return <Command size={14} />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  let globalIndex = 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full mb-2 w-full max-w-2xl glass-elevated border border-glass-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={position}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-glass-border bg-black/5 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Command size={16} className="text-accent" />
          <h3 className="text-sm font-bold text-text-primary font-jakarta">
            Tool Calls
          </h3>
        </div>
        <p className="text-xs text-text-secondary mt-1 font-medium">
          Select a tool to trigger directly • Use ↑↓ to navigate • Enter or Tab to select
        </p>
      </div>

      {/* Tool List */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {groupedTools.map(([category, categoryTools]) => (
          <div key={category}>
            {/* Category Header */}
            <div className="px-4 py-2 bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">
                  {getCategoryIcon(category)}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  {getCategoryLabel(category)}
                </span>
              </div>
            </div>

            {/* Tools in Category */}
            {categoryTools.map((tool) => {
              const currentIndex = globalIndex++;
              const isSelected = currentIndex === selectedIndex;
              const Icon = TOOL_ICONS[tool.name] || Command;

              return (
                <button
                  key={tool.name}
                  ref={el => itemRefs.current[currentIndex] = el}
                  onClick={() => onSelectTool(tool)}
                  className={`w-full px-4 py-3 flex items-start gap-3 transition-all ${
                    isSelected
                      ? 'bg-accent/10 border-l-2 border-accent'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-accent/20 text-accent' : 'glass-subtle text-text-secondary'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary font-mono">
                        {tool.name}
                      </span>
                      {tool.parameters.required.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                          {tool.parameters.required.length} required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2 font-medium">
                      {tool.description}
                    </p>
                  </div>
                  {isSelected && (
                    <ChevronRight size={16} className="text-accent flex-shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
