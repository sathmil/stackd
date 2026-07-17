# Stackd

Stackd is a review and discovery app for functional food and supplement products: energy drinks, protein bars, protein powders, pre-workouts, greens powders, and similar products. Think of it as a lightweight product-review network for what fuels you.

Live app: https://www.getstackd.app/

## What it does

- Browse and search a product catalog by name, brand, category, rating, popularity, or recency.
- View product pages with aggregate scores, nutrition details, ingredient context, and user reviews.
- Rate products on taste and value/effectiveness, mark whether you would buy again, and add notes or tags.
- Save products into ranked public or private lists.
- Submit missing products to the catalog for review.
- Manage account profile, avatar, rated products, password recovery, and account deletion flows.

## Tech stack

- React 19 + Vite
- React Router
- Supabase Auth, Postgres, Storage, and Row Level Security
- Tailwind CSS
- Vitest
- Oxlint and Prettier

## Architecture notes

The app keeps data access behind `src/lib/api/*`; pages and components do not talk to Supabase directly. Supabase Auth handles sessions, Postgres and RLS enforce data access, and SQL views provide aggregate product ratings.

See `docs/product.md` and `docs/architecture.md` for the fuller product and system design notes.

## Local development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
npm run test
npm run format
```

## Project status

Stackd is an active product build. The current implementation focuses on catalog discovery, reviewing, lists, auth, profile management, and the core Supabase-backed data model.
