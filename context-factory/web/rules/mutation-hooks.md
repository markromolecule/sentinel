---
description: Guidelines for Mutation Hooks
globs: **/hooks/query/**/*.ts, **/_hooks/query/**/*.ts
alwaysApply: false
---
# Guidelines for Mutation Hooks

## Purpose and Overview
Mutation hooks abstract data modification operations (create, update, delete) using TanStack Query's useMutation hook. 
They provide loading states, error handling, and optimistic updates. These hooks connect UI components to the data access layer for write operations, 
keeping components focused on presentation rather than data manipulation logic.

## Structure and Organization

### Mutation Hooks Module Structure
```
src/
├── hooks/                      # Shared hooks module
│   └── query/                  # Shared query hooks (includes mutations)
│       └── [entity]/
│           ├── use-create-[entity]-mutation.ts        # Create operation
│           ├── use-update-[entity]-mutation.ts        # Update operation
│           ├── use-delete-[entity]-mutation.ts        # Delete operation
│           └── use-[specific-action]-[entity]-mutation.ts  # Other specific mutations
└── features/
    └── [feature-name]/
        └── _hooks/             # Feature-specific hooks
            └── query/          # Feature-specific query hooks (includes mutations)
                └── [entity]/
                    ├── use-create-[entity]-mutation.ts
                    ├── use-update-[entity]-mutation.ts
                    └── use-delete-[entity]-mutation.ts
```

## Naming Conventions

### Files
- `use-create-[entity]-mutation.ts`: For create operations
- `use-update-[entity]-mutation.ts`: For update operations
- `use-delete-[entity]-mutation.ts`: For delete operations
- `use-[specific-action]-[entity]-mutation.ts`: For other specific actions (e.g., `use-set-active-[entity]-mutation.ts`)

### Functions
- `useCreate[Entity]Mutation`: For create operations
- `useUpdate[Entity]Mutation`: For update operations
- `useDelete[Entity]Mutation`: For delete operations
- `use[SpecificAction][Entity]Mutation`: For other specific actions

### Types
- `UseCreate[Entity]MutationArgs`: Arguments for create mutation hook
- `UseUpdate[Entity]MutationArgs`: Arguments for update mutation hook
- `UseDelete[Entity]MutationArgs`: Arguments for delete mutation hook
- `Use[SpecificAction][Entity]MutationArgs`: Arguments for specific action mutation hook

## Implementation Guidelines

### Mutation Hooks
- Use TanStack Query's `useMutation` hook
- Import mutation functions directly from `@/data`
- Use TypeScript's `MutationOptions` type for args
- Spread args at the beginning to allow overriding any option
- Always get `queryClient` using `useQueryClient()`
- Handle cache invalidation in `onSuccess`
- Handle errors in `onError` with optional error alerting utility
- Call the provided callback after internal logic

## CRUD Mutation Examples

### 1. Create Mutation
```typescript
// use-create-[entity]-mutation.ts
import { type MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { post[Entity]s, type Post[Entity]sData, type Post[Entity]sResponse } from '@/data';
import { alertApiError } from '@/utils/api-errors';

export type UseCreate[Entity]MutationArgs = MutationOptions<
  Post[Entity]sResponse,
  Error,
  Post[Entity]sData
>;

export function useCreate[Entity]Mutation(args: UseCreate[Entity]MutationArgs = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    ...args,
    mutationFn: post[Entity]s,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ['/[entity]s'] });
      args.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (args?.onError) return args.onError(error, variables, context);
      alertApiError(error);
    },
  });
}
```

### 2. Update Mutation
```typescript
// use-update-[entity]-mutation.ts
import { type MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  put[Entity]sBy[Entity]Id,
  type Put[Entity]sBy[Entity]IdData,
  type Put[Entity]sBy[Entity]IdResponse,
} from '@/data';
import { alertApiError } from '@/utils/api-errors';

export type UseUpdate[Entity]MutationArgs = MutationOptions<
  Put[Entity]sBy[Entity]IdResponse,
  Error,
  Put[Entity]sBy[Entity]IdData
>;

export function useUpdate[Entity]Mutation(args: UseUpdate[Entity]MutationArgs = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    ...args,
    mutationFn: put[Entity]sBy[Entity]Id,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ['/[entity]s'] });
      args.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (args?.onError) return args.onError(error, variables, context);
      alertApiError(error);
    },
  });
}
```

