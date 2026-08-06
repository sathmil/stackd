# Stackd

Social discovery and rating platform for health products — think Letterboxd or Beli, for supplements, protein bars, and energy drinks.

Stackd lets people rate, review, and discover health products with an AI-computed ingredient-quality score alongside their own rating — instead of relying on brand marketing, sponsored content, or a star rating with no read on what's actually in the product.

**Live:** [getstackd.app](https://getstackd.app)

## Why

Health product reviews online are fragmented across Amazon, Reddit, TikTok, and influencer content, and rarely answer the actual question: is this good, and what's in it? Stackd separates products by variant (each flavor/size is scored independently, not lumped under one parent listing) and pairs a real person's own rating with an AI-generated read on ingredient quality, so ingredient quality isn't left to a guess.

## Features

- **AI-powered ingredient analysis** — an LLM reads each product's ingredient list and produces a 1–10 quality score plus a plain-language summary, computed once per product and shown as objective info alongside personal ratings, not blended into them
- **Independent product variants** — each flavor/size is its own rateable entry with its own score, not grouped under a parent product
- **Ranked, shareable lists** — build a ranked list of favorites and share it with a single public link
- **Community ratings & activity feed** — a global feed of real ratings and aggregate scores across the catalog
- **Product search & filtering** — category-based browsing and full-text search across the catalog

## Tech Stack

- **Frontend:** React (Vite), JavaScript with JSDoc type annotations
- **Backend/Data:** Supabase (Postgres, Auth, Row-Level Security, Storage, Edge Functions)
- **AI:** OpenAI, called from a Supabase Edge Function for ingredient analysis
- **Hosting:** Vercel

## Architecture

- PostgreSQL schema modeling products as a product/variant hierarchy (one brand, many flavors/sizes), with reviews and lists as first-class, independently queryable entities
- Row-level security policies enforcing per-user data access at the database layer
- Supabase Auth for user management, including a Proofpoint-safe password-reset flow (token exchanged client-side, not via a server-side link a security scanner can pre-consume)
- Feature-flag kill-switches for AI analysis and product submission, flippable without a deploy
- 432 rateable product variants across 24 brands, each with real nutrition facts, ingredient lists, and photos sourced directly from official brand sites

## Roadmap

- Follow graph / friend-based discovery (ratings are currently aggregate/community-wide, not social-graph-filtered)
- Barcode/camera scanning for adding products
- Affiliate links for monetization
- Brand analytics dashboards
- Native iOS/Android app (post-web-MVP validation)
