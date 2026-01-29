# Prompt 09: Proportional Dynamic UI Scaling

"Implement a 'ScaleManager' service that ensures the desktop UI remains perfectly legible and proportioned regardless of window size or screen resolution.

Technical Logic:
1. Track the window's width and height in real-time.
2. Calculate a base `scale` factor using a reference resolution (e.g., 1200x800).
3. Export these factors as a set of dynamic CSS variables (`--scale`, `--scale-text`, `--component-scale`).
4. Apply these variables to:
   - Font sizes (e.g., `calc(14px * var(--scale-text))`).
   - Spacing and margins.
   - Icon dimensions.
   - Corner radii (to maintain the 32px look even when scaled)."
