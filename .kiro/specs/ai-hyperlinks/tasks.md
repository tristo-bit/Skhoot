# Implementation Plan: AI Hyperlinks System

## Overview

This implementation plan breaks down the AI Hyperlinks System into discrete coding tasks. The system will be built in four phases: Foundation (settings & services), Tool Integration, Rendering & Interaction, and Testing & Polish. Each task builds incrementally on previous work.

## Tasks

- [x] 1. Set up hyperlink settings service and storage
  - Create `services/hyperlinkSettingsService.ts` with HyperlinkSettings interface
  - Implement loadSettings(), saveSetting(), and saveSettings() methods
  - Add localStorage keys for enabled, learningHyperlinks, and sourceHyperlinks
  - Set default values: all enabled by default
  - _Requirements: 1.2, 1.5_

- [ ]* 1.1 Write property test for settings persistence
  - **Property 1: Settings Persistence**
  - **Validates: Requirements 1.2, 1.5**
  - Generate random settings objects and verify save/load round-trip

- [x] 2. Add hyperlink settings UI to AI Settings panel
  - Modify `components/settings/AISettingsPanel.tsx`
  - Add Hyperlinks section with Link icon
  - Implement master toggle for "Enable Hyperlinks"
  - Add conditional sub-toggles for Learning and Source hyperlinks
  - Use embossed glassmorphic styling matching existing toggles
  - Wire up to hyperlinkSettingsService
  - _Requirements: 1.1, 1.3, 1.4_

- [ ]* 2.1 Write property test for conditional settings UI
  - **Property 2: Conditional Settings UI**
  - **Validates: Requirements 1.3, 1.4**
  - Test that sub-toggles visibility depends on master toggle state

- [x] 3. Create link preview service
  - Create `services/linkPreviewService.ts`
  - Implement PreviewData interface (url, title, description, domain, favicon)
  - Implement fetchPreview() with URL parsing and favicon generation
  - Add in-memory caching with Map
  - Implement clearCache() method
  - _Requirements: 6.2_

- [ ]* 3.1 Write unit tests for link preview service
  - Test preview data fetching
  - Test caching behavior
  - Test error handling for invalid URLs

- [x] 4. Create browser navigation service
  - Create `services/browserNavigationService.ts`
  - Implement openUrl() method with Tauri detection
  - Add fallback to window.open for non-Tauri environments
  - Handle popup blocking gracefully
  - Add error logging
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 4.1 Write unit tests for browser navigation
  - Test Tauri environment detection
  - Test URL opening with mocked Tauri API
  - Test fallback to window.open
  - Test error handling

- [x] 5. Checkpoint - Ensure foundation services work
  - Verify settings service saves and loads correctly
  - Verify settings UI toggles function properly
  - Verify link preview service fetches and caches data
  - Verify browser navigation service opens URLs
  - Ask the user if questions arise

- [x] 6. Add hidden_web_search tool definition
  - Modify `services/agentChatService.ts` AGENT_TOOLS array
  - Add hidden_web_search tool with name, description, and parameters
  - Define parameters: queries (array of strings), link_type (enum: learning/source)
  - Add tool to format converters (OpenAI, Anthropic, Gemini, Ollama)
  - _Requirements: 4.1, 10.1, 10.2, 10.5_

- [x] 7. Implement hidden_web_search tool execution
  - Add case for 'hidden_web_search' in executeToolCall() method
  - Implement executeHiddenWebSearch() function
  - Loop through queries array and call backendApi.webSearch for each
  - Return HyperlinkResult array with term, url, title, snippet, linkType
  - Suppress UI rendering (no WebSearchUI display)
  - Handle errors gracefully without user-facing messages
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ]* 7.1 Write property test for hidden web search execution
  - **Property 4: Hidden Web Search Execution**
  - **Validates: Requirements 4.1, 4.2, 10.3**
  - Verify WebSearchUI is not rendered when tool executes

- [ ]* 7.2 Write property test for hidden web search return format
  - **Property 5: Hidden Web Search Return Format**
  - **Validates: Requirements 4.3**
  - Verify returned data has correct structure

- [ ]* 7.3 Write property test for backend API consistency
  - **Property 6: Backend API Consistency**
  - **Validates: Requirements 4.4**
  - Verify both tools call same backend endpoint

- [ ]* 7.4 Write property test for graceful error handling
  - **Property 7: Graceful Error Handling**
  - **Validates: Requirements 4.5**
  - Force errors and verify AI continues without displaying errors

- [x] 8. Update system prompt with hyperlink instructions
  - Modify getAgentSystemPrompt() in `services/agentChatService.ts`
  - Add HYPERLINK CAPABILITIES section
  - Include instructions for when to use learning vs source hyperlinks
  - Provide examples of hyperlink workflow
  - Instruct AI to check user settings before adding hyperlinks
  - Add markdown link syntax examples
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Checkpoint - Ensure tool integration works
  - Verify hidden_web_search tool is registered
  - Verify tool executes without UI display
  - Verify tool returns correct data format
  - Verify system prompt includes hyperlink instructions
  - Test AI can invoke hidden_web_search
  - Ask the user if questions arise

- [x] 10. Create Hyperlink component for markdown renderer
  - Create Hyperlink component in `components/ui/MarkdownRenderer.tsx`
  - Implement HyperlinkProps interface (href, children, linkType)
  - Add state for showPreview, previewData, isLoading
  - Implement handleMouseEnter with 200ms delay and preview fetch
  - Implement handleMouseLeave with 300ms dismiss delay
  - Implement handleClick with browser navigation
  - Apply color-coded styling (blue for learning, purple for source)
  - Add underline and hover effects
  - _Requirements: 6.1, 6.3, 6.4, 7.1, 9.1, 9.2, 9.3, 9.4_

