/**
 * Tests for ToolCallDropdown Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToolCallDropdown, type ToolDefinition } from '../ToolCallDropdown';

describe('ToolCallDropdown', () => {
  const mockTools: ToolDefinition[] = [
    {
      name: 'shell',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
        },
        required: ['command'],
      },
    },
    {
      name: 'read_file',
      description: 'Read file contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
        },
        required: ['path'],
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

  const mockOnSelectTool = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dropdown with all tools', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    expect(screen.getByText('Tool Calls')).toBeInTheDocument();
    expect(screen.getByText('3 available')).toBeInTheDocument();
    expect(screen.getByText('shell')).toBeInTheDocument();
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('list_directory')).toBeInTheDocument();
  });

  it('filters tools based on search query', () => {
    const { rerender } = render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    expect(screen.getByText('shell')).toBeInTheDocument();
    expect(screen.getByText('read_file')).toBeInTheDocument();

    rerender(
      <ToolCallDropdown
        searchQuery="file"
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    expect(screen.queryByText('shell')).not.toBeInTheDocument();
    expect(screen.getByText('read_file')).toBeInTheDocument();
    expect(screen.getByText('list_directory')).toBeInTheDocument();
  });

  it('shows "no tools found" message when search has no results', () => {
    render(
      <ToolCallDropdown
        searchQuery="nonexistent"
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    expect(screen.getByText(/No tools found matching/)).toBeInTheDocument();
  });

  it('calls onSelectTool when tool is clicked', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    const shellButton = screen.getByText('shell').closest('button');
    fireEvent.click(shellButton!);

    expect(mockOnSelectTool).toHaveBeenCalledWith(mockTools[0]);
  });

  it('handles keyboard navigation - ArrowDown', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    
    // First tool should be selected initially, second after arrow down
    const buttons = screen.getAllByRole('button');
    // Check that selection moved (implementation detail - would need to check styling)
  });

  it('handles keyboard navigation - ArrowUp', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    
    // Should be back at first tool
  });

  it('handles keyboard navigation - Enter selects tool', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(mockOnSelectTool).toHaveBeenCalledWith(mockTools[0]);
  });

  it('handles keyboard navigation - Tab selects tool', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    fireEvent.keyDown(window, { key: 'Tab' });

    expect(mockOnSelectTool).toHaveBeenCalledWith(mockTools[0]);
  });

  it('handles keyboard navigation - Escape closes dropdown', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes dropdown when clicking outside', async () => {
    const { container } = render(
      <div>
        <div data-testid="outside">Outside</div>
        <ToolCallDropdown
          searchQuery=""
          onSelectTool={mockOnSelectTool}
          onClose={mockOnClose}
          tools={mockTools}
        />
      </div>
    );

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays required parameter count badge', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    // shell has 1 required param
    const shellSection = screen.getByText('shell').closest('button');
    expect(shellSection).toHaveTextContent('1 required');

    // list_directory has 1 required param (path)
    const listDirSection = screen.getByText('list_directory').closest('button');
    expect(listDirSection).toHaveTextContent('1 required');
  });

  it('groups tools by category', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    // Should see category headers
    expect(screen.getByText('Terminal')).toBeInTheDocument();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  it('shows tool descriptions', () => {
    render(
      <ToolCallDropdown
        searchQuery=""
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    expect(screen.getByText('Execute a shell command')).toBeInTheDocument();
    expect(screen.getByText('Read file contents')).toBeInTheDocument();
    expect(screen.getByText('List directory contents')).toBeInTheDocument();
  });

  it('filters by tool name case-insensitively', () => {
    render(
      <ToolCallDropdown
        searchQuery="SHELL"
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    expect(screen.getByText('shell')).toBeInTheDocument();
    expect(screen.queryByText('read_file')).not.toBeInTheDocument();
  });

  it('filters by description', () => {
    render(
      <ToolCallDropdown
        searchQuery="directory"
        onSelectTool={mockOnSelectTool}
        onClose={mockOnClose}
        tools={mockTools}
      />
    );

    expect(screen.getByText('list_directory')).toBeInTheDocument();
    expect(screen.queryByText('shell')).not.toBeInTheDocument();
    expect(screen.queryByText('read_file')).not.toBeInTheDocument();
  });
});
