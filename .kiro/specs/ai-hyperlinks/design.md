# Design Document: AI Hyperlinks System

## Overview

The AI Hyperlinks System enriches AI assistant responses with contextual hyperlinks for learning and source citation. The system automatically detects complex terms and sources, fetches relevant URLs through hidden web searches, and inserts hyperlinks into markdown responses. Users can preview link metadata on hover and open links in their browser.

This design integrates seamlessly with the existing tool call architecture, markdown rendering system, and settings infrastructure while following the Skhoot embossed glassmorphic design system.

## Architecture

### High-Level Flow

```
User Prompt → AI Processing → Web Search (if needed) → Message Composition
    ↓
Hyperlink Analysis → Hidden Web Search → URL Fetching → Link Insertion
    ↓
Markdown Rendering → Hyperlink Preview (hover) → Browser Navigation (click)
```

### Component Layers

1. **Settings Layer**: User preferences for hyperlink behavior
2. **Agent Layer**: AI decision-making and tool orchestration
3. **Tool Layer**: Hidden web search execution
4. **Rendering Layer**: Markdown parsing and hyperlink display
5. **Interaction Layer**: Preview and navigation handlers

## Components and Interfaces

### 1. Hyperlink Settings Service

**Location**: `services/hyperlinkSettingsService.ts`

**Purpose**: Manage user preferences for hyperlink behavior

**Interface**:
```typescript
export interface HyperlinkSettings {
  enabled: boolean;
  learningHyperlinks: boolean;
  sourceHyperlinks: boolean;
}

class HyperlinkSettingsService {
  loadSettings(): HyperlinkSettings;
  saveSetting(key: keyof HyperlinkSettings, value: boolean): void;
  saveSettings(settings: HyperlinkSettings): void;
}
```

**Storage Keys**:
- `skhoot_hyperlinks_enabled`
- `skhoot_learning_hyperlinks_enabled`
- `skhoot_source_hyperlinks_enabled`

**Default Values**:
```typescript
{
  enabled: true,
  learningHyperlinks: true,
  sourceHyperlinks: true
}
```

### 2. Settings UI Component

**Location**: `components/settings/AISettingsPanel.tsx` (modification)

**Purpose**: Provide UI controls for hyperlink settings

**UI Structure**:
```tsx
<div className="space-y-3">
  <label className="text-sm font-bold font-jakarta text-text-primary flex items-center gap-2">
    <Link size={16} className="text-blue-500" />
    Hyperlinks
  </label>
  
  {/* Master toggle */}
  <ToggleRow
    title="Enable Hyperlinks"
    description="Allow AI to add hyperlinks to responses"
    value={hyperlinkSettings.enabled}
    onChange={(v) => handleToggleHyperlinks(v)}
  />
  
  {/* Conditional sub-toggles */}
  {hyperlinkSettings.enabled && (
    <>
      <ToggleRow
        title="Learning Hyperlinks"
        description="Link complex terms and concepts for learning"
        value={hyperlinkSettings.learningHyperlinks}
        onChange={(v) => handleToggleLearning(v)}
      />
      
      <ToggleRow
        title="Source Hyperlinks"
        description="Link to sources and references"
        value={hyperlinkSettings.sourceHyperlinks}
        onChange={(v) => handleToggleSource(v)}
      />
    </>
  )}
</div>
```

**Styling**: Uses embossed glassmorphic design with toggle switches matching existing patterns

### 3. Hidden Web Search Tool

**Location**: `services/agentTools/agentTools.ts` (addition)

**Purpose**: Execute web searches without UI feedback for hyperlink enrichment

**Tool Definition**:
```typescript
{
  name: 'hidden_web_search',
  description: 'Search the web for hyperlink URLs without displaying UI. Use this to enrich your responses with contextual links for complex terms or source citations. This tool runs silently in the background.',
  parameters: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of search queries for terms needing hyperlinks'
      },
      link_type: {
        type: 'string',
        enum: ['learning', 'source'],
        description: 'Type of hyperlinks: "learning" for educational content, "source" for citations'
      }
    },
    required: ['queries', 'link_type']
  }
}
```

