This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Deploy on Cloudflare Pages (Static HTML Export)

This project is configured for **Next.js Static HTML Export** (`output: 'export'`), meaning the entire application—including Layer 1 (compromise parser) and Layer 2 (WebLLM web worker)—runs fully client-side. This makes it extremely fast and cost-effective to deploy on Cloudflare Pages.

### Option 1: Git Integration (Recommended)
1. Push your code to a Git repository (GitHub/GitLab).
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Choose your repository and set the following build settings:
   - **Framework preset**: `Next.js (Static HTML Export)`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
4. Click **Save and Deploy**.

### Option 2: Wrangler CLI
You can deploy directly from your local terminal using Wrangler:
```bash
# Build the static export
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy
```
