<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1PnsE095ilS36C5Rmxyy4941ZdctT1QDF

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production Email Verification Setup

To enable signup email verification from `noreply@pharmahead.app` in production:

1. Set backend environment variables (see `backend/.env.example`):
   `EMAIL_VERIFICATION_FRONTEND_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
2. For Zoho SMTP, use:
   `SMTP_HOST=smtp.zoho.in`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=noreply@pharmahead.app`
3. Set `EMAIL_VERIFICATION_FRONTEND_URL` to your live frontend origin (example: `https://pharmahead.app`).
4. Ensure backend CORS allows your frontend origin via `CLIENT_URL` and/or `CLIENT_URLS`.
5. Apply database schema changes before starting backend:
   from `backend/` run `npm run db:migrate` (or `npm run db:push` for non-migration environments), then `npm run db:generate`.

Verification links are generated as `https://<frontend-origin>/#/verify-email?...`, matching the app's `HashRouter` route.
