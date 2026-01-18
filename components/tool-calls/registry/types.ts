/**
 * Tool Call Plugin System - Type Definitions
 * 
 * Defines the interfaces for the tool call plugin system.
 * Each tool can have its own UI component that implements these interfaces.
 */

import React from 'react';

// ============================================================================
// Core Types
// ============================================================================

export interface ToolCallResult {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

// ============================================================================
// Plugin Props
// ============================================================================

export interface ToolCallUIProps {
  toolCall: ToolCall;
  result?: ToolCallResult;
  isExecuting?: boolean;
  onCancel?: () => void;
  sessionId?: string;
  
  // Common callbacks
  onNavigate?: (path: string) => void;
  onAddToChat?: (fileName: string, filePath: string) => void;
}

// ============================================================================
// Plugin Definition
// ============================================================================

export type ToolCategory = 'file' | 'shell' | 'web' | 'agent' | 'other';
export type ToolLayout = 'compact' | 'expanded' | 'grid';

export interface ToolCallPlugin {
  // Metadata
  toolName: string;
  displayName: string;
  category: ToolCategory;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  
  // UI Component
  component: React.ComponentType<ToolCallUIProps>;
  
  // Optional: Custom result parser
  parseResult?: (output: string, args: Record<string, any>) => any;
  
  // Optional: Supports these layouts
  supportedLayouts?: ToolLayout[];
  
  // Optional: Description for documentation
  description?: string;
  
  // Optional: Custom loading component (replaces default spinner)
  loadingComponent?: React.ComponentType<ToolCallLoadingProps>;
  
  // Optional: Custom card wrapper (replaces ToolCallContainer)
  customWrapper?: React.ComponentType<ToolCallWrapperProps>;
  
  // Optional: Animation configuration
  animations?: {
    enter?: string;  // CSS animation class for card entrance
    exit?: string;   // CSS animation class for card exit
    loading?: string; // CSS animation class for loading state
  };
  
  // Optional: Custom styling
  styling?: {
    cardClassName?: string;      // Additional classes for card
    headerClassName?: string;    // Additional classes for header
    contentClassName?: string;   // Additional classes for content
  };
}

// Props for custom loading component
export interface ToolCallLoadingProps {
  toolCall: ToolCall;
  onCancel?: () => void;
}

// Props for custom wrapper component
export interface ToolCallWrapperProps {
  toolCall: ToolCall;
  result?: ToolCallResult;
  isExecuting?: boolean;
  onCancel?: () => void;
  children: React.ReactNode;
  plugin: ToolCallPlugin;
}

// ============================================================================
// Registry Interface
// ============================================================================

export interface IToolCallRegistry {
  register(plugin: ToolCallPlugin): void;
  get(toolName: string): ToolCallPlugin | undefined;
  getByCategory(category: ToolCategory): ToolCallPlugin[];
  getAll(): ToolCallPlugin[];
  has(toolName: string): boolean;
}
