# Azure Practice 4 — Setup Guide

Three Node.js/TypeScript microservices, each with ESLint + Jest + Winston
logging + Azure Pipelines CI.

## What's in here

```
service-auth/            # Authentication service
service-orders/          # Orders service
service-notifications/   # Notifications service
```

Each service is a self-contained repo. They are intentionally **separate** —
push each one to its own Azure DevOps repository.

## Step 1 — Create Azure subscription

1. Go to https://portal.azure.com → sign in with a Microsoft account.
2. Subscriptions → Add → Pay-As-You-Go (or Free Trial if available).
3. Add a credit card. Azure DevOps stays free for ≤5 users.

## Step 2 — Create organization and project

1. Go to https://dev.azure.com (separate portal — important).
2. New organization → name it (e.g. `yourname-practice`) → region West Europe.
3. Inside the org → New project → name it `microservices-practice` →
   Visibility: Private → Version control: Git → Process: Basic → Create.

## Step 3 — Create three repos

Inside the project → Repos → top dropdown → "New repository".
Create:
- `service-auth`
- `service-orders`
- `service-notifications`

Tick "Add a README" so each repo has an initial commit.

## Step 4 — Push code to each repo

For each service folder in this archive:

```bash
cd service-auth
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://dev.azure.com/YOUR-ORG/microservices-practice/_git/service-auth
git pull origin main --allow-unrelated-histories   # because the remote has a README
git push -u origin main
```

Repeat for `service-orders` and `service-notifications`, changing the URL.

If you prefer a clean push without merging the remote README, recreate the
repo in Azure DevOps without the README option, then skip the `git pull` step.

## Step 5 — Run pipelines

For each repo:

1. In Azure DevOps → Pipelines → "New pipeline".
2. "Where is your code?" → Azure Repos Git.
3. Select the repo.
4. "Configure your pipeline" → Existing Azure Pipelines YAML file.
5. Branch: `main`, Path: `/azure-pipelines.yml` → Continue.
6. Review → Run.

The pipeline has two stages:
- **Validate** — `npm ci`, ESLint, TypeScript type-check
- **Test** — `npm ci`, Jest with JUnit + Cobertura output, results published
  to the Azure DevOps Tests + Code Coverage tabs.

### If you hit "no hosted parallelism"

Microsoft requires a one-time form for free hosted parallelism on personal
accounts: https://aka.ms/azpipelines-parallelism-request — fill it in, takes
2–3 business days. Mention this in your submission notes if it delays you.

## Step 6 — Verify locally (optional but recommended)

In each service folder:

```bash
npm install
npm run lint
npm test
npm run build
```

All three commands should succeed before pushing.

## Logging — what's implemented

Each service has `src/logger.ts` using Winston with:
- Configurable level via `LOG_LEVEL` (default `info`)
- JSON format in production (`NODE_ENV=production`), colorized text otherwise
- A `service` field on every log line for identifying source
- Structured metadata (e.g. `{ userId, orderId }`) on each call

Used at every meaningful step in `src/index.ts`:
- `info` — normal flow events (request received, action completed)
- `warn` — recoverable problems (missing optional field, item not found)
- `error` — failures (validation rejected, exception caught)
- `debug` — fine-grained detail, hidden by default

## Submission checklist

- [x] Azure subscription created
- [x] Azure DevOps organization
- [x] Project inside the org
- [x] 3 repos with code pushed
- [x] `azure-pipelines.yml` in each repo (Validate + Test stages)
- [x] Winston logging in every service
