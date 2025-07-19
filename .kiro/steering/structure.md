# Project Structure

## Root Directory Layout
```
/
├── src/                    # Source code
│   ├── client/            # React frontend
│   ├── server/            # Express backend
│   └── shared/            # Shared types and utilities
├── public/                # Static assets
├── database/              # Database files and migrations
├── tests/                 # Test files
├── docs/                  # Documentation
├── docker/                # Docker configuration
└── scripts/               # Build and utility scripts
```

## Frontend Structure (`src/client/`)
```
client/
├── components/            # Reusable UI components
│   ├── common/           # Generic components
│   ├── auth/             # Authentication components
│   ├── profile/          # User profile components
│   ├── matching/         # Matching and recommendations
│   └── communication/    # Chat and messaging
├── pages/                # Route-level page components
├── hooks/                # Custom React hooks
├── services/             # API client services
├── utils/                # Frontend utilities
├── types/                # TypeScript type definitions
└── styles/               # Global styles and themes
```

## Backend Structure (`src/server/`)
```
server/
├── controllers/          # Route handlers
├── services/             # Business logic
│   ├── UserService.ts
│   ├── EventService.ts
│   ├── MatchingService.ts
│   └── CommunicationService.ts
├── models/               # Data models and database schemas
├── middleware/           # Express middleware
├── routes/               # API route definitions
├── database/             # Database connection and queries
├── utils/                # Server utilities
└── config/               # Configuration files
```

## Shared Code (`src/shared/`)
```
shared/
├── types/                # Common TypeScript interfaces
│   ├── User.ts
│   ├── Event.ts
│   ├── Matching.ts
│   └── Communication.ts
├── constants/            # Application constants
├── validators/           # Data validation schemas
└── utils/                # Shared utility functions
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Services**: PascalCase with Service suffix (e.g., `MatchingService.ts`)
- **Utilities**: camelCase (e.g., `apiClient.ts`)
- **Types**: PascalCase interfaces (e.g., `User.ts`)

### Directory Organization
- Group by feature/domain rather than file type
- Keep related components and logic together
- Separate shared code from feature-specific code
- Use index files for clean imports

### Import Structure
```typescript
// External libraries first
import React from 'react';
import express from 'express';

// Internal imports (absolute paths)
import { User } from '@/shared/types/User';
import { UserService } from '@/server/services/UserService';

// Relative imports last
import './Component.styles.css';
```

### API Route Structure
```
/api/v1/
├── /auth              # Authentication endpoints
├── /users             # User management
├── /events            # Event management
├── /matching          # Matching and recommendations
├── /connections       # User connections
└── /messages          # Messaging system
```

### Database Organization
```
database/
├── migrations/        # Database schema migrations
├── seeds/            # Test data seeding
├── queries/          # Complex SQL queries
└── ai-social.db      # SQLite database file
```