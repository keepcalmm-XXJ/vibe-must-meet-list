# Technology Stack

## Architecture
- **Monolithic Architecture**: Single deployable unit for demo/development simplicity
- **Full-Stack TypeScript**: Type safety across frontend and backend

## Frontend Stack
- **React.js + TypeScript**: Modern UI framework with type safety
- **Material-UI**: Consistent design system and component library
- **Socket.io Client**: Real-time bidirectional communication
- **React Router**: Client-side routing
- **State Management**: React Context/hooks for application state

## Backend Stack
- **Node.js + Express**: Server runtime and web framework
- **TypeScript**: Type-safe server-side development
- **Socket.io**: Real-time WebSocket communication
- **JWT**: Secure authentication tokens
- **Custom AI Algorithm**: JavaScript-based matching logic

## Database & Storage
- **SQLite**: Lightweight relational database for development/demo
- **File System**: Static asset storage (avatars, uploads)

## Development Tools
- **ESLint + Prettier**: Code quality and formatting
- **Jest + Testing Library**: Unit and integration testing
- **Supertest**: API testing
- **Playwright**: End-to-end testing

## Deployment
- **Docker**: Containerization for consistent deployment
- **Single Build**: Frontend and backend bundled together

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

### Database
```bash
# Run database migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Reset database
npm run db:reset
```

### Testing
```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:coverage
```