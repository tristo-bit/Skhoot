/**
 * Test Utilities
 * Provides wrapper components and utilities for testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock ThemeContext
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Mock SettingsContext
const MockSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Combined wrapper for all providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MockThemeProvider>
      <MockSettingsProvider>
        {children}
      </MockSettingsProvider>
    </MockThemeProvider>
  );
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
