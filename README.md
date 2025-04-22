# Groov - Task Management & Productivity App

## Overview

Groov is a comprehensive productivity application inspired by the Getting Things Done (GTD) methodology, designed to help users organize, prioritize, and track tasks efficiently. It features a minimalist interface, task management, calendar integration (including Google Calendar sync), and a Pomodoro timer with gamification elements.

## Technology Stack

### Core & Bundling
*   **Runtime:** Node.js
*   **Language:** TypeScript
*   **Build Tool/Bundler:** Vite
*   **Package Manager:** npm

### Frontend (`/client`)
*   **Framework:** React
*   **UI Components:** Shadcn UI (built on Radix UI & Tailwind CSS)
*   **Styling:** Tailwind CSS
*   **Routing:** Wouter
*   **State Management/Data Fetching:** TanStack React Query
*   **Form Handling:** React Hook Form
*   **Schema Validation:** Zod
*   **Date Handling:** `date-fns`, `react-day-picker`
*   **Icons:** Lucide Icons (`lucide-react`)
*   **Charts:** Recharts

### Backend (`/server`)
*   **Framework:** Express.js
*   **Database:** PostgreSQL (using Vercel Postgres)
*   **ORM:** Drizzle ORM
*   **Schema Validation:** Zod
*   **Google API Integration:** `google-auth-library`, `googleapis`

### Shared (`/shared`)
*   **Database Schema & Types:** Drizzle ORM schema definitions
*   **Validation Schemas:** Zod schemas derived from Drizzle (`drizzle-zod`)

### Tooling & Development
*   **Database Migrations:** Drizzle Kit
*   **Type Checking:** TypeScript (`tsc`)
*   **Linters/Formatters:** (Assumed: ESLint, Prettier - Check `package.json` for specifics if needed)
*   **Dev Server:** Vite HMR

## Project Structure

The project follows a monorepo-like structure with shared code:

```
/
├── client/             # React Frontend Application
│   ├── public/
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── index.css
│   │   │   ├── components/   # Reusable UI components (including Shadcn)
│   │   │   ├── contexts/     # React contexts (if any)
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── lib/          # Utility functions, API client
│   │   │   ├── pages/        # Page-level components
│   │   │   └── assets/       # Static assets
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   ├── server/             # Express Backend API
│   │   ├── index.ts        # Express server setup
│   │   ├── routes.ts       # API endpoint definitions
│   │   ├── storage.ts      # Database interaction logic (using Drizzle)
│   │   └── vite.ts         # Vite integration helpers (likely for dev)
│   ├── shared/             # Code shared between frontend and backend
│   │   └── schema.ts       # Drizzle schemas, Zod validation, TypeScript types
│   ├── migrations/         # Drizzle ORM database migrations
│   ├── sql/                # SQL scripts (if any)
│   ├── .env                # Environment variables (client/server specific might exist)
│   ├── .gitignore
│   ├── drizzle.config.ts   # Drizzle Kit configuration
│   ├── package.json        # Project dependencies and scripts
│   ├── tsconfig.json       # TypeScript configuration (root)
│   ├── vite.config.ts      # Vite configuration (root)
│   ├── postcss.config.js   # PostCSS configuration
│   └── tailwind.config.ts  # Tailwind CSS configuration (root)
└── README.md           # This file
```

## Core Features

### 1. Task Management (GTD Inspired)
*   **Task Creation & Editing:** Add tasks with titles, notes, colors, start/end times.
*   **Status Tracking:** Although not strictly GTD statuses like "inbox" or "next" are defined in the current schema, tasks have `completed_at` timestamps, implying a completed state. The schema focuses more on timed tasks.
*   **Properties:** Tasks include `id`, `title`, `notes`, `color`, `start_time`, `end_time`, `completed_at`.

### 2. Calendar Integration
*   **Event Management:** Create, update, delete calendar events associated with the application.
*   **Task Linking:** Associate calendar events with specific tasks (`taskId`).
*   **Google Calendar Sync:** Functionality to connect and sync with Google Calendar (implied by `google-auth-library`, `googleapis`, and `connectedCalendarSchema`).

### 3. Pomodoro Timer & Forest Gamification
*   **Focus Sessions:** Pomodoro timer to track focused work sessions.
*   **Session Tracking:** Records Pomodoro sessions (`pomodoroSessionSchema`) including duration, status, start/end times.
*   **Gamification:** "Plant" virtual trees (`forestTreeSchema`) upon completing Pomodoro sessions, potentially tracking growth stages and types.
*   **User Stats:** Tracks user statistics like total pomodoros, trees, and streak days (`userSchema`).

## API Endpoints (`/server/routes.ts`)

The backend provides a REST API under the `/api` prefix:

### Tasks
*   `GET /api/tasks`: Get all tasks
*   `GET /api/tasks/:id`: Get a specific task
*   `POST /api/tasks`: Create a new task
*   `PATCH /api/tasks/:id`: Update a task
*   `DELETE /api/tasks/:id`: Delete a task

