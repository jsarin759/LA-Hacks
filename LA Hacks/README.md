# StudySync

An AI-powered study scheduler built for LA Hacks. StudySync generates personalized Pomodoro-style study plans around your existing commitments and syncs everything with Google Calendar.

## What it does

- **Weekly calendar view** — drag-and-drop events, click empty slots to add, see your full week at a glance
- **AI study plan generation** — uses Gemini to fit study sessions into your free time, respecting existing classes/work and following a Pomodoro rhythm (25–45 min sessions with breaks)
- **Google Calendar sync** — import events from Google Calendar and export your schedule back, with duplicate detection on both sides
- **Persistent storage** — all events are saved to Supabase and tied to your account
- **Flashcard support** — generate flashcards from your study sessions
- **Schedule list view** — browse all events grouped by date with type color-coding

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Auth & DB | Supabase |
| AI scheduling | Google Gemini (gemini-2.5-flash) |
| Calendar | Google Calendar API (OAuth2) |

## Project structure

```
LA Hacks/
├── src/                        # React frontend
│   ├── pages/
│   │   ├── Home.jsx            # Main calendar view + GCal sync
│   │   └── ScheduleInput.jsx   # Event list view
│   ├── components/
│   │   ├── WeekCalendar.jsx    # Drag-and-drop weekly grid
│   │   ├── EventModal.jsx      # Add/edit event form
│   │   └── GenerateModal.jsx   # AI schedule generator UI
│   └── context/
│       ├── AuthContext.jsx     # Supabase auth + Google OAuth
│       └── ScheduleContext.jsx # Event CRUD backed by Supabase
└── server/src/                 # Express backend
    ├── routes/
    │   ├── schedule.js         # Study schedule generation endpoint
    │   └── googleCalendar.js   # Google OAuth + Calendar CRUD endpoints
    └── services/
        ├── gemini.js           # Gemini prompt + schedule parsing
        └── googleCalendar.js   # Google API client wrapper
```

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project
- Google Cloud project with Calendar API enabled and OAuth credentials
- Gemini API key

### Environment variables

Frontend (`.env`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3001
```

Backend (`server/.env`):
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5173/callback
GEMINI_API_KEY=...
```

### Running locally

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd server
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.
