<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Roadmap ideas and visitor comments — 2026-10-15

Ideas distinguish the website form's Category from staff-managed Tags. Retain the four stable category keys across translated form labels; display the category in the table and detail editor. The former Theme field is now Tags, with multiple removable tags and a tag filter after search. Preserve legacy theme values as tags, infer old categories only from recognized form choices, allow explicitly clearing tags, and keep filter choices complete across pagination and other filters.

Website suggestions enter Ideas as private pending records. Publishing an idea exposes it on the community roadmap; it does not create a separate timeline item. Visitors can submit comments on visible ideas with explicit privacy consent. Keep comments private until a moderator with marketing:edit approves them, support declining/hiding with a reason and Cancel, and never expose email addresses publicly. Retain retry receipts, moderation history, comments across merges, and persistent gateway checkpoints. Show sample discussions separately from visitor comments. This supersedes the earlier read-only sample-comment behavior.

Page approval: Website Manager Admin, Super admin, and Owner roles may approve their own page changes. Keep the normal approval permission and draft-validation checks. Other roles and other content types retain the separate-reviewer requirement. Determine administrative roles from authenticated membership, never request fields.

Media details: raster images support uploading a replacement while retaining their media ID, metadata, existing references, and original file bytes in version history. Require media:edit and a current media version. Preserve stored content revisions and resolve retained image references when reading current content.

Lead details: show the CRM action beside the title. Resolve the exact CRM contact only from the retained submission's server-side handoff reference and current CRM access in ws_orgtik. When no linked record exists, offer the CRM contacts list to authorized users with a clear explanation. Use the normal workspace switch and one-use SSO handoff so a Website Manager session can open CRM directly; never infer a record from an email or bypass CRM permissions.

Case studies use one mutually exclusive display choice: project card only, full story with sample labels, or full story with approved results. Persist both existing narrative flags together. Only content approvers with edit access can change it; approved stories still require confirmed figures, and sample stories remain visibly labelled. Keep the normal draft, review, and publication workflow, and do not auto-confirm results when a display mode is selected.
