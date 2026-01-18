# Image Display in Chat Feature

## Overview

Images are now displayed in the chat interface for both user-attached images and AI web search results.

## Features

### User-Attached Images
- When users attach images to their messages, they are displayed above the message text
- Images are shown in a gallery format with up to 6 images visible at once
- A "View More" button appears if there are more than 6 images
- Clicking any image opens a full-size modal view

### AI Web Search Images
- When the AI performs a web search, related images are automatically fetched and displayed
- Images appear below the AI's response text
- Same gallery format with 6 max concurrent display
- Images are clickable for full-size viewing

## Implementation Details

### Components

**ImageGallery Component** (`components/conversations/ImageGallery.tsx`)
- Reusable component for displaying image galleries
- Props:
  - `images`: Array of `{ url: string; alt?: string; fileName?: string }`
  - `maxDisplay`: Maximum images to show before "View More" (default: 6)
  - `className`: Optional CSS classes
- Features:
  - Responsive grid layout (120x120px thumbnails)
  - Hover effects with zoom icon
  - Full-size modal on click
  - Error handling for broken images
  - Lazy loading for performance

### Type Updates

**Message Type** (`types.ts`)
```typescript
interface Message {
  // ... existing fields
  displayImages?: Array<{ url: string; alt?: string; fileName?: string }>;
}
```

**Backend Types** (`backend/src/api/web_search.rs`)
```rust
pub struct WebSearchResult {
  // ... existing fields
  image_url: Option<String>,
}

pub struct ImageResult {
  url: String,
  thumbnail_url: Option<String>,
  title: Option<String>,
  source_url: Option<String>,
}

pub struct WebSearchResponse {
  // ... existing fields
  images: Option<Vec<ImageResult>>,
}
```

### Backend Changes

**Web Search API** (`backend/src/api/web_search.rs`)
- Added `search_duckduckgo_images()` function to fetch images from DuckDuckGo
- Images are fetched in parallel with text search results
- Returns up to 6 images per search
- Images include thumbnail URLs for faster loading

### Frontend Integration

**ChatInterface** (`components/chat/ChatInterface.tsx`)
- Converts user-attached base64 images to `displayImages` format
- Receives `displayImages` from agent responses after web searches

**AgentChatService** (`services/agentChatService.ts`)
- Collects images from web search tool results
- Returns images in `executeWithTools()` response
- Images are attached to the assistant message

**MessageBubble** (`components/conversations/MessageBubble.tsx`)
- Displays `ImageGallery` for both user and AI messages
- User images shown above message content
- AI images shown below message content

## Usage

### For Users
1. **Attach images**: Use the file attachment modal to add images to your message
2. **View images**: Images appear above your message in the chat
3. **Click to enlarge**: Click any image to view full-size
4. **Web search images**: When AI searches the web, related images appear automatically

### For Developers
```typescript
// Display images in a message
const message: Message = {
  // ... other fields
  displayImages: [
    { url: 'https://example.com/image.jpg', alt: 'Description' },
    { url: 'data:image/png;base64,...', fileName: 'screenshot.png' }
  ]
};
```

## Image Sources

1. **User-attached images**: Base64-encoded images from local files
2. **Web search images**: URLs from DuckDuckGo image search
3. **Future**: Could support images from other sources (APIs, databases, etc.)

## Performance Considerations

- Images use lazy loading (`loading="lazy"`)
- Thumbnails are preferred over full-size images when available
- Gallery limits display to 6 images initially
- Full-size modal only loads when clicked
- Broken images are handled gracefully with fallback UI

## Browser Compatibility

- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Uses standard HTML5 image elements
- CSS Grid for responsive layout
- Backdrop blur for modal (with fallback)

## Future Enhancements

- [ ] Image carousel/slideshow mode
- [ ] Download images button
- [ ] Image metadata display (size, dimensions, source)
- [ ] Image search by similarity
- [ ] Copy image to clipboard
- [ ] Drag and drop reordering
- [ ] Image editing/annotation tools
- [ ] Support for GIFs and videos

## Testing

To test the feature:

1. **User images**: Attach an image file to a message and send it
2. **Web search images**: Ask the AI to search for something visual (e.g., "search for cat pictures")
3. **Gallery**: Attach 7+ images to test the "View More" button
4. **Modal**: Click any image to test full-size view
5. **Error handling**: Use a broken image URL to test fallback

## Files Modified

### Frontend
- `components/conversations/ImageGallery.tsx` (new)
- `components/conversations/MessageBubble.tsx`
- `components/conversations/index.ts`
- `components/chat/ChatInterface.tsx`
- `services/agentChatService.ts`
- `services/backendApi.ts`
- `types.ts`

### Backend
- `backend/src/api/web_search.rs`

## Related Issues

- Issue #34: Display images in chat

## License

Same as Skhoot project license.
