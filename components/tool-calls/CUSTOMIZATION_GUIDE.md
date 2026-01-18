# Tool Call Plugin Customization Guide

Complete guide to customizing tool call cards with the plugin system.

## 🎨 Customization Levels

### Level 1: Basic Plugin (Default Behavior)
Uses standard container with default loading spinner.

```typescript
toolCallRegistry.register({
  toolName: 'my_tool',
  displayName: 'My Tool',
  category: 'other',
  icon: MyIcon,
  component: MyToolUI,
});
```

**Result**: Standard card with default animations and loading state.

---

### Level 2: Custom Styling
Add custom CSS classes to card, header, and content.

```typescript
toolCallRegistry.register({
  toolName: 'my_tool',
  displayName: 'My Tool',
  category: 'other',
  icon: MyIcon,
  component: MyToolUI,
  styling: {
    cardClassName: 'hover:scale-[1.02] transition-transform shadow-lg',
    headerClassName: 'bg-gradient-to-r from-blue-500/10 to-purple-500/10',
    contentClassName: 'p-6',
  },
});
```

**Result**: Custom styling applied to standard container.

---

### Level 3: Custom Animations
Define entry, exit, and loading animations.

```typescript
toolCallRegistry.register({
  toolName: 'my_tool',
  displayName: 'My Tool',
  category: 'other',
  icon: MyIcon,
  component: MyToolUI,
  animations: {
    enter: 'animate-in fade-in slide-in-from-right duration-500',
    exit: 'animate-out fade-out slide-out-to-left duration-300',
    loading: 'animate-pulse',
  },
});
```

**Result**: Custom animations for card appearance and loading.

---

### Level 4: Custom Loading Component
Replace default spinner with custom loading UI.

```typescript
// Create loading component
export const MyToolLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="p-4 rounded-xl glass-subtle">
      <div className="flex items-center gap-3">
        <Loader2 className="animate-spin text-accent" size={24} />
        <div>
          <p className="text-[11px] font-bold">Processing...</p>
          <p className="text-[10px] text-text-secondary">
            {toolCall.arguments.someParam}
          </p>
        </div>
      </div>
      {/* Custom loading animation */}
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="h-12 rounded-lg glass-subtle animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
});

// Register with loading component
toolCallRegistry.register({
  toolName: 'my_tool',
  displayName: 'My Tool',
  category: 'other',
  icon: MyIcon,
  component: MyToolUI,
  loadingComponent: MyToolLoadingUI,  // Custom loading
});
```

**Result**: Custom loading UI shown during execution.

---

### Level 5: Custom Wrapper (Complete Control)
Replace entire card structure with custom wrapper.

```typescript
// Create custom wrapper
export const MyToolCustomWrapper = memo<ToolCallWrapperProps>(({ 
  toolCall,
  result,
  isExecuting,
  onCancel,
  children,
  plugin,
}) => {
  const status = isExecuting ? 'executing' 
               : result?.success ? 'success' 
               : 'error';

  return (
    <div className="my-3 animate-in fade-in duration-500">
      {/* Completely custom header */}
      <div className="rounded-t-2xl bg-gradient-to-br from-accent via-purple-500 to-pink-500 p-4">
        <div className="flex items-center gap-3 text-white">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <plugin.icon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold">{plugin.displayName}</h3>
            <p className="text-[10px] opacity-80">
              {isExecuting ? 'Processing...' : 'Complete'}
            </p>
          </div>
          {onCancel && isExecuting && (
            <button onClick={onCancel} className="p-2 rounded-lg bg-white/20">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Custom content area */}
      <div className="rounded-b-2xl border-x border-b border-glass-border glass-subtle p-4">
        {children}
      </div>
    </div>
  );
});

// Register with custom wrapper
toolCallRegistry.register({
  toolName: 'my_tool',
  displayName: 'My Tool',
  category: 'other',
  icon: MyIcon,
  component: MyToolUI,
  customWrapper: MyToolCustomWrapper,  // Complete control
});
```

**Result**: Completely custom card design with full control.

---

## 🎬 Animation Examples

### Slide Animations

```typescript
// Slide from bottom
animations: {
  enter: 'animate-in fade-in slide-in-from-bottom-4 duration-500',
}

// Slide from right
animations: {
  enter: 'animate-in fade-in slide-in-from-right-4 duration-500',
}

// Slide from left
animations: {
  enter: 'animate-in fade-in slide-in-from-left-4 duration-500',
}

// Slide from top
animations: {
  enter: 'animate-in fade-in slide-in-from-top-4 duration-500',
}
```

### Scale Animations

```typescript
// Zoom in
animations: {
  enter: 'animate-in fade-in zoom-in-95 duration-300',
}

// Zoom out
animations: {
  enter: 'animate-in fade-in zoom-out-105 duration-300',
}
```

### Spin Animations

```typescript
// Spin in
animations: {
  enter: 'animate-in fade-in spin-in-180 duration-500',
}
```

### Combined Animations

```typescript
// Slide + Scale
animations: {
  enter: 'animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-400',
}

// Slide + Spin
animations: {
  enter: 'animate-in fade-in slide-in-from-right-4 spin-in-45 duration-600',
}
```

---

## 🎨 Styling Examples

### Gradient Backgrounds

```typescript
styling: {
  headerClassName: 'bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10',
}
```

### Glassmorphism