### 3. Delete Mutation
```typescript
// use-delete-[entity]-mutation.ts
import { type MutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  delete[Entity]sBy[Entity]Id,
  type Delete[Entity]sBy[Entity]IdData,
  type Delete[Entity]sBy[Entity]IdResponse,
} from '@/data';
import { alertApiError } from '@/utils/api-errors';

export type UseDelete[Entity]MutationArgs = MutationOptions<
  Delete[Entity]sBy[Entity]IdResponse,
  Error,
  Delete[Entity]sBy[Entity]IdData
>;

export function useDelete[Entity]Mutation(args: UseDelete[Entity]MutationArgs = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    ...args,
    mutationFn: delete[Entity]sBy[Entity]Id,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: ['/[entity]s'] });
      args.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (args?.onError) return args.onError(error, variables, context);
      alertApiError(error);
    },
  });
}
```

### Complete CRUD Mutation Folder Structure Example
```
src/hooks/query/[entity]/
├── use-create-[entity]-mutation.ts    # Create
├── use-update-[entity]-mutation.ts    # Update
└── use-delete-[entity]-mutation.ts    # Delete
```

### Before Implementing Test Guidelines
- If the hooks use data access functions directly from `@/data`, mock those functions in tests
- Use Vitest's `vi.mock()` to mock data access functions
- Create test utilities in `__test-utils__` directories for reusable test data
- Use `@testing-library/react` for rendering hooks in tests
- Mock `useQueryClient` or create a QueryClient wrapper for tests

### Example Mutation Hook Test
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { postSamples, type PostSamplesData, type PostSamplesResponse } from '@/data/samples/create-sample';
import { makeFakeSample } from '@/data/samples/__test-utils__/make-fake-sample';
import {
  useCreateSampleMutation,
  type UseCreateSampleMutationArgs,
} from './use-create-sample-mutation';

// Mock the data access function
vi.mock('@/data/samples/create-sample', () => ({
  postSamples: vi.fn(),
}));

const mockSample = makeFakeSample();
const mockCreateSampleData: PostSamplesData = {
  title: mockSample.title,
  body: mockSample.body,
  userId: mockSample.userId,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function renderTestHook(args: UseCreateSampleMutationArgs = {}) {
  return renderHook(() => useCreateSampleMutation(args), {
    wrapper: createWrapper(),
  });
}

describe('useCreateSampleMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create sample data', async () => {
    vi.mocked(postSamples).mockResolvedValueOnce(mockSample);

    const { result } = renderTestHook();

    result.current.mutate(mockCreateSampleData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(postSamples).toHaveBeenCalledWith(mockCreateSampleData);
    expect(postSamples).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockSample);
  });

  it('should handle error state', async () => {
    const error = new Error('Failed to create sample');
    vi.mocked(postSamples).mockRejectedValueOnce(error);

    const { result } = renderTestHook();

    result.current.mutate(mockCreateSampleData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should call onSuccess callback when provided', async () => {
    vi.mocked(postSamples).mockResolvedValueOnce(mockSample);

    const onSuccessMock = vi.fn();
    const { result } = renderTestHook({
      onSuccess: onSuccessMock,
    });

    result.current.mutate(mockCreateSampleData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccessMock).toHaveBeenCalledWith(mockSample, mockCreateSampleData, undefined);
  });

  it('should call onError callback when provided', async () => {
    const error = new Error('Failed to create sample');
    vi.mocked(postSamples).mockRejectedValueOnce(error);

    const onErrorMock = vi.fn();
    const { result } = renderTestHook({
      onError: onErrorMock,
    });

    result.current.mutate(mockCreateSampleData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onErrorMock).toHaveBeenCalledWith(error, mockCreateSampleData, undefined);
  });

  it('should invalidate queries on success', async () => {
    vi.mocked(postSamples).mockResolvedValueOnce(mockSample);

    const { result } = renderTestHook();

    result.current.mutate(mockCreateSampleData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify that queries are invalidated (this would require access to queryClient)
    // In a real test, you might check queryClient.getQueryCache().getAll()
  });
});
```

## Best Practices

### Cache Invalidation
- Implement appropriate cache invalidation in onSuccess
- Consider which queries need to be invalidated after a mutation
- Use queryClient.invalidateQueries for cache invalidation

### Error Handling
- Implement appropriate error handling strategies
- Forward errors to the consuming components
- Consider global error handling for common error scenarios

### Side Effects
- Keep side effects (like showing toast notifications) in the component using the mutation
- Use the onSuccess and onError callbacks for side effects

### Mutation States
- Expose and use mutation states (isLoading, isError, isSuccess) in UI components
- Handle different states appropriately in the UI
