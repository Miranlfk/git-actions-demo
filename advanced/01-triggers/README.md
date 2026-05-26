# 01 · Triggers (`on:`)

Every workflow starts with an `on:` block that defines what events fire it. This single workflow listens to five different event types. Each job uses `if: github.event_name ==` to run only when the right event fires — skipped jobs appear greyed-out in the workflow graph, which is useful for understanding the routing.

**Workflow file:** [`.github/workflows/01-triggers.yml`](../.github/workflows/01-triggers.yml)

---

## Jobs in this workflow

| Job | Fires when | What it does |
|-----|-----------|-------------|
| `ci` | `push` or `pull_request` | Installs deps, runs pytest, prints trigger info |
| `manual-deploy` | `workflow_dispatch` only | Reads inputs, simulates a deploy |
| `scheduled-audit` | `schedule` only | Runs `pip-audit` against requirements |
| `publish` | `release` only | Prints release metadata, simulates a registry publish |
| `external-trigger` | `repository_dispatch` only | Prints the client payload sent by the external caller |

---

## How to run each trigger

### 1. Push trigger → `ci` job

Push any non-markdown change to `main` or a `feature/*` branch:

```bash
git checkout -b feature/my-test
echo "# test" >> src/calculator.py
git add src/calculator.py
git commit -m "test push trigger"
git push origin feature/my-test
```

Go to the **Actions** tab — the "01 - Triggers" workflow appears. Only the `ci` job runs; `manual-deploy`, `scheduled-audit`, and `publish` are skipped.

> **Path filter:** changes to `.md` files alone do **not** trigger this workflow (`paths-ignore: ["**.md"]`). Try committing only a README change and confirm nothing fires.

---

### 2. Pull request trigger → `ci` job

Open a pull request targeting `main`:

```bash
# GitHub CLI
gh pr create --title "Test PR trigger" --body "Testing 01-triggers" --base main
```

Or open a PR through the GitHub UI. The `ci` job runs on `opened`. Every subsequent push to that branch (the `synchronize` event) runs it again. Close and reopen the PR to see `reopened`.

**What to observe in the logs:**
- `PR #: 123` is printed (non-empty only on `pull_request`, empty on `push`)
- The `ci` job link appears as a check on the PR page

---

### 3. Schedule trigger → `scheduled-audit` job

The cron is set to **every Monday at 08:00 UTC**. You cannot run the schedule by pushing — only time or `workflow_dispatch` fires it.

To test the scheduled job **without waiting**, trigger it manually:

```bash
gh workflow run 01-triggers.yml
```

This fires `workflow_dispatch`, which runs the `manual-deploy` job, **not** `scheduled-audit`. To actually exercise the `scheduled-audit` job interactively, temporarily change the cron to a time a few minutes away, push, wait, then revert:

```yaml
# Temporary test cron — change to ~5 minutes from now (UTC)
- cron: "25 14 * * *"
```

Alternatively, read the `scheduled-audit` job code and trust the logic — `pip-audit` runs and non-zero exits are suppressed in the demo so the workflow still passes.

---

### 4. Manual dispatch trigger → `manual-deploy` job

**Via GitHub UI:**
1. Go to the **Actions** tab of your forked repo.
2. Select **"01 - Triggers"** in the left sidebar.
3. Click the **"Run workflow"** button (top-right of the run list).
4. A form appears with two fields:
   - **Target environment** — choose `staging` or `production`
   - **Dry-run only** — tick the checkbox (default: on)
5. Click **"Run workflow"**.

**Via GitHub CLI:**
```bash
# Dry run to staging (default)
gh workflow run 01-triggers.yml \
  -f environment=staging \
  -f dry_run=true

# Real run to production
gh workflow run 01-triggers.yml \
  -f environment=production \
  -f dry_run=false
```

**What to observe:**
- Only the `manual-deploy` job runs — the others are skipped
- The log shows your chosen inputs: `Environment: staging`, `Dry run: true`
- With `dry_run=true`: `[DRY RUN] Would deploy to staging`
- With `dry_run=false`: `Deploying to staging...`
- The job's `environment:` field activates the GitHub environment (see [07-deployment](../07-deployment/) for protection rules)

---

### 5. Release trigger → `publish` job

**Via GitHub UI:**
1. Navigate to your repo's **Releases** page (`/releases`).
2. Click **"Draft a new release"**.
3. Click **"Choose a tag"** → type `v0.0.1-test` → click **"Create new tag"**.
4. Add a title (e.g., `Test release`) and click **"Publish release"**.

**Via GitHub CLI:**
```bash
gh release create v0.0.1-test --title "Test release" --notes "Testing 01-triggers"
```

**What to observe:**
- Only the `publish` job runs
- Logs show: `Tag: v0.0.1-test`, `Name: Test release`, `Pre: false`

**Clean up** the test tag/release after:
```bash
gh release delete v0.0.1-test --yes
git push --delete origin v0.0.1-test
```

---

### 6. Repository dispatch trigger → `external-trigger` job

`repository_dispatch` lets you fire a workflow from **outside GitHub** — a CI server, a chatops bot, or another repository — by POSTing to the REST API. The workflow filters on the `event_type` field, so one repo can listen for multiple distinct external events.

**Via GitHub CLI:**
```bash
gh api repos/:owner/:repo/dispatches \
  -f event_type=run-external-build \
  -f 'client_payload[source]=jenkins' \
  -f 'client_payload[reason]=nightly-build'
```

**Via curl with a PAT:**
```bash
curl -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<owner>/<repo>/dispatches \
  -d '{
    "event_type": "run-external-audit",
    "client_payload": {"source": "external-scanner", "reason": "weekly-audit"}
  }'
```

**What to observe:**
- Only the `external-trigger` job runs
- The log echoes the `event_type` (e.g. `run-external-build`) and the entire `client_payload` JSON
- The PAT must have the `repo` scope (classic) or `contents: write` (fine-grained) for the target repo

> The workflow only listens to two `types`: `run-external-build` and `run-external-audit`. POSTing any other `event_type` is a no-op — GitHub still accepts the API call (returns 204) but no workflow runs.

---

## What "skipped" looks like

When the `ci` job fires but `manual-deploy` does not, GitHub shows `manual-deploy` as **Skipped** in the workflow graph. This is expected — it is not a failure. The `if:` condition evaluated to `false`.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| Path filters | Push a `.md`-only change — nothing fires |
| Event routing with `if:` | Each run — only the matching job is not skipped |
| Typed dispatch inputs | Manual run form in the UI |
| PR context vs push context | `PR #` is populated on PR, empty on push |
| External API trigger | `repository_dispatch` — fire workflows from outside GitHub |
