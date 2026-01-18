/**
 * Tests for ToolCallInput Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToolCallInput } from '../ToolCallInput';
import type { ToolDefinition } from '../ToolCallDropdown';

describe('ToolCallInput', () => {
  const mockOnExecute = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders tool name and description', () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute a shell command',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('/shell')).toBeInTheDocument();
      expect(screen.getByText('Execute a shell command')).toBeInTheDocument();
      expect(screen.getByText('Direct Tool Call')).toBeInTheDocument();
    });

    it('shows message when no parameters required', () => {
      const tool: ToolDefinition = {
        name: 'list_terminals',
        description: 'List all terminals',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/This tool requires no parameters/)).toBeInTheDocument();
    });
  });

  describe('Parameter Inputs', () => {
    it('renders text input for string parameter', () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
          },
          required: ['command'],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('command')).toBeInTheDocument();
      expect(screen.getByText('Command to execute')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Command to execute')).toBeInTheDocument();
    });

    it('renders number input for number parameter', () => {
      const tool: ToolDefinition = {
        name: 'list_directory',
        description: 'List directory',
        parameters: {
          type: 'object',
          properties: {
            depth: { type: 'number', description: 'Maximum depth' },
          },
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByPlaceholderText('Maximum depth') as HTMLInputElement;
      expect(input.type).toBe('number');
    });

    it('renders checkbox for boolean parameter', () => {
      const tool: ToolDefinition = {
        name: 'list_directory',
        description: 'List directory',
        parameters: {
          type: 'object',
          properties: {
            include_hidden: { type: 'boolean', description: 'Include hidden files' },
          },
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText('Include hidden files')).toBeInTheDocument();
    });

    it('renders select for enum parameter', () => {
      const tool: ToolDefinition = {
        name: 'web_search',
        description: 'Search the web',
        parameters: {
          type: 'object',
          properties: {
            search_type: {
              type: 'string',
              description: 'Type of search',
              enum: ['general', 'news', 'docs'],
            },
          },
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      
      // Check options
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4); // Empty + 3 enum values
      expect(screen.getByText('general')).toBeInTheDocument();
      expect(screen.getByText('news')).toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    it('marks required parameters with asterisk', () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            workdir: { type: 'string', description: 'Working directory' },
          },
          required: ['command'],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const commandLabel = screen.getByText('command').parentElement;
      expect(commandLabel).toHaveTextContent('*');

      const workdirLabel = screen.getByText('workdir').parentElement;
      expect(workdirLabel).toHaveTextContent('(optional)');
    });
  });

  describe('Validation', () => {
    it('validates required parameters on execute', async () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
          },
          required: ['command'],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const executeButton = screen.getByText('Execute Tool');
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('This parameter is required')).toBeInTheDocument();
      });

      expect(mockOnExecute).not.toHaveBeenCalled();
    });

    it('clears validation error when user starts typing', async () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
          },
          required: ['command'],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      // Trigger validation error
      const executeButton = screen.getByText('Execute Tool');
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText('This parameter is required')).toBeInTheDocument();
      });

      // Start typing
      const input = screen.getByPlaceholderText('Command to execute');
      fireEvent.change(input, { target: { value: 'ls' } });

      await waitFor(() => {
        expect(screen.queryByText('This parameter is required')).not.toBeInTheDocument();
      });
    });

    it('executes tool when all required parameters are filled', async () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
          },
          required: ['command'],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByPlaceholderText('Command to execute');
      fireEvent.change(input, { target: { value: 'ls -la' } });

      const executeButton = screen.getByText('Execute Tool');
      fireEvent.click(executeButton);

      await waitFor(() => {
        expect(mockOnExecute).toHaveBeenCalledWith('shell', { command: 'ls -la' });
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when X button is clicked', () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg')); // X icon button
      fireEvent.click(xButton!);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('executes tool on Cmd+Enter', async () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
          },
          required: ['command'],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByPlaceholderText('Command to execute');
      fireEvent.change(input, { target: { value: 'ls' } });
      fireEvent.keyDown(input, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockOnExecute).toHaveBeenCalledWith('shell', { command: 'ls' });
      });
    });

    it('executes tool on Ctrl+Enter', async () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
          },
          required: ['command'],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByPlaceholderText('Command to execute');
      fireEvent.change(input, { target: { value: 'ls' } });
      fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnExecute).toHaveBeenCalledWith('shell', { command: 'ls' });
      });
    });

    it('cancels on Escape key', () => {
      const tool: ToolDefinition = {
        name: 'shell',
        description: 'Execute shell command',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
          },
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByPlaceholderText('Command to execute');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Complex Parameter Types', () => {
    it('handles array parameters', () => {
      const tool: ToolDefinition = {
        name: 'list_agents',
        description: 'List agents',
        parameters: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
          },
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByPlaceholderText(/Enter JSON array/);
      expect(textarea).toBeInTheDocument();
    });

    it('handles object parameters', () => {
      const tool: ToolDefinition = {
        name: 'invoke_agent',
        description: 'Invoke agent',
        parameters: {
          type: 'object',
          properties: {
            context: {
              type: 'object',
              description: 'Additional context',
            },
          },
          required: [],
        },
      };

      render(
        <ToolCallInput
          tool={tool}
          onExecute={mockOnExecute}
          onCancel={mockOnCancel}
        />
      );

      const textarea = screen.getByPlaceholderText(/Enter JSON object/);
      expect(textarea).toBeInTheDocument();
    });
  });
});
