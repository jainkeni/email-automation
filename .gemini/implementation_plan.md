# AI Quotation Agent MVP — Implementation Plan

## Existing Project Analysis

### Database Tables (Supabase PostgreSQL)
- `admins` — UUID PK, name, email, bcrypt password, timestamps
- `email_requests` — UUID PK, from_email, from_name, subject, body, message_id (UNIQUE for dedup), received_at, ai_analysis (JSONB), ai_draft_reply, status (pending/approved/rejected), admin_reply, rejection_reason, replied_at, rejected_at, approved_by (FK admins.id), timestamps
- `company_settings` — single-row config, JSONB policies, products_and_services

### Backend Architecture
- **Express server** on port 5000 with HTTP + WebSocket
- **Auth**: JWT tokens, `authMiddleware.js` verifies Bearer token against `admins` table
- **AI Service**: Uses Groq (llama-3.3-70b-versatile), has `analyzeEmail()`, `generateDraftReply()`, `shouldProcessEmail()` (triage)
- **Email Fetcher**: IMAP (imapflow), polls every 2 min via node-cron, deduplicates by `message_id`, broadcasts via WebSocket
- **Email Sender**: Nodemailer SMTP, `sendReply(to, subject, body)` with HTML formatting
- **WebSocket**: `broadcast(type, data)` for real-time updates
- **Routes**: `/api/auth/*`, `/api/requests/*`, `/api/settings/*`

### Frontend Architecture  
- React 19 + Vite, react-router-dom v7, axios, react-hot-toast
- Pages: LoginPage, DashboardPage, RequestsPage, RequestDetailPage, SettingsPage
- Components: Sidebar, StatsCards, RequestTable, AiAnalysisCard, DraftReplyEditor
- Auth: AuthContext with JWT localStorage persistence
- API: Centralized `api.js` with interceptors
- Design: Dark glassmorphism theme, Inter font, CSS variables

### Key Reusable Components
1. `authMiddleware.js` — reuse for all new routes
2. `emailSender.js` `sendReply()` — reuse for sending quotations
3. `db.js` `getSupabase()` — reuse for all DB operations
4. `aiService.js` — extend, don't replace
5. `socketService.js` `broadcast()` — reuse for real-time quotation updates
6. `emailFetcher.js` — extend to detect quotation requests after analysis
7. Frontend: Sidebar (add nav items), design tokens/CSS, api.js (add new API modules)

---

## Implementation Phases

### Phase 1: ✅ Inspection Complete (this document)

### Phase 2: Database Migration
New tables: `products`, `customers`, `orders`, `order_items`, `customer_product_prices`, `quotation_requests`, `quotations`, `quotation_items`, `quotation_audit_logs`, `product_matching_corrections`

### Phase 3: Seed Data
100+ products, 10 customers, 100+ orders, 300+ order items, customer prices

### Phase 4: Product Catalogue API + UI
CRUD routes, product admin page with search/filter

### Phase 5: Customer Purchase History Service
`customerPurchaseProfile.service.js`, API endpoints

### Phase 6-21: AI Matching, Quotations, Dashboard (subsequent phases)
