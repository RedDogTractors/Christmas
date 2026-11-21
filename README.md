# Wishbook

A private family Christmas list. Everyone keeps their own wish list; everyone else can claim
gifts from it, buy several of something, or split a big gift as a group. Nobody can see who
claimed or bought anything on their own list.

## How the surprise is protected

The server never sends claim data to the list's owner. "My list" queries only item details,
and opening your own person page redirects you back to "My list". This is enforced in the
server code (`lib/queries.js`, `app/person/[id]/page.js`), not just hidden in the browser.

The one way around it is social: someone with the family code could make a second account
under a fake name. Every account appears on the Family page, so a stranger would stand out.

## Deploy to Vercel (about 10 minutes, free)

1. Put this folder in a GitHub repository (or run `npx vercel` from the folder).
2. In Vercel, **Add New → Project** and import the repository. Keep the default Next.js settings.
3. In the project, open **Storage → Create Database → Neon** (Postgres), choose the free plan,
   and connect it to the project. This sets `DATABASE_URL` for you.
4. In **Settings → Environment Variables**, add:
   - `FAMILY_CODE`: what relatives type once to create an account, e.g. `snowfall-2026`
   - `ADMIN_CODE`: your private code for resetting forgotten PINs at `/reset`
   - `SESSION_SECRET`: a long random string (`openssl rand -base64 32`)
5. Redeploy (Deployments → ⋯ → Redeploy) so the variables take effect.
6. Send the family the site link and the family code.

Tables are created automatically on the first visit.

## Using it

- **My list**: add gifts with a name, link, price, quantity, and notes. Edit or remove anytime.
- **Family**: pick someone to see their list. Claim one or more of an item, or choose
  "Split it with others" to start a group gift; others join with an optional dollar share.
  A group reserves one unit of the item, and its organizer marks it bought.
- **My shopping**: everything you've committed to, grouped by person, with "Mark bought"
  checkboxes and a running total. If someone removes an item you already claimed, it
  stays here with a note.
- **Forgot PIN**: go to `/reset` and use the admin code.
- Five wrong PINs locks that name for 15 minutes.

## Starting fresh next year

In the Neon console (Vercel → Storage → your database → Open in Neon → SQL Editor):

```sql
TRUNCATE claims, group_gifts, group_members;
UPDATE items SET removed_at = now() WHERE removed_at IS NULL;
```

That clears all claims and empties everyone's lists while keeping accounts and PINs.

## Local development

```bash
cp .env.example .env.local   # fill in the values; DATABASE_URL can be your Neon URL
npm install
npm run dev
```
