# MailPilot — AI Email Automation

AI-powered B2B email automation with admin dashboard. Automatically fetches customer emails, analyzes them with AI (Google Gemini), and generates smart draft replies for admin approval.

## Tech Stack

- **Frontend**: React (Vite) + Vanilla CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Email**: IMAP (fetching) + Nodemailer (sending)

## Setup

### Prerequisites
- Node.js 18+
- Supabase account (free tier at [supabase.com](https://supabase.com))
- Gmail App Password (or other SMTP credentials)
- Google Gemini API Key

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `backend/config/schema.sql`
3. Click **Run** to create all tables
4. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Supabase, email, and Gemini credentials
npm install
node server.js
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5174` — register an admin account and you're ready!

### Environment Variables (backend/.env)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret key for JWT tokens |
| `IMAP_HOST` | IMAP server (e.g., imap.gmail.com) |
| `IMAP_PORT` | IMAP port (993) |
| `IMAP_USER` | Email address for receiving |
| `IMAP_PASSWORD` | Email app password |
| `SMTP_HOST` | SMTP server (e.g., smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | Email address for sending |
| `SMTP_PASSWORD` | Email app password |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | Server port (default: 5000) |
| `FRONTEND_URL` | Frontend URL for CORS |

## Features

- 🤖 **AI Email Analysis**: Automatically extracts customer name, company, product needs, budget, timeline, and urgency
- ✍️ **Smart Draft Replies**: AI generates contextual replies based on your company information
- 📊 **Admin Dashboard**: Review, edit, approve, or reject email requests
- ⚙️ **Company Settings**: Configure your business info so AI generates accurate replies
- 📬 **Real-time Polling**: New emails appear automatically every 2 minutes
- 🔄 **Regenerate Drafts**: Not happy with AI's response? Regenerate with one click