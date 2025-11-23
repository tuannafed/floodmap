# 🎨 Tailwind CSS v4 Theme Documentation

## Overview

This project uses Tailwind CSS v4 with CSS-based theme configuration. All design tokens are defined in `src/app/globals.css` using the `@theme` directive.

## Theme Structure

### Colors

#### Primary Colors
- `primary-50` through `primary-950`: Blue color scale
- Usage: `bg-primary-600`, `text-primary-500`, etc.

#### Secondary Colors
- `secondary-50` through `secondary-950`: Cyan color scale
- Usage: `bg-secondary-600`, `text-secondary-500`, etc.

#### Brand Colors
- `brand`: `#0a84ff` (FloodMap brand color)
- `brand-dark`: `#0060df`
- Usage: `bg-brand`, `text-brand-dark`

#### Semantic Colors
- **Success**: `success-50` through `success-950` (Green)
- **Warning**: `warning-50` through `warning-950` (Amber)
- **Error**: `error-50` through `error-950` (Red)
- **Info**: `info-50` through `info-950` (Blue)

#### Neutral Colors
- `neutral-50` through `neutral-950`: Gray scale
- Usage: `bg-neutral-100`, `text-neutral-900`, etc.

#### shadcn/ui Compatible Colors
- `background`: Background color
- `foreground`: Text color
- `card`: Card background
- `card-foreground`: Card text
- `popover`: Popover background
- `popover-foreground`: Popover text
- `primary`: Primary color
- `primary-foreground`: Primary text color
- `secondary`: Secondary color
- `secondary-foreground`: Secondary text color
- `muted`: Muted background
- `muted-foreground`: Muted text
- `accent`: Accent background
- `accent-foreground`: Accent text
- `destructive`: Destructive/error color
- `destructive-foreground`: Destructive text
- `border`: Border color
- `input`: Input border color
- `ring`: Focus ring color

### Spacing

Spacing scale from `0` to `96`:
- `spacing-0`: 0
- `spacing-1`: 0.25rem (4px)
- `spacing-2`: 0.5rem (8px)
- `spacing-4`: 1rem (16px)
- `spacing-8`: 2rem (32px)
- ... up to `spacing-96`: 24rem (384px)

Usage: `p-4`, `m-8`, `gap-2`, etc.

### Typography

#### Font Families
- `font-sans`: System sans-serif stack
- `font-serif`: Serif font stack
- `font-mono`: Monospace font stack

#### Font Sizes
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- ... up to `text-9xl`: 8rem (128px)

#### Font Weights
- `font-thin`: 100
- `font-light`: 300
- `font-normal`: 400
- `font-medium`: 500
- `font-semibold`: 600
- `font-bold`: 700
- `font-black`: 900

#### Line Heights
- `leading-none`: 1
- `leading-tight`: 1.25
- `leading-normal`: 1.5
- `leading-relaxed`: 1.625
- `leading-loose`: 2

### Border Radius

- `rounded-none`: 0
- `rounded-sm`: 0.125rem (2px)
- `rounded`: 0.25rem (4px)
- `rounded-md`: 0.375rem (6px)
- `rounded-lg`: 0.5rem (8px)
- `rounded-xl`: 1rem (16px)
- `rounded-2xl`: 1.5rem (24px)
- `rounded-3xl`: 2rem (32px)
- `rounded-full`: 9999px

### Shadows

- `shadow-sm`: Small shadow
- `shadow`: Base shadow
- `shadow-md`: Medium shadow
- `shadow-lg`: Large shadow
- `shadow-xl`: Extra large shadow
- `shadow-2xl`: 2x large shadow
- `shadow-inner`: Inner shadow
- `shadow-none`: No shadow

### Z-Index

- `z-0`: 0
- `z-10`: 10
- `z-20`: 20
- `z-30`: 30
- `z-40`: 40
- `z-50`: 50
- `z-auto`: auto

## Dark Mode

Dark mode is automatically enabled based on system preferences using `@media (prefers-color-scheme: dark)`.

All semantic colors automatically adapt in dark mode:
- Background becomes darker
- Foreground becomes lighter
- Borders adjust for better contrast

## Usage Examples

### Using Semantic Colors
```tsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Primary Button
  </button>
  <div className="bg-card text-card-foreground border border-border">
    Card Content
  </div>
</div>
```

### Using Color Scale
```tsx
<div className="bg-primary-500 text-primary-50">
  Primary Color
</div>
<div className="bg-success-500 text-white">
  Success Message
</div>
<div className="bg-error-500 text-white">
  Error Message
</div>
```

### Responsive Design
```tsx
<div className="p-4 md:p-6 lg:p-8">
  Responsive Padding
</div>
```

### Typography
```tsx
<h1 className="text-4xl font-bold text-foreground">
  Heading
</h1>
<p className="text-base text-muted-foreground">
  Body text
</p>
```

## Customization

To customize the theme, edit `src/app/globals.css` and modify the CSS variables within the `@theme` block.

### Adding New Colors
```css
@theme {
  --color-custom-500: #your-color;
}
```

Then use: `bg-custom-500`, `text-custom-500`, etc.

### Modifying Existing Colors
Simply change the CSS variable value:
```css
@theme {
  --color-primary-600: #your-new-color;
}
```

## Accessibility

All color combinations meet WCAG AA contrast requirements:
- Text on backgrounds maintains 4.5:1 contrast ratio minimum
- Interactive elements have clear focus states
- Dark mode maintains proper contrast

## shadcn/ui Compatibility

This theme is fully compatible with shadcn/ui components. Use the semantic color names:
- `bg-background`, `text-foreground`
- `bg-card`, `text-card-foreground`
- `bg-primary`, `text-primary-foreground`
- `border-border`
- `ring-ring` for focus states

## Best Practices

1. **Use Semantic Colors**: Prefer `bg-background` over `bg-neutral-50` for better theme compatibility
2. **Dark Mode**: Always test components in both light and dark modes
3. **Contrast**: Ensure sufficient contrast between text and background
4. **Consistency**: Use the spacing scale consistently throughout the app
5. **Accessibility**: Test with screen readers and keyboard navigation

