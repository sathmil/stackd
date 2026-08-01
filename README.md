# Stackd

Social discovery and rating platform for health products — think Letterboxd or Beli, for supplements, protein snacks, and energy drinks.

Stackd lets people rate, review, and discover health products through structured, multi-dimensional scores and a social graph that surfaces what friends actually like — instead of relying on brand marketing or generic star ratings.

**Live:** [getstackd.app](https://getstackd.app)

## Why

Health product reviews online are fragmented across Amazon, Reddit, and influencer content, and rarely capture what actually matters to a specific person — taste, ingredient quality, effectiveness, and value can each vary independently. Stackd separates products by variant (e.g., each flavor of an energy drink is scored independently) and lets social trust, not advertising, drive discovery.

## Features

- **Multi-dimensional rating system** — Taste, Effectiveness, Ingredient Quality, and Value scored independently on a 1–10 decimal scale
- **Independent product variants** — each flavor/SKU is its own entry with its own scores, not grouped under a parent product
- **Social graph** — friends' ratings surface first, so recommendations come from people you trust
- **Creator Pick badges** — algorithmically awarded based on community consensus
- **Product search & filtering** — fast, responsive discovery across the catalog

## Tech Stack

- **Frontend:** React, TypeScript
- **Backend/Data:** Supabase (Postgres, Auth, Row-Level Security)
- **Hosting:** Vercel

## Architecture

- PostgreSQL schema modeling users, product variants, reviews, and social relationships as first-class, independently queryable entities
- Supabase Auth for user management
- Row-level security policies enforcing per-user data access at the database layer
- React/TypeScript frontend for search, filtering, scoring, and social feed views


## Roadmap

- Affiliate links for monetization
- Brand analytics dashboards
- React Native mobile app (post-web-MVP validation)
