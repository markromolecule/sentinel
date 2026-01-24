---
description: Guidelines for React Components
globs: **/components/**/*.tsx, **/_components/**/*.tsx
alwaysApply: false
---

# Guidelines for React Components

## Purpose and Overview

React components are the building blocks of the application UI. These guidelines ensure consistency, reusability, and maintainability across all components. Components should be focused, testable, and follow React best practices.

## Structure and Organization

### Component Module Structure

```
src/
├── components/                 # Shared components module
│   ├── ui/                     # UI components (button, input, etc.)
│   │   ├── button/
│   │   │   ├── index.tsx       # Component export
│   │   │   ├── button.tsx     # Component implementation
│   │   │   ├── button.test.tsx # Component tests
│   │   │   └── button.types.ts # Component types
│   │   └── input/
│   └── layout/                  # Layout components
│       └── header/
└── features/
    └── [feature-name]/
        └── _components/        # Feature-specific components
            └── [component-name]/
```

## Naming Conventions

### Files

- `[component-name].tsx`: For component implementation files
- `[component-name].types.ts`: For component type definitions
- `[component-name].test.tsx`: For component test files
- `index.tsx`: For component exports (barrel exports)

### Components

- `PascalCase`: For component names (e.g., `Button`, `UserCard`)
- Use descriptive names that indicate the component's purpose

### Props

- `camelCase`: For prop names
- Prefix boolean props with `is`, `has`, `should`, etc. (e.g., `isLoading`, `hasError`)

## Component Structure

### Basic Component Template

```typescript
// button.tsx
import { type ButtonProps } from './button.types';
import { cn } from '@/utils/cn';

export function Button({
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center',
        'rounded-md font-medium transition-colors',
        // Variant styles
        variant === 'default' && 'bg-primary text-white hover:bg-primary-focus',
        variant === 'outline' && 'border border-base-400 hover:bg-base-100',
        // Size styles
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4 text-base',
        size === 'lg' && 'h-12 px-6 text-lg',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        // External classes
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Component Types Template

```typescript
// button.types.ts
import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "default" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
};
```

### Component Export Template

```typescript
// index.tsx
export { Button } from "./button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./button.types";
```

## Implementation Guidelines

### Component Best Practices

- Keep components small and focused on a single responsibility
- Use TypeScript for all component props
- Extract complex logic into custom hooks
- Use composition over configuration when possible
- Prefer function components over class components
- Use React.memo for expensive components that re-render frequently
- Extract constants and types to separate files for complex components

### Props Handling

- Always destructure props in the function signature
- Provide default values for optional props
- Use spread operator for passing through HTML attributes
- Document complex props with JSDoc comments

### State Management

- Use local state (`useState`) for component-specific state
- Use Zustand stores for global state shared across components
- Use TanStack Query for server state
- Avoid prop drilling - use context or stores for deeply nested state

### Event Handlers

- Use descriptive names for event handlers (e.g., `handleSubmit`, `onUserClick`)
- Extract complex event handlers to separate functions
- Use `useCallback` for event handlers passed to child components

### Conditional Rendering

```typescript
// Good: Early returns for conditional rendering
if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

return <DataDisplay data={data} />;

// Good: Conditional rendering with logical operators
{isVisible && <Component />}
{items.length > 0 ? <ItemList items={items} /> : <EmptyState />}
```

### Component Composition

```typescript
// Good: Composition pattern
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <CardBody>Content</CardBody>
  </CardContent>
  <CardFooter>
    <CardActions>
      <Button>Action</Button>
    </CardActions>
  </CardFooter>
</Card>
```

## Testing Guidelines

### Component Test Template

```typescript
// button.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('custom-class');
  });
});
```

## Best Practices

### Performance Optimization

- Use `React.memo` for components that receive the same props frequently
- Use `useMemo` for expensive computations
- Use `useCallback` for functions passed as props
- Lazy load components with `React.lazy` for code splitting

### Accessibility

- Use semantic HTML elements
- Provide proper ARIA labels when needed
- Ensure keyboard navigation works
- Maintain proper focus management
- Use proper heading hierarchy

### Styling

- Use Tailwind CSS utility classes
- Use the `cn()` utility for conditional classes
- Extract complex style logic to separate functions
- Follow the styling guidelines for class organization

### Error Boundaries

- Wrap components in error boundaries for better error handling
- Provide fallback UI for error states
- Log errors appropriately

### Code Organization

- Keep components in their own directories
- Co-locate related files (types, tests, styles)
- Use barrel exports (index.tsx) for cleaner imports
- Group related components in feature folders
