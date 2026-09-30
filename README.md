# Klivr

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). See `.env.example` for every setting.

## Accounts

Two fixed accounts, each with its own data. `AUTH_EMAIL` / `AUTH_PASSWORD_HASH` is the main account (all data from before accounts existed belongs to it); `AUTH_EMAIL_2` / `AUTH_PASSWORD_HASH_2` is the optional second one. Hash passwords with `npm run hash-password -- "the-password"` and escape every `$` as `\$` in `.env`. Sign out from the bell (Notifications) panel.

## Reminders (push notifications)

1. `npm run vapid-keys`; put both keys, `VAPID_SUBJECT="mailto:<you>"` and a random `CRON_SECRET` into `.env` and the Vercel env vars, then redeploy.
2. On [cron-job.org](https://cron-job.org), create a job: `POST https://<your-app>/api/reminders/dispatch` every minute, with header `Authorization: Bearer <CRON_SECRET>`.
3. On each device, sign in, open the bell → **Enable on this device**. On iPhone/iPad, first add Klivr to the Home Screen and open it from there.

Reminders are set per task (needs a due date) or per habit (needs a time) in their dialogs. Missed reminders older than 15 minutes are skipped rather than sent late.

## App icons

`public/productivity-app.svg` is the source; `npm run icons` regenerates `app/icon.svg`, `app/apple-icon.png` and `public/icons/*`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
