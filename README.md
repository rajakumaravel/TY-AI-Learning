# AI in Practice — TY Student Portal V2.1

The portal follows **AI in Practice · Student Book v1.0 · September 2026** as the curriculum source of truth.

## Pilot features

- Chapters 1–2 mapped directly to the redesigned student book
- Study-first explanations before activities and reflections
- Required portfolio evidence before a session can be completed
- Sequential chapter unlocking
- Google login through Netlify Identity
- Netlify Database progress persistence across devices
- Local anonymous progress with migration into the student's account after first sign-in
- Netlify Functions API
- Automated curriculum/auth/build checks

## Authentication setup

Netlify Identity must be enabled for the project and **Google** added under Identity → Registration → External providers. The pilot can use Netlify's default shared Google OAuth integration, so custom Google client credentials are not required.

## Development

```bash
npm install
npm run check
npm run build
npx netlify dev
```

Production deploys are triggered from the `main` branch.
