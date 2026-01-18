/**
 * Tool Icon Component
 * 
 * Returns the appropriate icon for a given tool name.
 * Used as a fallback when plugin doesn't provide an icon.
 */

import React from 'react';
import { 
  Terminal, 
  FileText, 
  FolderOpen, 
  Search, 
  Bot,
  Globe,
  Users,
  Workflow
} from 'lucide-react';

export interface ToolIconProps {
  toolName: string;
  size?: number;
  className?: string;
}

export const ToolIcon: React.FC<ToolIconProps> = ({ toolName, size = 16, className = '' }) => {
  const icons: Record<string, React.ReactNode> = {
    shell: <Terminal size={size} className={className} />,
    execute_command: <Terminal size={size} className={className} />,
    create_terminal: <Terminal size={size} className={className} />,
    read_output: <Terminal size={size} className={className} />,
    list_terminals: <Terminal size={size} className={className} />,
    inspect_terminal: <Terminal size={size} className={className} />,
    read_file: <FileText size={size} className={className} />,
    write_file: <FileText size={size} className={className} />,
    list_directory: <FolderOpen size={size} className={className} />,
    search_files: <Search size={size} className={className} />,
    web_search: <Globe size={size} className={className} />,
    invoke_agent: <Bot size={size} className={className} />,
    list_agents: <Users size={size} className={className} />,
    create_agent: <Workflow size={size} className={className} />,
  };
  
  return <>{icons[toolName] || <Bot size={size} className={className} />}</>;
};
