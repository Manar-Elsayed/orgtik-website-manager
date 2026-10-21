# Website Manager workflow examples

The mock data follows the current Website Manager and public roadmap workflows.
All fictional records are labelled as mock/sample data. No dataset reset is required.

## Content and media

`workflow-examples.js` runs for fresh demo stores and upgrades older saved demo
stores through content demo version 5 and media demo version 2.

- Untouched seed ideas have the website form's four Categories and multiple Tags.
  Edited ideas and real visitor submissions keep their saved classification.
- The workspace guide has approved, pending and hidden sample visitor comments.
  Hosting has another pending comment. Pending/hidden text and email addresses
  remain private; old sample discussions stay separate.
- Work contains three private `Mock` drafts demonstrating card-only, sample-story
  and approved-story display. They have no client results, contain no invented
  metrics, are excluded from the sitemap and never publish themselves. The five
  existing website projects keep their published content and figures.
- The untouched business-card artwork has separate Description and Translation
  examples in all five languages and searchable tags. Edited files, metadata,
  rights decisions, bytes and references are preserved. Other files retain their
  missing-description/rights examples for filtering.
- The existing 2025–2027 roadmap records demonstrate the year tabs. A collection
  with more than three distinct years uses the dropdown automatically.

Saved version-5 content and version-2 media are not reseeded on reload. Migration
does not overwrite edited drafts, moderated comments, custom roles or accounts.

## Dedicated accounts, roles and CRM intake

Run the explicit installer against the local suite to add the cross-system
examples through the existing authorized APIs:

```powershell
$env:ORGTIK_WM_DEMO_EMAIL = 'mona.adel@orgtik.test'
$env:ORGTIK_WM_DEMO_PASSWORD = '<mock administrator password>'
$env:ORGTIK_WM_DEMO_ACCOUNT_PASSWORD = '<password for the new demo accounts>'
node tools/services/seed-wm-demo.mjs http://localhost:3400
```

For the confirmed hosted mock environment, use
`https://orgtik-suite-services.vercel.app --hosted` instead of the local origin.
Other hosted origins are rejected before credentials are sent. Never use real
customer information or credentials in these examples.

The installer adds:

| Example | Purpose |
| --- | --- |
| Mock content editor | Custom permission definition assigned to an active demo user |
| Mock read-only reviewer | Unassigned custom definition available for edit/delete testing |
| wm.demo.editor@orgtik.test | Active account with the custom content role |
| wm.demo.paused@orgtik.test | Active account with Website Manager role access paused |
| wm.demo.inactive@orgtik.test | Inactive account with a Viewer assignment |
| Demo Lina · Northstar Studio | A fictional website submission delivered to its actual CRM contact |

Existing accounts are never deactivated, reactivated, renamed or reassigned by
the installer. Existing demo accounts are preserved too. Existing role names
with different permissions cause a clear error instead of being overwritten.
The CRM example uses the normal form consent and privacy version and verifies
the actual retained handoff; it never invents a CRM ID or enables paused forms.
Repeating the installer finds its existing lead by a retained context marker,
preserves any edited demo accounts, and creates no duplicate intake. The older
unlinked sample leads remain useful for the CRM contacts-list fallback.

The current mock runtime advertises atomic initial account access. The installer
requires that capability before writing anything. Account creation accepts the
optional `roles`, `active` and `rolePaused` fields, validates them all first, then
creates the account and its internal Website Manager assignment in one request.
No billing lines or tool assignments are added. Omitting these fields preserves
the normal Add user behavior. A lost creation response is recovered by listing
the retained account without editing it; a rejected request leaves no partial
account, so the installer can safely be retried after an outage.

Deleting a role removes that assignment from its users while preserving their
other roles, account state and tool access. Only Super admin is undeletable.
Deleted built-in and custom keys remain recorded in the saved mock state and
cannot be reassigned or restored by a runtime restart. Confirmation counts and
role versions include current assignments so a changed assignment requires a
fresh confirmation.

Run regression checks with:

```text
node --test mock/apps/wm/workflow-examples.test.js mock/lib/workspace-wm-demo.test.js
```
