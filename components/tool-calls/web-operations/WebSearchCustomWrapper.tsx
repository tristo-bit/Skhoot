/**
 * Web Search Custom Wrapper
 * 
 * Minimal wrapper that only displays the WebSearchUI component.
 */

import React, { memo } from 'react';
import { ToolCallWrapperProps } from '../registry/types';

export const WebSearchCustomWrapper = memo<ToolCallWrapperProps>(({ 
  children,
}) => {
  return (
    <div className="my-3">
      {children}
    </div>
  );
});

WebSearchCustomWrapper.displayName = 'WebSearchCustomWrapper';
