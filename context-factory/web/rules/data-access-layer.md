---
description: Guidelines for Data Access Layer
globs: src/data/**/*.ts
alwaysApply: false
---

# Guidelines for Data Access Layer

## Purpose and Overview

Data access is responsible for interacting with external APIs, databases, or other data sources. It isolates the data fetching and mutation logic from business logic and UI components, making the code more maintainable and testable.

## Structure and Organization

### Data Access Module Structure

```
src/
└── data/                  # Shared data access layer module
    ├── api/               # External API clients
    │   └── [service]/
    │       ├── get-[resource].ts
    │       └── post-[resource].ts
    └── database/          # Database operations (Prisma)
        └── [entity]/
            ├── get-[entity].ts
            ├── get-[entity]s.ts
            ├── create-[entity].ts
            ├── update-[entity].ts
            └── delete-[entity].ts
└── features/
    └── [feature-name]/
        └── _data/         # Feature-specific data access
            ├── api/
            └── database/
```

## Naming Conventions

### Functions

- `get[Entity]Data`: For retrieving a single entity
- `get[Entity]sData`: For retrieving multiple entities
- `create[Entity]Data`: For creating an entity
- `update[Entity]Data`: For updating an entity
- `delete[Entity]Data`: For deleting an entity

### Types

- `[Entity]`: Main entity type
- `Get[Entity]DataArgs`: Arguments for get functions
- `Create[Entity]DataArgs`: Arguments for create functions
- `Update[Entity]DataArgs`: Arguments for update functions
- `Delete[Entity]DataArgs`: Arguments for delete functions

## Database Access (Prisma)

### Prisma Data Access Pattern

```typescript
// data/database/users/get-user.ts
import { db } from "@/lib/db";

export type GetUserDataArgs = {
  id: string;
  include?: {
    posts?: boolean;
    profile?: boolean;
  };
};

export async function getUserData({ id, include }: GetUserDataArgs) {
  return await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      ...(include?.posts && {
        posts: {
          select: {
            id: true,
            title: true,
            slug: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      }),
      ...(include?.profile && {
        profile: true,
      }),
    },
  });
}
```

### List Operations with Filtering

```typescript
// data/database/users/get-users.ts
import { db } from "@/lib/db";
import { type Prisma } from "@prisma/client";

export type GetUsersDataArgs = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  orderBy?: "name" | "email" | "createdAt";
  orderDirection?: "asc" | "desc";
};

export async function getUsersData(args: GetUsersDataArgs = {}) {
  const {
    page = 1,
    limit = 10,
    search,
    role,
    orderBy = "createdAt",
    orderDirection = "desc",
  } = args;

  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role as Prisma.Role;
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { [orderBy]: orderDirection },
    }),
    db.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Create Operations

```typescript
// data/database/users/create-user.ts
import { db } from "@/lib/db";
import { type Prisma } from "@prisma/client";

export type CreateUserDataArgs = {
  email: string;
  name: string;
  password: string;
  role?: Prisma.Role;
};

export async function createUserData(data: CreateUserDataArgs) {
  return await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: data.password,
      role: data.role || "USER",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

// Create with nested relations
export async function createUserWithProfileData(
  userData: CreateUserDataArgs,
  profileData: { bio?: string; avatar?: string },
) {
  return await db.user.create({
    data: {
      ...userData,
      profile: {
        create: profileData,
      },
    },
    include: {
      profile: true,
    },
  });
}
```

### Update Operations

```typescript
// data/database/users/update-user.ts
import { db } from "@/lib/db";
import { type Prisma } from "@prisma/client";

export type UpdateUserDataArgs = {
  id: string;
  data: {
    name?: string;
    email?: string;
    role?: Prisma.Role;
  };
};

export async function updateUserData({ id, data }: UpdateUserDataArgs) {
  return await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      updatedAt: true,
    },
  });
}

// Atomic update operations
export async function incrementPostCountData(userId: string) {
  return await db.user.update({
    where: { id: userId },
    data: {
      postCount: {
        increment: 1,
      },
    },
  });
}
```

### Delete Operations

```typescript
// data/database/users/delete-user.ts
import { db } from "@/lib/db";

export type DeleteUserDataArgs = {
  id: string;
};

export async function deleteUserData({ id }: DeleteUserDataArgs) {
  return await db.user.delete({
    where: { id },
  });
}

// Soft delete pattern
export async function softDeleteUserData({ id }: DeleteUserDataArgs) {
  return await db.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
}
```

### Complex Queries with Relations

```typescript
// data/database/posts/get-posts-with-authors.ts
import { db } from "@/lib/db";
import { type Prisma } from "@prisma/client";