### Calendar Events
*   `GET /api/calendar-events`: Get all calendar events
*   `GET /api/calendar-events/:id`: Get a specific event
*   `POST /api/calendar-events`: Create a new event
*   `PATCH /api/calendar-events/:id`: Update an event
*   `DELETE /api/calendar-events/:id`: Delete an event
*   `GET /api/tasks/:taskId/calendar-events`: Get events for a specific task

### Pomodoro Sessions (Expected based on schema/docs)
*   `GET /api/users/:userId/pomodoro-sessions`: Get user's sessions
*   `GET /api/pomodoro-sessions/:id`: Get a specific session
*   `POST /api/pomodoro-sessions`: Create a new session
*   `PATCH /api/pomodoro-sessions/:id`: Update a session
*   `DELETE /api/pomodoro-sessions/:id`: Delete a session

### Forest Trees (Expected based on schema/docs)
*   `GET /api/users/:userId/forest-trees`: Get user's trees
*   `POST /api/forest-trees`: Plant a new tree
*   `PATCH /api/forest-trees/:id`: Update a tree
*   `DELETE /api/forest-trees/:id`: Remove a tree

### Connected Calendars (Expected based on schema)
*   CRUD endpoints for managing connected calendars (e.g., Google Calendar accounts). Likely includes routes for initiating OAuth flow.

### User Data (Expected based on schema)
*   Endpoints for retrieving/updating user profile information and stats.

*(Note: Verify exact Pomodoro, Forest, User, and Calendar Sync routes by checking the full `server/routes.ts` file)*

## Data Models (`/shared/schema.ts`)

Key data structures defined using Drizzle ORM and Zod:

*   **Task:** `id`, `title`, `notes`, `color`, `start_time`, `end_time`, `completed_at`, `created_at`, `updated_at`
*   **CalendarEvent:** *(Check `schema.ts` for exact fields - `insertCalendarEventSchema` is used in `routes.ts` but the table definition isn't shown in the provided context)*
*   **PomodoroSession:** `id`, `userId`, `taskId`, `duration`, `status`, `start_time`, `end_time`, `created_at`, `updated_at`
*   **ForestTree:** `id`, `userId`, `pomodoroSessionId`, `tree_type`, `growth_stage`, `planted_at`, `created_at`, `updated_at`
*   **User:** `id`, `username`, `password` (hashed), `email`, `total_pomodoros`, `total_trees`, `streak_days`, `created_at`, `updated_at`
*   **ConnectedCalendar:** `id`, `user_id`, `provider`, `calendar_id`, `calendar_name`, `access_token`, `refresh_token`, `token_expires_at`, `is_primary`, `is_enabled`, `created_at`, `last_synced_at`

*(Note: Field names in the database often use `snake_case` as shown in the Zod schemas, while application code might use `camelCase`)*

## Getting Started

### Prerequisites
*   Node.js (check `.nvmrc` or specify version if known)
*   npm
*   Access to a PostgreSQL database

### Installation
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd groov
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Environment Variables
1.  Create a `.env` file in the root directory (or potentially separate ones in `/client` and `/server` if needed).
2.  Add the required environment variables. Minimally, you'll need:
    ```env
    # For Drizzle ORM / Backend Database Connection
    DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

    # For Google Calendar Integration (obtain from Google Cloud Console)
    GOOGLE_CLIENT_ID="..."
    GOOGLE_CLIENT_SECRET="..."
    GOOGLE_REDIRECT_URI="..." # e.g., http://localhost:5173/auth/google/callback

    # Add any other variables required by client or server (e.g., Supabase keys if used for Auth)
    # VITE_SUPABASE_URL="..."
    # VITE_SUPABASE_ANON_KEY="..."
    ```
    *Consult `.env.example` if it exists, or check the code (`drizzle.config.ts`, `server/storage.ts`, API client) for required variables.*

### Database Setup
1.  Ensure your PostgreSQL database is running and accessible via the `DATABASE_URL`.
2.  Apply database migrations:
    ```bash
    npm run db:push
    ```
    *(This command uses `drizzle-kit push` which directly pushes schema changes. For production, consider using `drizzle-kit generate` and a migration tool.)*

### Running Locally
1.  Start the development server (runs both frontend and backend via Vite):
    ```bash
    npm run dev
    ```
2.  Open your browser to the address provided by Vite (usually `http://localhost:5173`).

### Other Scripts
*   `npm run build`: Build the production version of the frontend.
*   `npm run check`: Run TypeScript type checking on the client code.

## Deployment

*   The presence of `vercel.json` suggests potential deployment to Vercel.
*   The `.replit` and `replit.nix` files indicate configuration for Replit deployment.

Configuration details for deployment platforms would depend on the specific setup within those files. Generally, deployment involves:
1.  Setting up environment variables on the hosting platform.
2.  Configuring the build command (`npm run build`).
3.  Configuring the start command (likely involves running the Node.js server, e.g., `node server/index.js` after building).
4.  Ensuring the database is accessible from the deployment environment. 