- [ ]* 10.1 Write property test for hyperlink preview display
  - **Property 10: Hyperlink Preview Display**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
  - Test preview appears within 200ms with correct content and styling

- [ ]* 10.2 Write property test for preview dismissal timing
  - **Property 11: Preview Dismissal Timing**
  - **Validates: Requirements 6.4**
  - Test preview dismisses after 300ms on mouse leave

- [ ]* 10.3 Write property test for browser navigation
  - **Property 12: Browser Navigation**
  - **Validates: Requirements 7.1, 7.2, 7.3**
  - Test clicking link opens browser without navigating away

- [x] 11. Create HyperlinkPreview component
  - Create HyperlinkPreview component in `components/ui/MarkdownRenderer.tsx`
  - Implement HyperlinkPreviewProps interface (data, isLoading, linkType)
  - Render loading state with spinner
  - Render preview with title, domain, description, favicon
  - Add link type badge (Learn/Source)
  - Apply embossed glassmorphic styling with elevated shadow
  - Use backdrop-filter: blur(12px) saturate(1.2)
  - Position absolutely below hyperlink
  - _Requirements: 6.2, 6.5_

- [x] 12. Update markdown parser to use Hyperlink component
  - Modify parseInline() function in `components/ui/MarkdownRenderer.tsx`
  - Replace link rendering with Hyperlink component
  - Detect link type from URL or context (default to learning)
  - Pass href, children, and linkType props
  - Ensure keyboard navigation support (Tab to focus, Enter to activate)
  - Add ARIA attributes for accessibility
  - _Requirements: 9.1, 9.4, 9.5_

- [ ]* 12.1 Write property test for markdown hyperlink rendering
  - **Property 14: Markdown Hyperlink Rendering**
  - **Validates: Requirements 9.1, 9.4**
  - Test markdown links render as interactive HTML anchors with handlers

- [ ]* 12.2 Write property test for link type visual distinction
  - **Property 15: Link Type Visual Distinction**
  - **Validates: Requirements 3.3, 9.2, 9.3**
  - Test learning and source links have different colors

- [ ]* 12.3 Write property test for hyperlink accessibility
  - **Property 16: Hyperlink Accessibility**
  - **Validates: Requirements 9.5**
  - Test keyboard navigation and ARIA attributes

- [x] 13. Checkpoint - Ensure rendering and interaction work
  - Verify Hyperlink component renders correctly
  - Verify preview displays on hover with correct timing
  - Verify preview dismisses on mouse leave
  - Verify links open in browser
  - Verify visual distinction between link types
  - Verify keyboard navigation works
  - Ask the user if questions arise

- [x] 14. Add error handling for navigation failures
  - Modify browserNavigationService to catch errors
  - Display user-friendly error notification on failure
  - Provide fallback option to copy URL
  - Log errors to console for debugging
  - _Requirements: 7.4_

- [ ]* 14.1 Write property test for navigation error handling
  - **Property 13: Navigation Error Handling**
  - **Validates: Requirements 7.4**
  - Force navigation failures and verify error notifications

- [x] 15. Implement AI response workflow with hyperlinks
  - Ensure AI can make multiple tool calls in single response
  - Test workflow: web_search → compose → hidden_web_search → insert links
  - Verify settings are checked before adding hyperlinks
  - Verify markdown link syntax is correct
  - _Requirements: 5.3, 5.4, 5.6_

- [ ]* 15.1 Write property test for markdown link formatting
  - **Property 8: Markdown Link Formatting**
  - **Validates: Requirements 5.4**
  - Test URLs are formatted as valid markdown links

- [ ]* 15.2 Write property test for multiple tool call support
  - **Property 9: Multiple Tool Call Support**
  - **Validates: Requirements 5.6**
  - Test agent executes multiple tools in single response

- [x] 16. Add source hyperlink insertion for web search results
  - Modify AI behavior to insert source links when using web_search
  - Ensure source links are added when sourceHyperlinks setting is enabled
  - Format source links distinctly (e.g., [Source: Title](url))
  - _Requirements: 3.1, 3.3_

- [ ]* 16.1 Write property test for source hyperlink insertion
  - **Property 3: Source Hyperlink Insertion**
  - **Validates: Requirements 3.1**
  - Test web search results include hyperlinks when enabled

- [x] 17. Verify tool structure consistency
  - Compare hidden_web_search and web_search tool definitions
  - Ensure same structure (name, description, parameters)
  - Ensure same return data format
  - Document any intentional differences
  - _Requirements: 10.1, 10.4_

- [ ]* 17.1 Write property test for tool structure consistency
  - **Property 17: Tool Structure Consistency**
  - **Validates: Requirements 10.1, 10.4**
  - Compare tool definitions and return formats

- [x] 18. Final integration testing
  - Test complete end-to-end workflow
  - Test settings changes propagate to AI
  - Test error recovery across all components
  - Test in both light and dark themes
  - Verify embossed glassmorphic styling consistency
  - _Requirements: All_

- [ ]* 18.1 Write integration tests for hyperlink system
  - Test full workflow: settings → AI response → hidden search → link insertion → preview → navigation
  - Test settings propagation
  - Test error recovery

- [x] 19. Final checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests
  - Run all integration tests
  - Verify manual testing checklist
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
