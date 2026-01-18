# Tool Call Plugin System - Quick Start

## 🚀 5-Minute Guide

### Create a Basic Plugin

```typescript
// 1. Create your UI component
// components/tool-calls/your-category/YourToolUI.tsx
import React, { memo } from 'react';
import { ToolCallUIProps } from '../registry/types';

export const YourToolUI = memo<ToolCallUIProps>(({ toolCall, result }) => {
  if (!result) return null;
  
  return (
    <div className="mt-2 p-3 rounded-xl glass-subtle">
      <p className="text-[11px]">{result.output}</p>
    </div>
  );
});

YourToolUI.displayName = 'YourToolUI';
```

```typescript
// 2. Register in ToolCallRegistry.tsx
import { YourToolUI } from '../your-category/YourToolUI';
import { YourIcon } from 'lucide-react';

toolCallRegistry.register({
  toolName: 'your_tool',      // Must match agentChatService.ts
  displayName: 'Your Tool',
  category: 'other',
  icon: YourIcon,
  component: YourToolUI,
});
```

**Done!** Your tool now has a custom UI.

---

## 🎨 Add Custom Loading

```typescript
// 1. Create loading component
// components/tool-calls/your-category/YourToolLoadingUI.tsx
import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { ToolCallLoadingProps } from '../registry/types';

export const YourToolLoadingUI = memo<ToolCallLoadingProps>(({ toolCall }) => {
  return (
    <div className="mt-2 p-4 rounded-xl glass-subtle">
      <div className="flex items-center gap-3">
        <Loader2 className="animate-spin text-accent" size={24} />
        <p className="text-[11px] font-bold">Processing...</p>
      </div>
    </div>
  );
});

YourToolLoadingUI.displayName = 'YourToolLoadingUI';
```

```typescript
// 2. Add to registration
toolCallRegistry.register({
  toolName: 'your_tool',
  displayName: 'Your Tool',
  category: 'other',
  icon: YourIcon,
  component: YourToolUI,
  loadingComponent: YourToolLoadingUI,  // ← Add this
});
```

**Done!** Custom loading state added.

---

## ✨ Add Animations

```typescript
toolCallRegistry.register({
  toolName: 'your_tool',
  displayName: 'Your Tool',
  category: 'other',
  icon: YourIcon,
  component: YourToolUI,
  animations: {  // ← Add this
    enter: 'animate-in fade-in slide-in-from-bottom-2 duration-400',
  },
});
```

**Done!** Card now slides in from bottom.

---

## 🎯 Add Custom Styling

```typescript
toolCallRegistry.register({
  toolName: 'your_tool',
  displayName: 'Your Tool',
  category: 'other',
  icon: YourIcon,
  component: YourToolUI,
  styling: {  // ← Add this
    cardClassName: 'hover:scale-[1.02] transition-transform',
    headerClassName: 'bg-gradient-to-r from-accent/10 to-purple-500/10',
  },
});
```

**Done!** Card has custom styling.

---

## 🔧 Complete Custom Control

```typescript
// 1. Create custom wrapper
// components/tool-calls/your-category/YourToolWrapper.tsx
import React, { memo } from 'react';
import { ToolCallWrapperProps } from '../registry/types';

export const YourToolWrapper = memo<ToolCallWrapperProps>(({ 
  toolCall, result, isExecuting, children, plugin 
}) => {
  return (
    <div className="my-3 animate-in fade-in duration-500">
      {/* Your custom header */}
      <div className="rounded-t-xl bg-gradient-to-r from-accent to-purple-500 p-3">
        <div className="flex items-center gap-3 text-white">
          <plugin.icon size={24} />
          <h3 className="text-[12px] font-bold">{plugin.displayName}</h3>
        </div>
      </div>
      
      {/* Content */}
      <div className="rounded-b-xl border border-glass-border glass-subtle">
        {children}
      </div>
    </div>
  );
});

YourToolWrapper.displayName = 'YourToolWrapper';
```

```typescript
// 2. Add to registration
toolCallRegistry.register({
  toolName: 'your_tool',
  displayName: 'Your Tool',
  category: 'other',
  icon: YourIcon,
  component: YourToolUI,
  customWrapper: YourToolWrapper,  // ← Add this
});
```

**Done!** Complete card control achieved.

---

## 📋 Checklist

- [ ] Create UI component (`YourToolUI.tsx`)
- [ ] Register in `ToolCallRegistry.tsx`
- [ ] Test with tool execution
- [ ] Add custom loading (optional)
- [ ] Add animations (optional)
- [ ] Add custom styling (optional)
- [ ] Add custom wrapper (optional)
- [ ] Export in `index.ts` (optional)
- [ ] Document in README (optional)

---

## 🎓 Learn More

- **README.md** - Complete guide
- **CUSTOMIZATION_GUIDE.md** - All customization options
- **ARCHITECTURE.md** - System architecture
- **Examples** - Check `web-operations/` and `file-operations/`

---

## 💡 Quick Tips

1. **Start simple** - Basic plugin first, customize later
2. **Copy examples** - Use existing plugins as templates
3. **Test states** - Always test loading, success, and error
4. **Use TypeScript** - Let types guide you
5. **Check console** - Errors show up in browser console

---

## 🆘 Troubleshooting

**Plugin not showing?**
- Check `toolName` matches exactly in `agentChatService.ts`
- Verify registration in `ToolCallRegistry.tsx`

**TypeScript errors?**
- Ensure component implements `ToolCallUIProps`
- Check all required props are handled

**Styling not working?**
- Verify Tailwind classes are correct
- Check dark mode compatibility

---

**Need help?** Check the full documentation or existing plugin examples!
