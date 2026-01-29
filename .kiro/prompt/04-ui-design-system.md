# Prompt 04: The Adaptive Glass Design System

"Create a sophisticated React component library based on a 'Frosted Glass' aesthetic.

UI Components to build:
1. `ChatInterface`: A clean, minimal layout with auto-focusing input and smooth message bubble animations.
2. `MessageBubble`: Supporting markdown, code syntax highlighting, and inline rendering of agent tool results (e.g., file cards for directory listings).
3. `PromptArea`: An expanding textarea with quick-action shortcuts (triggered by `/`) and a voice recording visualizer.
4. `Modal`: A centralized portal system that ensures all overlays (Settings, File Explorer) are clipped perfectly to the 32px application corners.

Technical Fixes to include:
- `isolation: isolate` and `transform: translateZ(0)` for WebKit clipping on macOS.
- Manual window dragging via background click detection.
- Proportional UI scaling using CSS variables."
