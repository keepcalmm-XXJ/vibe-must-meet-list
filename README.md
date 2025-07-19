# AI Social Matching Platform

An intelligent social networking platform designed for business conferences, industry summits, and tech events. The platform uses AI algorithms to analyze participant backgrounds, interests, and business goals to enable precise matching.

## Features

- **Smart Matching**: AI-powered algorithm for high-value connections
- **Customizable Preferences**: Target specific job roles, industries, and company sizes
- **Real-time Interaction**: Instant messaging and meeting scheduling
- **Privacy-First**: Comprehensive privacy controls and data protection
- **Analytics & Insights**: Personal networking reports and event analytics

## Tech Stack

- **Frontend**: React.js + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite
- **Real-time**: Socket.io
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

### Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Project Structure

```
src/
├── client/          # React frontend
├── server/          # Express backend
└── shared/          # Shared types and utilities
```

## Development

The project uses TypeScript for type safety, ESLint for code quality, and Prettier for code formatting. All configurations are set up and ready to use.

## License

MIT