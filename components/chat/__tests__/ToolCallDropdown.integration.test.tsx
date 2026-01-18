/**
 * Integration Tests for Tool Call Dropdown Feature
 * Tests the complete flow from dropdown to execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToolCallDropdown } from '../ToolCallDropdown';
import { ToolCallInput } from '../ToolCallInput';
import type { ToolDefinition } from '../ToolCallDropdown';

describe('Tool Call Dropdown - Integration Tests', () => {
  const mockTools: ToolDefinition[] = [
    {
      name: 'shell',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          workdir: { type: 'string', description: 'Working directory' },
        },
        required: ['command'],
      },
    },
    {
      name: 'list_directory',
      description: 'List directory contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
          depth: { type: 'number', description: 'Max depth' },
        },
        required: ['path'],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('complete flow: search -> select -> fill parameters -> execute', async () => {
    const mockOnExecute = vi.fn();
    let selectedTool: ToolDefinition | null = null;

    // Step 1: Render dropdown
    const { rerender } = render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={(tool) => { selectedTool = tool; }}
        onClose={() => {}}
        tools={mockTools}
      />
    );

    // Step 2: Search for "shell"
    rerender(
      <ToolCallDropdown
        searchQuery="shell"
        onSelectTool={(tool) => { selectedTool = tool; }}
        onClose={() => {}}
        tools={mockTools}
      />
    );

    expect(screen.getByText('shell')).toBeInTheDocument();
    expect(screen.queryByText('list_directory')).not.toBeInTheDocument();

    // Step 3: Select shell tool
    const shellButton = screen.getByText('shell').closest('button');
    fireEvent.click(shellButton!);

    expect(selectedTool).toEqual(mockTools[0]);

    // Step 4: Render ToolCallInput with selected tool
    const { container } = render(
      <ToolCallInput
        tool={selectedTool!}
        onExecute={mockOnExecute}
        onCancel={() => {}}
      />
    );

    // Step 5: Fill in required parameter
    const commandInput = screen.getByPlaceholderText('Command to execute');
    fireEvent.change(commandInput, { target: { value: 'ls -la' } });

    // Step 6: Execute tool
    const executeButton = screen.getByText('Execute Tool');
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockOnExecute).toHaveBeenCalledWith('shell', {
        command: 'ls -la',
      });
    });
  });

  it('validates required parameters before execution', async () => {
    const mockOnExecute = vi.fn();

    const tool = mockTools[0]; // shell tool with required 'command'

    render(
      <ToolCallInput
        tool={tool}
        onExecute={mockOnExecute}
        onCancel={() => {}}
      />
    );

    // Try to execute without filling required field
    const executeButton = screen.getByText('Execute Tool');
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(screen.getByText('This parameter is required')).toBeInTheDocument();
    });

    expect(mockOnExecute).not.toHaveBeenCalled();

    // Fill required field
    const commandInput = screen.getByPlaceholderText('Command to execute');
    fireEvent.change(commandInput, { target: { value: 'ls' } });

    // Error should clear
    await waitFor(() => {
      expect(screen.queryByText('This parameter is required')).not.toBeInTheDocument();
    });

    // Now execute should work
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockOnExecute).toHaveBeenCalledWith('shell', { command: 'ls' });
    });
  });

  it('handles optional parameters correctly', async () => {
    const mockOnExecute = vi.fn();

    const tool = mockTools[0]; // shell tool with optional 'workdir'

    render(
      <ToolCallInput
        tool={tool}
        onExecute={mockOnExecute}
        onCancel={() => {}}
      />
    );

    // Fill only required parameter
    const commandInput = screen.getByPlaceholderText('Command to execute');
    fireEvent.change(commandInput, { target: { value: 'ls' } });

    // Execute without optional parameter
    const executeButton = screen.getByText('Execute Tool');
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockOnExecute).toHaveBeenCalledWith('shell', { command: 'ls' });
    });

    mockOnExecute.mockClear();

    // Now fill optional parameter
    const workdirInput = screen.getByPlaceholderText('Working directory');
    fireEvent.change(workdirInput, { target: { value: '/home' } });

    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockOnExecute).toHaveBeenCalledWith('shell', {
        command: 'ls',
        workdir: '/home',
      });
    });
  });
});
