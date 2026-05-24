# 07 · Deployment with Environments

GitHub Environments add protection rules (required reviewers, wait timers, branch restrictions) and scoped secrets to your deployment jobs. This workflow models a realistic build → staging → production promotion.

**Workflow file:** [`.github/workflows/07-deployment.yml`](../.github/workflows/07-deployment.yml)

---

## Jobs in this workflow

| Job | Environment | What it does |
|-----|------------|-------------|
| `build` | _(none)_ | Builds a `dist/` directory, uploads it as an artifact |
| `deploy-staging` | `staging` | Downloads artifact, simulates staging deploy |
| `deploy-production` | `production` | Downloads artifact, simulates production deploy, creates deployment record |

`deploy-staging` needs `build`; `deploy-production` needs `deploy-staging`.

---

## How to run

### Trigger on push to main

The workflow fires on any push to `main`:

```bash
git commit --allow-empty -m "test 07 deployment"
git push origin main
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"07 - Deployment with Environments"**.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 07-deployment.yml
```

---

## Recommended setup (to see the full feature)

The workflow runs without any setup, but the environments will have **no protection rules** and the secrets will be empty. To see the full deployment experience:

### Step 1 — Create environments

1. Go to **Settings → Environments → New environment**.
2. Create `staging` — leave all protection rules off for now.
3. Create `production` — add yourself as a **Required reviewer**.

### Step 2 — Add environment secrets (optional)

Inside each environment, add secrets that are only available to that environment's jobs:

| Environment | Secret name | Example value |
|-------------|-------------|---------------|
| `staging` | `STAGING_API_KEY` | `staging-key-demo` |
| `production` | `PROD_API_KEY` | `prod-key-demo` |

### Step 3 — Run with the protection gate

Push to `main` or run manually. Watch the workflow graph:

```
build → deploy-staging → deploy-production (waiting for approval)
```

`deploy-production` pauses with a **"Review deployments"** button. Click it, approve, and the production job starts. If you reject, the job is cancelled.

---

## What to observe

### `build` job

```
name=app-5  ← artifact name set as a job output
```

A `dist/version.txt` is created and uploaded as artifact `app-5`. The artifact name is passed to downstream jobs via `needs.build.outputs.artifact-name`.

### `deploy-staging` job

```
Deploying to staging environment...
Using secret: (not set)    ← '***' if STAGING_API_KEY is configured
version=abc123def...
```

The deployment is recorded in GitHub's deployment tracking. Go to your repo's **Deployments** sidebar (or `/deployments`) to see it appear.

The `environment: url: https://staging.example.com` is displayed in the workflow graph as a clickable link next to the job name.

### `deploy-production` job

If you added a **Required reviewer** to the `production` environment:
- The job shows **"Waiting"** until approved.
- You receive a notification email and see a banner on the Actions run page.
- After approval the job runs and creates a deployment status record via the GitHub API.

Without a required reviewer, the job starts immediately after `deploy-staging` succeeds.

---

## Deployment tracking

Every job that references an `environment:` automatically creates a deployment record visible at:
```
https://github.com/<owner>/<repo>/deployments
```

The `deploy-production` job also explicitly calls the Deployments API via `actions/github-script` to set the status to `success`. In a real workflow, you would also create the deployment object at the start of the job and update it to `failure` if the deploy step fails.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| `environment: name:` | Activates protection rules for the job |
| `environment: url:` | Clickable link shown in the workflow graph |
| Required reviewers | Production job pauses waiting for approval |
| Environment secrets | `STAGING_API_KEY` / `PROD_API_KEY` — only available in their environment's job |
| Deployment tracking | `/deployments` page shows history of staging + production |
| Artifact passing | `build` uploads → `deploy-*` downloads by name via `needs.build.outputs` |
