/**
 * Tool Call Input Component
 * 
 * Displays a selected tool call in the chat with parameter inputs.
 * Allows users to fill in required and optional parameters before execution.
 */

import React, { useState, useEffect } from 'react';
import { X, Play, AlertCircle } from 'lucide-react';
import { Button } from '../buttonFormat';
import type { ToolDefinition } from './ToolCallDropdown';

export interface ToolCallInputProps {
  tool: ToolDefinition;
  onExecute: (toolName: string, parameters: Record<string, any>) => void;
  onCancel: () => void;
}

export const ToolCallInput: React.FC<ToolCallInputProps> = ({
  tool,
  onExecute,
  onCancel,
}) => {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize parameters with default values
  useEffect(() => {
    const initialParams: Record<string, any> = {};
    Object.entries(tool.parameters.properties).forEach(([key, prop]: [string, any]) => {
      if (prop.default !== undefined) {
        initialParams[key] = prop.default;
      }
    });
    setParameters(initialParams);
  }, [tool]);

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({ ...prev, [paramName]: value }));
    // Clear error when user starts typing
    if (errors[paramName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[paramName];
        return newErrors;
      });
    }
  };

  const validateParameters = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Check required parameters
    tool.parameters.required.forEach(paramName => {
      if (!parameters[paramName] || parameters[paramName] === '') {
        newErrors[paramName] = 'This parameter is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExecute = () => {
    if (validateParameters()) {
      onExecute(tool.name, parameters);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleExecute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  const getInputType = (propType: string): string => {
    switch (propType) {
      case 'number': return 'number';
      case 'boolean': return 'checkbox';
      default: return 'text';
    }
  };

  const renderParameterInput = (paramName: string, prop: any) => {
    const isRequired = tool.parameters.required.includes(paramName);
    const hasError = !!errors[paramName];

    const inputBaseStyle = {
      width: '100%',
      padding: 'clamp(0.375rem, 0.5vmax, 0.75rem) clamp(0.5rem, 0.6vmax, 1rem)',
      borderRadius: 'clamp(0.375rem, 0.5vmax, 0.625rem)',
      fontSize: 'clamp(0.75rem, 0.85vmax, 0.95rem)',
    };

    if (prop.type === 'boolean') {
      return (
        <label 
          className="flex items-center cursor-pointer"
          style={{ gap: 'clamp(0.375rem, 0.5vmax, 0.625rem)' }}
        >
          <input
            type="checkbox"
            checked={parameters[paramName] || false}
            onChange={(e) => handleParameterChange(paramName, e.target.checked)}
            className="rounded border-glass-border text-accent focus:ring-accent focus:ring-offset-0"
            style={{
              width: 'clamp(14px, 1vmax, 18px)',
              height: 'clamp(14px, 1vmax, 18px)',
            }}
          />
          <span 
            className="text-text-secondary font-medium"
            style={{ fontSize: 'clamp(0.75rem, 0.85vmax, 0.95rem)' }}
          >
            {prop.description || paramName}
          </span>
        </label>
      );
    }

    if (prop.enum && Array.isArray(prop.enum)) {
      return (
        <select
          value={parameters[paramName] || ''}
          onChange={(e) => handleParameterChange(paramName, e.target.value)}
          onKeyDown={handleKeyDown}
          className={`border ${
            hasError ? 'border-red-500' : 'border-glass-border'
          } bg-black/5 dark:bg-white/5 text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent`}
          style={inputBaseStyle}
        >
          <option value="">Select {paramName}</option>
          {prop.enum.map((value: string) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      );
    }

    if (prop.type === 'array') {
      return (
        <textarea
          value={parameters[paramName] || ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleParameterChange(paramName, parsed);
            } catch {
              handleParameterChange(paramName, e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Enter JSON array, e.g., ["item1", "item2"]`}
          className={`border ${
            hasError ? 'border-red-500' : 'border-glass-border'
          } bg-black/5 dark:bg-white/5 text-text-primary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent`}
          style={inputBaseStyle}
          rows={2}
        />
      );
    }

    if (prop.type === 'object') {
      return (
        <textarea
          value={parameters[paramName] ? JSON.stringify(parameters[paramName], null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleParameterChange(paramName, parsed);
            } catch {
              handleParameterChange(paramName, e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Enter JSON object, e.g., {"key": "value"}`}
          className={`border ${
            hasError ? 'border-red-500' : 'border-glass-border'
          } bg-black/5 dark:bg-white/5 text-text-primary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent`}
          style={inputBaseStyle}
          rows={3}
        />
      );
    }

    // Default: text or number input
    return (
      <input
        type={getInputType(prop.type)}
        value={parameters[paramName] || ''}
        onChange={(e) => handleParameterChange(paramName, prop.type === 'number' ? Number(e.target.value) : e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={prop.description || `Enter ${paramName}`}
        className={`border ${
          hasError ? 'border-red-500' : 'border-glass-border'
        } bg-black/5 dark:bg-white/5 text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent`}
        style={inputBaseStyle}
      />
    );
  };

  return (
    <div 
      className="my-3 rounded-2xl border-2 border-accent/30 glass-elevated animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{
        padding: 'clamp(0.75rem, 0.8vmax, 1.25rem)',
        borderRadius: 'clamp(1rem, 1.2vmax, 1.5rem)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-start justify-between"
        style={{ marginBottom: 'clamp(0.75rem, 0.8vmax, 1.25rem)' }}
      >
        <div className="flex-1">
          <div className="flex items-center" style={{ gap: 'clamp(0.375rem, 0.4vmax, 0.625rem)' }}>
            <span 
              className="font-bold text-accent font-mono"
              style={{ fontSize: 'clamp(0.75rem, 0.9vmax, 1rem)' }}
            >
              /{tool.name}
            </span>
            <span 
              className="rounded-full bg-accent/20 text-accent font-bold"
              style={{
                fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)',
                padding: 'clamp(0.125rem, 0.15vmax, 0.25rem) clamp(0.375rem, 0.5vmax, 0.625rem)',
              }}
            >
              Direct Tool Call
            </span>
          </div>
          <p 
            className="text-text-secondary font-medium"
            style={{
              fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)',
              marginTop: 'clamp(0.25rem, 0.3vmax, 0.5rem)',
            }}
          >
            {tool.description}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
          style={{
            padding: 'clamp(0.25rem, 0.3vmax, 0.5rem)',
            borderRadius: 'clamp(0.375rem, 0.5vmax, 0.625rem)',
          }}
        >
          <X style={{ width: 'clamp(14px, 1vmax, 20px)', height: 'clamp(14px, 1vmax, 20px)' }} />
        </button>
      </div>

      {/* Parameters */}
      {Object.keys(tool.parameters.properties).length > 0 ? (
        <div 
          className="space-y-3"
          style={{ 
            marginBottom: 'clamp(0.75rem, 0.8vmax, 1.25rem)',
            gap: 'clamp(0.5rem, 0.6vmax, 1rem)',
          }}
        >
          {Object.entries(tool.parameters.properties).map(([paramName, prop]: [string, any]) => {
            const isRequired = tool.parameters.required.includes(paramName);
            const hasError = !!errors[paramName];

            return (
              <div 
                key={paramName} 
                style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(0.25rem, 0.3vmax, 0.5rem)',
                }}
              >
                <label 
                  className="flex items-center font-bold text-text-primary font-mono"
                  style={{ 
                    fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)',
                    gap: 'clamp(0.375rem, 0.4vmax, 0.625rem)',
                  }}
                >
                  <span>{paramName}</span>
                  {isRequired && (
                    <span className="text-red-500">*</span>
                  )}
                  {!isRequired && (
                    <span className="text-text-secondary font-normal">(optional)</span>
                  )}
                </label>
                {prop.description && prop.type !== 'boolean' && (
                  <p 
                    className="text-text-secondary font-medium"
                    style={{ fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)' }}
                  >
                    {prop.description}
                  </p>
                )}
                {renderParameterInput(paramName, prop)}
                {hasError && (
                  <div 
                    className="flex items-center text-red-500 font-medium"
                    style={{ 
                      fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)',
                      gap: 'clamp(0.25rem, 0.3vmax, 0.375rem)',
                    }}
                  >
                    <AlertCircle style={{ width: 'clamp(10px, 0.8vmax, 14px)', height: 'clamp(10px, 0.8vmax, 14px)' }} />
                    {errors[paramName]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div 
          className="rounded-lg bg-emerald-500/10 border border-emerald-500/20"
          style={{
            marginBottom: 'clamp(0.75rem, 0.8vmax, 1.25rem)',
            padding: 'clamp(0.5rem, 0.6vmax, 1rem)',
            borderRadius: 'clamp(0.375rem, 0.5vmax, 0.625rem)',
          }}
        >
          <p 
            className="text-emerald-600 dark:text-emerald-400 font-medium"
            style={{ fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)' }}
          >
            ✓ This tool requires no parameters
          </p>
        </div>
      )}

      {/* Actions */}
      <div 
        className="flex items-center justify-between border-t border-glass-border"
        style={{ 
          paddingTop: 'clamp(0.5rem, 0.6vmax, 1rem)',
          gap: 'clamp(0.5rem, 0.6vmax, 1rem)',
        }}
      >
        <p 
          className="text-text-secondary font-medium"
          style={{ fontSize: 'clamp(0.625rem, 0.75vmax, 0.875rem)' }}
        >
          Press Enter to execute • Shift+Enter for new line • Esc to cancel
        </p>
        <div 
          className="flex items-center"
          style={{ gap: 'clamp(0.375rem, 0.5vmax, 0.625rem)' }}
        >
          <Button
            onClick={onCancel}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            variant="primary"
            size="sm"
            className="flex items-center"
            style={{ gap: 'clamp(0.25rem, 0.35vmax, 0.5rem)' }}
          >
            <Play style={{ width: 'clamp(12px, 0.9vmax, 16px)', height: 'clamp(12px, 0.9vmax, 16px)' }} />
            Execute Tool
          </Button>
        </div>
      </div>
    </div>
  );
};