export type GetPostsWithAuthorsDataArgs = {
  published?: boolean;
  categoryId?: string;
  tags?: string[];
  limit?: number;
};

export async function getPostsWithAuthorsData(
  args: GetPostsWithAuthorsDataArgs = {},
) {
  const { published, categoryId, tags, limit = 10 } = args;

  const where: Prisma.PostWhereInput = {};

  if (published !== undefined) {
    where.published = published;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (tags && tags.length > 0) {
    where.tags = {
      some: {
        slug: { in: tags },
      },
    };
  }

  return await db.post.findMany({
    where,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      category: true,
      tags: true,
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
```

### Transactions

```typescript
// data/database/orders/create-order-with-items.ts
import { db } from "@/lib/db";

export type CreateOrderWithItemsDataArgs = {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
};

export async function createOrderWithItemsData(
  args: CreateOrderWithItemsDataArgs,
) {
  return await db.$transaction(async (tx) => {
    // Calculate total
    const total = args.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    // Create order
    const order = await tx.order.create({
      data: {
        userId: args.userId,
        total,
        items: {
          create: args.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Update product stock
    for (const item of args.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return order;
  });
}
```

## External API Access

### API Client Pattern

```typescript
// data/api/github/get-repository.ts
import { type GitHubRepository } from "@/types/github";

export type GetGitHubRepositoryDataArgs = {
  owner: string;
  repo: string;
};

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export async function getGitHubRepositoryData({
  owner,
  repo,
}: GetGitHubRepositoryDataArgs): Promise<GitHubRepository> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
      next: {
        revalidate: 3600, // Cache for 1 hour
      },
    },
  );

  if (!response.ok) {
    throw new APIError(
      `Failed to fetch repository: ${response.statusText}`,
      response.status,
    );
  }

  return await response.json();
}
```

### API Client with Retry Logic

```typescript
// data/api/base-api-client.ts
export class BaseAPIClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor(baseURL: string, defaultHeaders?: HeadersInit) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders || {};
  }

  private async fetchWithRetry(
    endpoint: string,
    options: RequestInit = {},
    retries = 3,
  ): Promise<Response> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok && response.status >= 500 && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchWithRetry(endpoint, options, retries - 1);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchWithRetry(endpoint, options, retries - 1);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, {
      ...options,
      method: "GET",
    });

    if (!response.ok) {
      throw new APIError(
        `API request failed: ${response.statusText}`,
        response.status,
      );
    }

    return await response.json();
  }

  async post<T>(
    endpoint: string,
    data: unknown,
    options?: RequestInit,
  ): Promise<T> {
    const response = await this.fetchWithRetry(endpoint, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new APIError(
        `API request failed: ${response.statusText}`,
        response.status,
      );
    }

    return await response.json();
  }
}

// Usage
const githubClient = new BaseAPIClient("https://api.github.com", {
  Accept: "application/vnd.github.v3+json",
});

export async function getGitHubUserData(username: string) {
  return githubClient.get(`/users/${username}`);
}
```

### API Client with Authentication

```typescript
// data/api/authenticated-api-client.ts
import { auth } from "@/lib/auth";

export async function createAuthenticatedFetch() {
  const session = await auth();

  return async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(session?.user && {
          Authorization: `Bearer ${session.user.accessToken}`,
        }),
      },
    });
  };
}

// Usage in data access function
export async function getProtectedResourceData(id: string) {
  const authenticatedFetch = await createAuthenticatedFetch();
  const response = await authenticatedFetch(`/api/protected/${id}`);

  if (!response.ok) {
    throw new APIError("Failed to fetch resource", response.status);
  }

  return await response.json();
}
```

## Error Handling

### Custom Error Types

```typescript
// data/errors.ts
export class DataAccessError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "DataAccessError";
  }
}

export class NotFoundError extends DataAccessError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, "NOT_FOUND", 404);
  }
}

export class ValidationError extends DataAccessError {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message, "VALIDATION_ERROR", 422);
  }
}

// Usage
export async function getUserData(id: string) {
  const user = await db.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError("User", id);
  }

  return user;
}
```

## Caching Patterns

### Cache-Aware Data Access

```typescript
// data/database/posts/get-popular-posts.ts
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export async function getPopularPostsData() {
  return unstable_cache(
    async () => {
      return await db.post.findMany({
        where: { published: true },
        include: {
          user: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: [
          { likes: { _count: "desc" } },
          { comments: { _count: "desc" } },
        ],
        take: 10,
      });
    },
    ["popular-posts"],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: ["posts"],
    },
  )();
}
```
