## Signal Canvas frontend

This Next.js app is wired to the live backend exposed through ngrok and is set up to:

- show real-time workspace insights from `GET /insights`
- verify backend health from `GET /health`
- submit semantic search questions to `POST /query`

## Backend URL

Create a local env file if you want to point the app at a different backend:

```bash
cp .env.example .env.local
```

Then update `NEXT_PUBLIC_API_BASE_URL`.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- The current backend `POST /query` route is reachable, but the live server is returning an upstream Gemini API error.
- The frontend already handles that failure state and will show the backend error message in the UI.
- Once the backend query route is fixed, the answer and citations panel should work without more frontend changes.
