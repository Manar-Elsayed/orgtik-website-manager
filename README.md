# OrgTik Website Manager

The CMS for the OrgTik public website ([orgtik-site](https://github.com/Manar-Elsayed/orgtik-site)): pages, global copy, translations, services and software, case studies, reviews, articles, legal pages, media, SEO, redirects, forms, leads and roadmap ideas, with draft → review → publish workflows and role-based access.

This is a standalone copy of `apps/wm` from the OrgTik suite monorepo. It runs on its own:

- **Backend built in.** `backend/` is the suite's mock API (Website Manager, identity, platform catalog). It runs inside this app's server; the Next route `app/api/backend/[...path]` forwards each call to it. The public website reads its published content from the same API.
- **Own sign-in.** In the suite, staff signed in on the SOS hub. Here `/<locale>/signed-out` is a sign-in form. It uses the same one-use code hand-off (`staff:wm`), so no token is ever put in the address.
- **UI library vendored.** `@orgtik/ui` is installed from `vendor/orgtik-ui-2.0.0-rc.1.tgz`, the library build packed from the monorepo.

## Demo accounts

Every account uses the password `Local@2026`. These are fake demo accounts from the seed data.

| Person | Email | Website Manager role |
|---|---|---|
| Mona Adel | mona.adel@orgtik.test | Super admin |
| Karim Hassan | karim.hassan@orgtik.test | Approver |
| Hoda Ashraf | hoda.ashraf@orgtik.test | Editor |
| Salma Nabil | salma.nabil@orgtik.test | Viewer |

## Run it locally

Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3007 and sign in. `npm run dev` and `npm run build` first copy `backend/` into `node_modules/orgtik-wm-backend` (`tools/link-backend.cjs`). After you change backend code, restart `npm run dev`.

To see the public website next to it, run [orgtik-site](https://github.com/Manar-Elsayed/orgtik-site) on port 4173 with `VITE_CMS_API=http://localhost:3007/api/backend/wm/v2`. Locally, data is kept in `backend/.data/`. Delete that folder to start again from the seed.

## Deploy to Vercel

Import the repository. The framework is Next.js and the defaults work. Set these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_WEBSITE_URL` | The website's address, e.g. `https://orgtik-site.vercel.app`. It is used for the preview frames and media. |
| `WM_PUBLIC_URL` | Optional. This app's own address if it isn't the Vercel production domain, e.g. a custom domain. |

Redeploy after you change them, because `NEXT_PUBLIC_*` values are built in.

### Data: demo mode

No database is configured, so the backend keeps its data on the server instance (`/tmp`):

- Edits last while an instance stays warm. After a cold start (inactivity, a redeploy) everything goes back to the seed content, and you have to sign in again.
- If Vercel runs several instances at once, they don't share data.

To keep data, add a store. The backend supports both of these without code changes:

- **Upstash Redis.** In Vercel, go to Storage → Upstash → Redis and connect it to this project. That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Also set `MOCK_SESSION_SECRET` to a random string of 32 or more characters.
- **Supabase.** Set `MOCK_PERSISTENCE=supabase`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `MOCK_SESSION_SECRET`. You also need the schema from the monorepo's `supabase/migrations`.

## What isn't included

The other suite apps aren't part of this copy: SOS hub, Tasks, Files, HR, Sales/CRM, Marketing, Chats and the admin console. The app rail hides them. The "open in CRM" and "central users" actions still point to the suite, so they won't work here.

## Checks

```sh
npm run typecheck
npm run i18n:check
npm test
```

## How it's put together

- **Languages:** en, ar, de, fr and it, in the path (`/ar/...`), with next-intl. `messages/*.json` have exact key parity.
- **Permissions:** `/v2/admin/me` returns the person's roles and permissions. The navigation hides what a role can't view, and the API enforces every permission again.
- **API:** `store/api.ts` (RTK Query) unwraps the v2 envelope. Every failure becomes an `ApiError` that the screen handles in place.
