# Skhoot Embossed Style Guide

## Overview
Skhoot uses an **Embossed Glassmorphic Design System** that combines modern glassmorphism with tactile, embossed visual feedback. This creates an interface that feels both futuristic and physically interactive.

## Core Design Principles

### 1. Embossed States
- **Inactive/Default**: Elements appear to float above the surface with subtle drop shadows
- **Active/Pressed**: Elements appear pressed into the surface with inset shadows

### 2. Visual Hierarchy
```css
/* Inactive State - Floating */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.2);

/* Active State - Embossed/Pressed */
box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1);
```

## Component Styling

### Header Buttons (GlassButton)
- **Base**: `glass-subtle` with theme-aware backdrop filters
- **Inactive**: Drop shadow creates floating effect
- **Active**: Inset shadows create pressed-in effect
- **Hover**: Subtle scale `hover:scale-[1.02]`

### QuickActionButtons
- **Base**: Same embossed system as header buttons
- **Color Tinting**: Uses button-specific colors with low opacity
- **Section Feedback**: Active buttons tint the entire prompt area with `linear-gradient(135deg, ${color}08, ${color}04)`

### User Messages
- **Style**: Embossed appearance using inset shadows
- **Purpose**: Indicates "sent" status through pressed-in visual
- **Consistency**: Matches active button styling

## Color System

### Theme Variables
```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(0, 0, 0, 0.08);
  --text-primary: #2D3436;
  --text-secondary: #636E72;
  --accent: #DDEBF4;
}

.dark {
  --glass-bg: rgba(30, 30, 30, 0.95);
  --glass-border: rgba(255, 255, 255, 0.08);
  --text-primary: #e5e5e5;
  --text-secondary: #a0a0a0;
  --accent: #3b82f6;
}
```

### Button Color Mapping
- **Files**: Blue tones
- **Messages**: Green tones  
- **Space**: Purple tones
- **Cleanup**: Orange tones

## Implementation Guidelines

### 1. Interactive Elements
- Use embossed states to indicate interaction
- Inactive = floating (drop shadow)
- Active = pressed (inset shadow)

### 2. Glassmorphic Base
- All elements use `glass-subtle` or `glass-elevated`
- Backdrop filters: `blur(8px) saturate(1.1)`
- Theme-aware borders and backgrounds

### 3. Transitions
- Smooth transitions: `transition-all duration-200`
- Consistent easing: `cubic-bezier(0.22, 1, 0.36, 1)`

### 4. Dark Mode Compatibility
- All colors use CSS custom properties
- Automatic adaptation through theme variables
- Enhanced shadows in dark mode for better contrast

## Usage Examples

### Button States
```jsx
// Inactive button
<button className="glass-subtle" style={{
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
}}>

// Active button  
<button className="glass-subtle" style={{
  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)'
}}>
```

### Section Tinting
```jsx
// Active mode background
background: `linear-gradient(135deg, ${activeColor}08, ${activeColor}04)`
```

## Benefits

1. **Tactile Feedback**: Users can "feel" when elements are active
2. **Visual Consistency**: Unified design language across all components
3. **Theme Adaptability**: Works seamlessly in light and dark modes
4. **Modern Aesthetic**: Combines glassmorphism with classic embossed design
5. **Accessibility**: Clear visual states improve usability

## Best Practices

- Always use theme variables instead of hardcoded colors
- Maintain consistent shadow depths across similar components
- Test in both light and dark modes
- Ensure sufficient contrast for accessibility
- Use subtle animations to enhance the tactile feel
