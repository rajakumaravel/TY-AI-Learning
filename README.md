# AI in Practice — TY Student Portal V2

A Netlify-hosted Transition Year learning portal for the **AI in Practice** curriculum.

## V2 pilot features

- Student code + PIN sign-in
- Signed HTTP-only session cookie
- Netlify Database (Postgres) progress persistence
- Local browser cache as a resilience layer
- Study-first material before activities and reflection questions
- Sequential block gating: Block 2 unlocks only after Block 1 is complete
- Progress, reflections, activities, badges and portfolio state
- Netlify Functions API
- Automated unit/integrity tests

## Local development

```bash
npm install
npm test
npx netlify dev
```

The `SESSION_SECRET` must be configured as a server-side Netlify environment variable in production.
