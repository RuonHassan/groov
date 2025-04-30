# Groov - Task Management & Productivity App

## Overview

Groov is a comprehensive productivity application inspired by the Getting Things Done (GTD) methodology, designed to help users organize, prioritize, and track tasks efficiently. It features a minimalist interface, task management, and calendar integration (including Google Calendar sync), all wrapped in a clean, modern UI.

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

### Backend (`/server` & Supabase)
*   **API Server:** Express.js
*   **Database:** PostgreSQL (via Supabase or Vercel Postgres)
*   **ORM:** Drizzle ORM
*   **Authentication:** Supabase Auth
*   **Serverless Functions:** Supabase Edge Functions
*   **Schema Validation:** Zod
*   **Google API Integration:** `google-auth-library`, `googleapis`

### Shared (`/shared`)
*   **Database Schema & Types:** Drizzle ORM schema definitions
*   **Validation Schemas:** Zod schemas derived from Drizzle (`drizzle-zod`)

### Tooling & Development
*   **Database Migrations:** Drizzle Kit
*   **Type Checking:** TypeScript (`tsc`)
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
│   ├── supabase/           # Supabase configuration and Edge Functions
│   │   └── functions/      # Serverless Edge Functions
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
*   **Task Creation & Editing:** Add tasks with titles, notes, due dates, contexts, priority levels, and more
*   **GTD Workflow:** Tasks follow the GTD methodology with statuses like Inbox, Next, Waiting, Someday, Projects, and Completed
*   **Multiple Properties:**
    *   Status: Inbox, Next, Waiting, Someday, Project, Completed
    *   Context: Work, Home, Computer, Errands, etc.
    *   Energy: High, Medium, Low
    *   Priority: High, Medium, Low
    *   Time: Estimated time to complete
    *   Due Date: Optional deadline

### 2. Calendar Integration
*   **Event Management:** Create, update, delete calendar events
*   **Task Linking:** Associate calendar events with specific tasks
*   **Week View:** Intuitive weekly calendar view

### 3. Google Calendar Sync
*   **OAuth Authentication:** Secure connection to Google Calendar
*   **Calendar Integration:** View and manage Google Calendar events
*   **Event Synchronization:** See Google Calendar events alongside app events
*   **Token Management:** Automatic refresh token handling for persistent access

### 4. User Authentication
*   **Supabase Auth:** Complete authentication system using Supabase
*   **Email/Password:** Traditional login with email confirmation
*   **Password Reset:** Secure password reset flow
*   **User Profiles:** Extended user profiles with RLS protection
*   **Session Management:** Persistent sessions with token refresh

### 5. Smart Organization
*   **Temporal Sectioning:** Tasks automatically organized into Today, Tomorrow, and Future sections
*   **Context Filtering:** Filter tasks by context, energy level, or priority
*   **Project Grouping:** Group related tasks as projects

## API Endpoints (`/server/routes.ts`)

The backend provides a REST API under the `/api` prefix:

### Tasks
*   `GET /api/tasks`: Get all tasks (filtered to current user)
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

### Connected Calendars
*   `GET /api/users/:userId/connected-calendars`: Get user's connected calendars
*   `POST /api/connected-calendars`: Connect a new calendar
*   `PATCH /api/connected-calendars/:id`: Update a connected calendar
*   `DELETE /api/connected-calendars/:id`: Disconnect a calendar

## Supabase Edge Functions

The application uses Supabase Edge Functions for serverless operations:

### Google Calendar OAuth Flow
*   `google-calendar-callback`: Handles OAuth callback and token storage
*   `google-calendar-refresh`: Refreshes expired Google API tokens

## Data Models (`/shared/schema.ts`)

Key data structures defined using Drizzle ORM and Zod:

*   **Task:** `id`, `title`, `notes`, `status`, `context`, `energy`, `priority`, `time`, `dueDate`, `completedAt`, `createdAt`, `updatedAt`
*   **CalendarEvent:** `id`, `title`, `description`, `start`, `end`, `taskId`, `createdAt`, `updatedAt`
*   **ConnectedCalendar:** `id`, `userId`, `provider`, `calendarId`, `calendarName`, `accessToken`, `refreshToken`, `tokenExpiresAt`, `isPrimary`, `isEnabled`, `createdAt`, `lastSyncedAt`

*(Note: Field names in the database often use `snake_case` as shown in the Zod schemas, while application code might use `camelCase`)*

## Authentication System

The application uses Supabase Authentication for user management:

### Features
*   **Email/Password Authentication:** Traditional login flow
*   **Email Verification:** Optional verification emails
*   **Password Reset:** Secure password reset flow
*   **Session Management:** JWT-based sessions
*   **Row-Level Security:** Data protected by user-based policies

### Auth Flow
1. User registers with email/password
2. Email verification (if enabled) 
3. User logs in and receives JWT
4. Auth context maintains session state in app
5. JWT is used for API requests to both Express and Supabase
6. Supabase RLS enforces data access based on user ID

## Google Calendar Integration

The application connects to Google Calendar using OAuth 2.0:

### OAuth Flow
1. User clicks "Add Calendar" button
2. App redirects to Google consent screen
3. User authorizes the application
4. Google redirects back with authorization code
5. Supabase Edge Function exchanges code for tokens
6. Tokens stored securely in database
7. Access token used for Calendar API requests
8. Refresh token used to maintain access

## Getting Started

### Prerequisites
*   Node.js (v16+)
*   npm
*   Supabase account

### Setting Up Supabase
1.  Create a new Supabase project
2.  Run the SQL scripts in the `sql/` directory to set up tables and policies
3.  Configure Authentication providers
4.  Create Edge Functions using the code in `supabase/functions/`

### Environment Variables
1.  Create a `.env` file in the root directory (or potentially separate ones in `/client` and `/server` if needed).
2.  Add the required environment variables. Minimally, you'll need:
    ```env
    # Supabase Configuration
    VITE_SUPABASE_URL=your-supabase-url
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

    # Google OAuth Configuration
    VITE_GOOGLE_CLIENT_ID=your-google-client-id
    VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
    VITE_GOOGLE_API_KEY=your-google-api-key
    VITE_REDIRECT_URI=http://localhost:5173/auth/google/callback

    # Database (if using separate Postgres instance)
    DATABASE_URL=your-postgres-connection-string
    ```
    *Consult `.env.example` if it exists, or check the code (`drizzle.config.ts`, `server/storage.ts`, API client) for required variables.*

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

### Database Setup
1.  Push schema to database:
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

### Vercel Deployment
1.  Push your code to GitHub
2.  Create a new project in Vercel
3.  Connect to your GitHub repository
4.  Configure environment variables
5.  Deploy

### Supabase Setup for Production
1.  Configure appropriate redirect URLs for authentication
2.  Set up production Edge Functions
3.  Update environment variables with production URLs

## Security Considerations

### Row-Level Security
All database tables implement Row-Level Security to ensure users can only access their own data:
```sql
CREATE POLICY "Users can view their own tasks" 
  ON public.tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);
```

### API Protection
All API endpoints verify authentication and apply proper authorization before allowing access to resources.

### Token Storage
OAuth tokens are stored securely in the database and are never exposed to the client directly.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the LICENSE file for details. 