```typescript
styling: {
  cardClassName: 'backdrop-blur-xl bg-white/5 border-white/10',
  headerClassName: 'backdrop-blur-lg bg-white/10',
}
```

### Hover Effects

```typescript
styling: {
  cardClassName: 'hover:scale-[1.02] hover:shadow-2xl transition-all duration-300',
}
```

### Shadows

```typescript
styling: {
  cardClassName: 'shadow-lg hover:shadow-2xl transition-shadow',
}
```

### Borders

```typescript
styling: {
  cardClassName: 'border-2 border-accent/20 hover:border-accent/40',
}
```

---

## 🔄 Loading State Examples

### Spinner with Text

```typescript
export const SpinnerLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="flex items-center gap-3 p-4">
      <Loader2 className="animate-spin text-accent" size={24} />
      <div>
        <p className="text-[11px] font-bold">Processing...</p>
        <p className="text-[10px] text-text-secondary">Please wait</p>
      </div>
    </div>
  );
});
```

### Progress Bars

```typescript
export const ProgressLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="p-4">
      <p className="text-[11px] font-bold mb-2">Loading...</p>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-2 bg-glass-subtle rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent animate-pulse"
              style={{ 
                width: `${i * 33}%`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
```

### Skeleton Placeholders

```typescript
export const SkeletonLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg glass-subtle animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-glass-subtle rounded animate-pulse" />
            <div className="h-2 bg-glass-subtle rounded w-2/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
});
```

### Animated Icons

```typescript
export const IconLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <Globe size={48} className="text-accent" />
        <Loader2 
          size={64} 
          className="absolute -top-2 -left-2 text-accent/30 animate-spin"
          style={{ animationDuration: '3s' }}
        />
      </div>
      <p className="text-[11px] font-bold mt-4">Searching...</p>
    </div>
  );
});
```

---

## 🎯 Real-World Examples

### Example 1: Web Search (Fancy)

```typescript
// Custom loading with animated search
export const WebSearchLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Globe size={24} className="text-accent animate-pulse" />
        <div>
          <p className="text-[11px] font-bold">Searching the web...</p>
          <p className="text-[10px] text-text-secondary">
            "{toolCall.arguments.query}"
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="h-16 rounded-lg glass-subtle animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
});

// Custom wrapper with gradient
export const WebSearchWrapper = memo<ToolCallWrapperProps>(({ 
  toolCall, result, isExecuting, children, plugin 
}) => {
  return (
    <div className="my-3 animate-in fade-in slide-in-from-left duration-500">
      <div className="rounded-t-xl bg-gradient-to-r from-accent/10 to-purple-500/10 p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
            <Globe size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[12px] font-bold">{plugin.displayName}</h3>
            <p className="text-[10px] text-text-secondary">
              {toolCall.arguments.query}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-b-xl border border-glass-border glass-subtle">
        {children}
      </div>
    </div>
  );
});

// Registration
toolCallRegistry.register({
  toolName: 'web_search',
  displayName: 'Web Search',
  category: 'web',
  icon: Globe,
  component: WebSearchUI,
  loadingComponent: WebSearchLoadingUI,
  customWrapper: WebSearchWrapper,
  animations: {
    enter: 'animate-in fade-in slide-in-from-left duration-500',
  },
});
```

### Example 2: File Operations (Clean)

```typescript
// Simple loading with file icons
export const ListDirectoryLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <FolderOpen size={24} className="text-amber-500" />
        <p className="text-[11px] font-bold">Reading directory...</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div 
            key={i}
            className="flex flex-col items-center gap-1 p-2 rounded-lg glass-subtle animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <File size={20} className="text-text-secondary opacity-30" />
            <div className="h-2 w-12 bg-text-secondary/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
});

// Registration (uses default wrapper)
toolCallRegistry.register({
  toolName: 'list_directory',
  displayName: 'List Directory',
  category: 'file',
  icon: FolderOpen,
  component: ListDirectoryUI,
  loadingComponent: ListDirectoryLoadingUI,
  animations: {
    enter: 'animate-in fade-in slide-in-from-bottom-2 duration-400',
  },
  styling: {
    cardClassName: 'hover:scale-[1.01] transition-transform',
  },
});
```

---

## 📋 Checklist for Custom Tool

- [ ] Create main UI component (`YourToolUI.tsx`)
- [ ] Create loading component (optional, `YourToolLoadingUI.tsx`)
- [ ] Create custom wrapper (optional, `YourToolCustomWrapper.tsx`)
- [ ] Define animations in plugin config
- [ ] Define custom styling in plugin config
- [ ] Register plugin in `ToolCallRegistry.tsx`
- [ ] Export components in `index.ts`
- [ ] Test loading state
- [ ] Test success state
- [ ] Test error state
- [ ] Test animations
- [ ] Document in README

---

## 💡 Tips

1. **Start Simple**: Begin with default container, add customizations as needed
2. **Reuse Components**: Share loading components between similar tools
3. **Test States**: Always test loading, success, and error states
4. **Performance**: Keep animations smooth (300-500ms duration)
5. **Accessibility**: Ensure loading states are announced to screen readers
6. **Consistency**: Match your app's design system
7. **Mobile**: Test on different screen sizes
8. **Dark Mode**: Test in both light and dark themes

---

**Result**: Complete control over every aspect of tool call cards! 🎨