**Implementation**:
```typescript
async function executeHiddenWebSearch(
  queries: string[],
  linkType: 'learning' | 'source'
): Promise<HyperlinkResult[]> {
  const results: HyperlinkResult[] = [];
  
  for (const query of queries) {
    const searchResults = await backendApi.webSearch(query, 1, 'general');
    if (searchResults.results && searchResults.results.length > 0) {
      const topResult = searchResults.results[0];
      results.push({
        term: query,
        url: topResult.url,
        title: topResult.title,
        snippet: topResult.snippet,
        linkType
      });
    }
  }
  
  return results;
}
```

**Display Configuration**: 
```typescript
{
  displayUI: false,  // Suppress WebSearchUI rendering
  silent: true       // No status updates
}
```

### 4. System Prompt Enhancement

**Location**: `services/agentChatService.ts` (modification to `getAgentSystemPrompt`)

**Addition to System Prompt**:
```
HYPERLINK CAPABILITIES:
You can enrich your responses with contextual hyperlinks to help users learn and verify information.

When to Use Hyperlinks:
1. Learning Hyperlinks: Link complex terms, technical concepts, or specialized vocabulary
   - Example: "quantum entanglement", "REST API", "machine learning"
   - Use when the term may be unfamiliar to a general audience
   - Prioritize the most important 2-3 terms per response

2. Source Hyperlinks: Link to sources when citing facts, data, or references
   - Example: Documentation, research papers, official guides
   - Use when you've gathered information from web_search
   - Always cite sources for factual claims

How to Add Hyperlinks:
1. Compose your response normally
2. Identify terms needing hyperlinks (2-3 max for learning, all sources for citations)
3. Use hidden_web_search tool with queries array: ["term1", "term2"]
4. Insert markdown links: [term](url) using the returned URLs
5. Distinguish link types:
   - Learning: [quantum entanglement](url)
   - Source: [Source: NASA](url) or [1](url)

Hyperlink Settings:
- Check user settings before adding hyperlinks
- Respect enabled/disabled state for each hyperlink type
- If hyperlinks are disabled, compose responses without links

Example Workflow:
User: "What is quantum computing?"
1. Compose: "Quantum computing uses quantum entanglement and superposition..."
2. Identify: ["quantum entanglement", "superposition"]
3. hidden_web_search(queries: ["quantum entanglement", "superposition"], link_type: "learning")
4. Insert: "Quantum computing uses [quantum entanglement](url1) and [superposition](url2)..."
```

### 5. Enhanced Markdown Renderer

**Location**: `components/ui/MarkdownRenderer.tsx` (modification)

**Purpose**: Render hyperlinks with preview and navigation capabilities

**Hyperlink Component**:
```typescript
interface HyperlinkProps {
  href: string;
  children: React.ReactNode;
  linkType?: 'learning' | 'source';
}

const Hyperlink: React.FC<HyperlinkProps> = ({ href, children, linkType }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleMouseEnter = async () => {
    setShowPreview(true);
    if (!previewData && !isLoading) {
      setIsLoading(true);
      try {
        // Extract metadata from URL or use cached data
        const data = await fetchLinkPreview(href);
        setPreviewData(data);
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleMouseLeave = () => {
    setTimeout(() => setShowPreview(false), 300);
  };
  
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await openUrlInBrowser(href);
  };
  
  return (
    <span className="relative inline-block">
      <a
        href={href}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          underline underline-offset-2 cursor-pointer transition-all duration-200
          ${linkType === 'learning' ? 'text-blue-500 hover:text-blue-600' : 'text-purple-500 hover:text-purple-600'}
        `}
      >
        {children}
      </a>
      
      {showPreview && (
        <HyperlinkPreview
          data={previewData}
          isLoading={isLoading}
          linkType={linkType}
        />
      )}
    </span>
  );
};
```

**Preview Component**:
```typescript
interface HyperlinkPreviewProps {
  data: PreviewData | null;
  isLoading: boolean;
  linkType?: 'learning' | 'source';
}

