# FriendNDA

A lightweight, social pact builder. Built with Next.js App Router, TypeScript, Tailwind, and Firebase Firestore.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file and add your Firebase client config:

```bash
cp .env.example .env.local
```

3. Ensure Firestore is enabled in your Firebase project.

4. Run the app:

```bash
npm run dev
```

## Firebase config

The app expects Firebase web SDK config values in `.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

These map to the config found in the Firebase console under Project settings → Your apps → SDK setup and configuration.

## Resend email setup

FriendNDA uses Resend to send invite and completion emails. Add these to `.env.local`:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional)
- `NEXT_PUBLIC_BASE_URL`

Create an API key in Resend and paste it into `RESEND_API_KEY`.

## Firestore structure

- `pacts/{pactId}`
- `pacts/{pactId}/signatures/{signatureId}`

`pactId` is a random slug (e.g. `pact-xxxxxxxx`).
Events are stored under `pacts/{pactId}/events/{eventId}`.

## Notes

- `/p/[slug]/status?key=ownerSecret` is the owner-only view.
- This is a trust-based agreement designed for clarity and accountability between people.

## Netlify deployment

1. Make sure `netlify.toml` is at the repo root (it points Netlify to the `FriendNDA` base directory).
2. In Netlify site settings, set environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_BASE_URL` (set to your Netlify site URL, e.g. `https://your-site.netlify.app`)
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (optional)
