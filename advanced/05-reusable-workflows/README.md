# 05 · Reusable Workflows

Reusable workflows let you define a workflow once and call it from many other workflows — like a function call across YAML files. This section has two files that work as a pair: a **definition** (the called workflow) and a **caller**.

---

## Files

| File | Role |
|------|------|
| [`05-reusable-called.yml`](../../.github/workflows/05-reusable-called.yml) | **Definition** — declares inputs, secrets, outputs; cannot be run directly |
| [`05-reusable-caller.yml`](../../.github/workflows/05-reusable-caller.yml) | **Caller** — triggers on push/dispatch, calls the definition twice |

---

## How to run

The **called** workflow (`05-reusable-called.yml`) has only a `workflow_call` trigger — it has no `push`, `pull_request`, or `workflow_dispatch` trigger, so it does **not** appear as a runnable workflow in the Actions UI. It can only be invoked by another workflow.

Run the **caller** instead:

### Trigger on push

The caller fires on any push to `main` or `master`:

```bash
git commit --allow-empty -m "test 05 reusable workflows"
git push origin master
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"05 - Reusable Workflow (caller)"** in the sidebar.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 05-reusable-caller.yml
```

---

## Required setup

The called workflow requires a secret named `DEPLOY_TOKEN`. Without it the workflow errors on the `secrets:` validation step.

For a demo run, create a placeholder secret:
1. **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `DEPLOY_TOKEN`, Value: `demo-token-placeholder`.

The demo workflow only prints `"Deploying..."` with the token — it never calls a real API.

---

## What to observe

After triggering, the Actions tab shows one run named **"05 - Reusable Workflow (caller)"**. Expand it to see the workflow graph:

```
deploy-staging  ──────────────────────────────┐
                                               ├──→ notify
deploy-production (needs: deploy-staging) ─────┘
```

### `deploy-staging` job

Open the log. It is actually running inside `05-reusable-called.yml` — the caller delegated to it:

```
Environment: staging
Version:     abc123def456...
Dry run:     true
DRY RUN: would deploy abc123def456... to staging
Smoke testing https://staging.example.com ...
All checks passed
```

`dry_run: true` is hardcoded in the caller for staging.

### `deploy-production` job

This only starts after `deploy-staging` succeeds (`needs: deploy-staging`). It uses `secrets: inherit` instead of named secret forwarding — all caller secrets are passed automatically:

```
Environment: production
Version:     abc123def456...
Dry run:     false
Deploying abc123def456... to production...
Smoke testing https://production.example.com ...
All checks passed
```

### `notify` job

Reads the outputs that the called workflow emitted:
```
Staging URL:    https://staging.example.com
Production URL: https://production.example.com
```

These values were set inside the **called** workflow's `deploy` job via:
```bash
echo "url=https://${{ inputs.environment }}.example.com" >> $GITHUB_OUTPUT
```
and surfaced through the `outputs:` block in the called workflow's `on: workflow_call:` section.

---

## Caller vs called — what can be configured where

| | Called workflow | Caller |
|---|---|---|
| Inputs | Declared with type + `required:` | Provided with `with:` |
| Secrets | Declared with `required:` | Forwarded by name or `secrets: inherit` |
| Outputs | Declared + sourced from a job | Read via `needs.<job>.outputs.<key>` |
| Jobs | Defined here | Cannot add extra steps here |

A job that uses `uses:` to call a reusable workflow **cannot** also have `steps:` — the entire job is delegated.

---

## Reusable workflow vs composite action

| | Reusable Workflow | Composite Action |
|---|---|---|
| **Unit** | Entire workflow (can have multiple jobs) | Single action (multiple steps in one job) |
| **Runner** | Gets its own fresh runner per job | Shares the caller's runner |
| **Secrets** | Must be explicitly forwarded | Inherits caller's environment |
| **Best for** | Full deploy pipelines, multi-job flows | Build steps, setup routines, wrappers |

See [06-custom-actions](../06-custom-actions/) for composite actions.