const HyperlinkPreview: React.FC<HyperlinkPreviewProps> = ({ 
  data, 
  isLoading, 
  linkType 
}) => {
  return (
    <div 
      className="absolute z-50 mt-2 w-80 rounded-lg glass-elevated p-3 shadow-lg"
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(12px) saturate(1.2)'
      }}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-text-secondary">
          <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
          <span className="text-xs">Loading preview...</span>
        </div>
      ) : data ? (
        <>
          <div className="flex items-start gap-2 mb-2">
            {data.favicon && (
              <img src={data.favicon} alt="" className="w-4 h-4 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">
                {data.title}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {data.domain}
              </p>
            </div>
            {linkType && (
              <span className={`
                px-2 py-0.5 text-[9px] rounded-full
                ${linkType === 'learning' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}
              `}>
                {linkType === 'learning' ? 'Learn' : 'Source'}
              </span>
            )}
          </div>
          
          {data.description && (
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
              {data.description}
            </p>
          )}
          
          <div className="mt-2 pt-2 border-t border-dashed border-glass-border">
            <p className="text-[9px] text-text-secondary truncate">
              {data.url}
            </p>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-secondary">No preview available</p>
      )}
    </div>
  );
};
```

**Styling**: Embossed glassmorphic design with:
- Floating preview panel with elevated shadow
- Color-coded link types (blue for learning, purple for source)
- Smooth transitions and hover effects
- Theme-aware backdrop filters

### 6. Link Preview Data Service

**Location**: `services/linkPreviewService.ts`

**Purpose**: Fetch and cache link metadata for previews

**Interface**:
```typescript
interface PreviewData {
  url: string;
  title: string;
  description?: string;
  domain: string;
  favicon?: string;
}

class LinkPreviewService {
  private cache: Map<string, PreviewData> = new Map();
  
  async fetchPreview(url: string): Promise<PreviewData> {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    try {
      // Extract domain and favicon
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      
      // For now, use basic metadata
      // Future: Could fetch Open Graph data via backend
      const preview: PreviewData = {
        url,
        title: domain,
        domain,
        favicon
      };
      
      this.cache.set(url, preview);
      return preview;
    } catch (error) {
      throw new Error('Failed to fetch preview');
    }
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

export const linkPreviewService = new LinkPreviewService();
```

### 7. Browser Navigation Service

**Location**: `services/browserNavigationService.ts`

**Purpose**: Handle opening URLs in external browser

**Implementation**:
```typescript
class BrowserNavigationService {
  async openUrl(url: string): Promise<void> {
    console.log('[BrowserNavigation] Opening URL:', url);
    
    // Check if we're in Tauri environment
    const isTauri = typeof window !== 'undefined' && 
      ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
    
    if (isTauri) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        console.log('[BrowserNavigation] Opened with Tauri shell');
        return;
      } catch (error) {
        console.error('[BrowserNavigation] Tauri shell failed:', error);
      }
    }
    
    // Fallback to window.open
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    if (!newWindow || newWindow.closed) {
      console.error('[BrowserNavigation] Popup blocked');
      window.open(url, '_blank');
    }
  }
}

export const browserNavigationService = new BrowserNavigationService();
```

## Data Models

### HyperlinkResult

```typescript
interface HyperlinkResult {
  term: string;           // The term being linked
  url: string;            // The destination URL
  title: string;          // Page title
  snippet: string;        // Brief description
  linkType: 'learning' | 'source';  // Type of hyperlink
}
```

### PreviewData

```typescript
interface PreviewData {
  url: string;            // Full URL
  title: string;          // Page title
  description?: string;   // Meta description
  domain: string;         // Domain name
  favicon?: string;       // Favicon URL
}
```

### HyperlinkSettings

```typescript
interface HyperlinkSettings {
  enabled: boolean;                // Master toggle
  learningHyperlinks: boolean;     // Enable learning links
  sourceHyperlinks: boolean;       // Enable source links
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Settings Persistence

*For any* hyperlink setting change (enabled, learningHyperlinks, sourceHyperlinks), saving the setting and then loading settings should return the same value that was saved.

**Validates: Requirements 1.2, 1.5**

### Property 2: Conditional Settings UI

*For any* state of the master hyperlinks toggle, when enabled is true, both learning and source toggles should be visible, and when enabled is false, both sub-toggles should be hidden.

**Validates: Requirements 1.3, 1.4**

### Property 3: Source Hyperlink Insertion

*For any* AI response that uses web search results, when source hyperlinks are enabled, the response should contain markdown hyperlinks to the search result URLs.

**Validates: Requirements 3.1**

### Property 4: Hidden Web Search Execution

*For any* invocation of the hidden_web_search tool, the WebSearchUI component should not be rendered in the DOM, and no UI feedback should be displayed to the user.

**Validates: Requirements 4.1, 4.2, 10.3**

### Property 5: Hidden Web Search Return Format

*For any* successful hidden_web_search execution, the returned data should contain an array of objects with term, url, title, snippet, and linkType properties.

**Validates: Requirements 4.3**

### Property 6: Backend API Consistency

*For any* web search query, both web_search and hidden_web_search tools should call the same backend API endpoint (backendApi.webSearch).

**Validates: Requirements 4.4**

### Property 7: Graceful Error Handling

*For any* hidden_web_search failure, the AI should continue composing its response without hyperlinks and without displaying error messages to the user.

**Validates: Requirements 4.5**

### Property 8: Markdown Link Formatting

*For any* set of URLs retrieved from hidden_web_search, the AI should insert them into the message using valid markdown link syntax: [text](url).

**Validates: Requirements 5.4**

### Property 9: Multiple Tool Call Support

*For any* AI response workflow requiring both web_search and hidden_web_search, the agent system should successfully execute both tools in sequence within a single response.

**Validates: Requirements 5.6**

### Property 10: Hyperlink Preview Display

*For any* hyperlink in an AI message, hovering over it should display a preview panel within 200ms containing the link title, domain, description, and proper embossed glassmorphic styling.

**Validates: Requirements 6.1, 6.2, 6.3, 6.5**

### Property 11: Preview Dismissal Timing

*For any* displayed hyperlink preview, moving the cursor away from the hyperlink should dismiss the preview after 300ms.

**Validates: Requirements 6.4**

### Property 12: Browser Navigation

*For any* hyperlink click event, the system should invoke the browser navigation service to open the URL in the default browser without navigating away from the current chat session.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 13: Navigation Error Handling

*For any* failed URL opening attempt, the system should display a user-friendly error notification to inform the user of the failure.

**Validates: Requirements 7.4**

### Property 14: Markdown Hyperlink Rendering

*For any* markdown text containing link syntax [text](url), the MarkdownRenderer should render it as an interactive HTML anchor element with hover and click event handlers attached.

**Validates: Requirements 9.1, 9.4**

### Property 15: Link Type Visual Distinction

*For any* pair of learning and source hyperlinks rendered in the same message, they should have visually distinct styling (different colors) that is consistent with the embossed design system.

**Validates: Requirements 3.3, 9.2, 9.3**

### Property 16: Hyperlink Accessibility

*For any* rendered hyperlink, it should be keyboard navigable (focusable via Tab key) and include appropriate ARIA attributes for screen reader compatibility.

**Validates: Requirements 9.5**

### Property 17: Tool Structure Consistency

*For any* comparison between hidden_web_search and web_search tool definitions, they should have the same structure (name, description, parameters schema) and return the same data format.

**Validates: Requirements 10.1, 10.4**

## Error Handling

### Settings Service Errors

**Scenario**: localStorage is unavailable or quota exceeded

**Handling**:
- Fall back to default settings
- Log warning to console
- Continue operation without persistence

**User Impact**: Settings won't persist across sessions but feature remains functional

### Hidden Web Search Errors

**Scenario**: Backend API fails or returns no results

**Handling**:
- Catch error silently
- Return empty results array
- AI continues without hyperlinks
- No error message displayed to user

**User Impact**: Response lacks hyperlinks but content is delivered

### Link Preview Errors

**Scenario**: Failed to fetch preview metadata

**Handling**:
- Display basic preview with URL and domain only
- Show "No preview available" message
- Cache failure to avoid repeated attempts

**User Impact**: Preview shows minimal information but link remains clickable

### Browser Navigation Errors

**Scenario**: Tauri shell API fails or popup blocked

**Handling**:
- Try fallback to window.open
- Display error notification if all methods fail
- Provide copy URL option as last resort

**User Impact**: User is informed and can manually copy/paste URL

### Markdown Parsing Errors

**Scenario**: Malformed markdown link syntax

**Handling**:
- Render as plain text
- Log warning to console
- Continue rendering rest of message

**User Impact**: Malformed link appears as text, rest of message renders normally

## Testing Strategy

### Unit Testing

**Focus Areas**:
1. Settings service CRUD operations
2. Link preview data fetching and caching
3. Browser navigation service with Tauri detection
4. Markdown link parsing edge cases
5. Error handling for each service

**Example Tests**:
```typescript
describe('HyperlinkSettingsService', () => {
  it('should save and load settings correctly', () => {
    const settings = { enabled: true, learningHyperlinks: false, sourceHyperlinks: true };
    service.saveSettings(settings);
    expect(service.loadSettings()).toEqual(settings);
  });
  
  it('should return defaults when localStorage is empty', () => {
    localStorage.clear();
    expect(service.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('LinkPreviewService', () => {
  it('should cache preview data', async () => {
    const url = 'https://example.com';
    const preview1 = await service.fetchPreview(url);
    const preview2 = await service.fetchPreview(url);
    expect(preview1).toBe(preview2); // Same object reference
  });
});
```

### Property-Based Testing

**Configuration**: Minimum 100 iterations per test

**Property Tests**:

```typescript
// Property 1: Settings Persistence
describe('Property 1: Settings Persistence', () => {
  it('should persist any hyperlink setting change', () => {
    fc.assert(
      fc.property(
        fc.record({
          enabled: fc.boolean(),
          learningHyperlinks: fc.boolean(),
          sourceHyperlinks: fc.boolean()
        }),
        (settings) => {
          service.saveSettings(settings);
          const loaded = service.loadSettings();
          return (
            loaded.enabled === settings.enabled &&
            loaded.learningHyperlinks === settings.learningHyperlinks &&
            loaded.sourceHyperlinks === settings.sourceHyperlinks
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 8: Markdown Link Formatting
describe('Property 8: Markdown Link Formatting', () => {
  it('should format any URL set as valid markdown links', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          term: fc.string({ minLength: 1 }),
          url: fc.webUrl()
        }), { minLength: 1, maxLength: 5 }),
        (links) => {
          const message = formatLinksInMessage('Test message', links);
          // Verify all links are in markdown format
          return links.every(link => 
            message.includes(`[${link.term}](${link.url})`)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 10: Hyperlink Preview Display
describe('Property 10: Hyperlink Preview Display', () => {
  it('should display preview within 200ms for any hyperlink', async () => {
    fc.assert(
      await fc.asyncProperty(
        fc.webUrl(),
        async (url) => {
          const startTime = Date.now();
          const preview = await renderHyperlinkPreview(url);
          const endTime = Date.now();
          
          return (
            endTime - startTime <= 200 &&
            preview.contains('title') &&
            preview.contains('domain') &&
            preview.hasGlassmorphicStyling()
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 15: Link Type Visual Distinction
describe('Property 15: Link Type Visual Distinction', () => {
  it('should visually distinguish any pair of learning and source links', () => {
    fc.assert(
      fc.property(
        fc.record({
          learningLink: fc.webUrl(),
          sourceLink: fc.webUrl()
        }),
        ({ learningLink, sourceLink }) => {
          const rendered = renderMarkdown(
            `[learning](${learningLink}) [source](${sourceLink})`
          );
          
          const learningStyle = getComputedStyle(rendered.learningAnchor);
          const sourceStyle = getComputedStyle(rendered.sourceAnchor);
          
          // Colors should be different
          return learningStyle.color !== sourceStyle.color;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Scenarios**:
1. End-to-end hyperlink workflow: Settings → AI response → Hidden search → Link insertion → Preview → Navigation
2. Settings changes propagate to AI system
3. Multiple tool calls in single response
4. Error recovery across all components

**Example Integration Test**:
```typescript
describe('Hyperlink System Integration', () => {
  it('should complete full hyperlink workflow', async () => {
    // Enable hyperlinks
    hyperlinkSettings.saveSettings({
      enabled: true,
      learningHyperlinks: true,
      sourceHyperlinks: true
    });
    
    // Send message to AI
    const response = await agentChatService.chat(
      'What is quantum computing?',
      [],
      { sessionId: 'test' }
    );
    
    // Verify response contains hyperlinks
    expect(response.content).toMatch(/\[.*\]\(https?:\/\/.*\)/);
    
    // Render markdown
    const rendered = renderMarkdown(response.content);
    
    // Verify hyperlinks are interactive
    const links = rendered.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
    
    // Test preview
    const firstLink = links[0];
    fireEvent.mouseEnter(firstLink);
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    }, { timeout: 200 });
    
    // Test navigation
    fireEvent.click(firstLink);
    expect(browserNavigationService.openUrl).toHaveBeenCalled();
  });
});
```

### Manual Testing Checklist

- [ ] Settings toggles work correctly in AI Settings panel
- [ ] Learning hyperlinks appear for complex terms
- [ ] Source hyperlinks appear for web search results
- [ ] Preview displays on hover with correct timing
- [ ] Preview dismisses on mouse leave
- [ ] Links open in browser without navigating away
- [ ] Visual distinction between link types is clear
- [ ] Links work with keyboard navigation (Tab + Enter)
- [ ] Screen reader announces links correctly
- [ ] Error states display appropriate messages
- [ ] Works in both light and dark themes
- [ ] Embossed glassmorphic styling is consistent

## Implementation Notes

### Phase 1: Foundation (Settings & Services)
1. Create hyperlinkSettingsService
2. Add settings UI to AISettingsPanel
3. Create linkPreviewService
4. Create browserNavigationService

### Phase 2: Tool Integration
1. Add hidden_web_search tool definition
2. Implement tool execution without UI
3. Update system prompt with hyperlink instructions
4. Test tool invocation and result format

### Phase 3: Rendering & Interaction
1. Enhance MarkdownRenderer with Hyperlink component
2. Implement HyperlinkPreview component
3. Add hover and click handlers
4. Apply embossed glassmorphic styling

### Phase 4: Testing & Polish
1. Write unit tests for all services
2. Write property-based tests for core properties
3. Conduct integration testing
4. Manual testing and UX refinement

### Design System Compliance

**Colors**:
- Learning links: `text-blue-500` (light) / `text-blue-400` (dark)
- Source links: `text-purple-500` (light) / `text-purple-400` (dark)
- Preview background: `glass-elevated` with backdrop blur

**Shadows**:
- Inactive links: No shadow (inline text)
- Preview panel: `0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.2)`

**Transitions**:
- Link hover: `transition-all duration-200`
- Preview appear/dismiss: `transition-opacity duration-200`

**Typography**:
- Links: Inherit from surrounding text
- Preview title: `text-sm font-bold`
- Preview domain: `text-xs text-text-secondary`
- Preview description: `text-xs text-text-secondary leading-relaxed`

### Performance Considerations

1. **Link Preview Caching**: Cache preview data to avoid repeated fetches
2. **Debounced Hover**: 200ms delay before showing preview prevents flicker
3. **Lazy Loading**: Only fetch preview data when hover occurs
4. **Batch Searches**: hidden_web_search accepts array of queries for efficiency
5. **DOM Optimization**: Use React.memo for Hyperlink and HyperlinkPreview components

### Security Considerations

1. **URL Validation**: Validate URLs before opening in browser
2. **XSS Prevention**: Sanitize link text and preview content
3. **HTTPS Preference**: Prefer HTTPS URLs when available
4. **Tauri Shell API**: Use secure Tauri API for external URL opening
5. **Content Security Policy**: Ensure CSP allows external link previews

### Accessibility Requirements

1. **Keyboard Navigation**: All links focusable via Tab key
2. **Screen Reader Support**: Proper ARIA labels and roles
3. **Focus Indicators**: Visible focus outline on keyboard navigation
4. **Color Contrast**: Ensure link colors meet WCAG AA standards
5. **Alternative Text**: Provide text alternatives for link types

### Future Enhancements

1. **Rich Previews**: Fetch Open Graph metadata for better previews
2. **Link History**: Track clicked links for user reference
3. **Custom Link Styles**: User-configurable link colors
4. **Link Analytics**: Track which links users find most useful
5. **Inline Definitions**: Show brief definitions in preview for learning links
6. **Citation Formatting**: Support multiple citation styles for source links
