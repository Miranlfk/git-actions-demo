# GitHub Actions Demo

A hands-on reference repo covering all major GitHub Actions features. Fork it, run the workflows, and read the section READMEs to understand every detail.

> **Official docs:** [docs.github.com/en/actions](https://docs.github.com/en/actions) - check this

---

## Prerequisites

- A **GitHub account** — the free tier is sufficient for all examples.
- The **GitHub CLI** (`gh`) for command-line triggering: [cli.github.com](https://cli.github.com)
- Authenticate once: `gh auth login`

Some workflows require optional one-time setup (secrets, environments). Each section README documents exactly what is needed and what happens when it is absent.

---

## Repository structure

```
.github/workflows/     ← 13 runnable workflow files
beginner-demo/         ← Start-here CI/CD walkthrough (publish to GHCR + deploy)
advanced/              ← Advanced topics, one section per directory
  01-triggers/           ← Section README (concept notes + run instructions)
  02-jobs/
  03-environment-variables/
  04-artifacts-and-caching/
  05-reusable-workflows/
  06-custom-actions/     ← README + composite-action/ + javascript-action/ + docker-action/
  07-deployment/
  08-security/
  09-containers/
  10-monitoring/
src/                   ← Sample Python app used by CI workflows
tests/                 ← pytest suite (5 tests)
requirements-test.txt  ← pytest dependency
```

---

## Start here: Beginner CI/CD walkthrough

New to GitHub Actions? Start with **[beginner-demo/](./beginner-demo/)** for a complete end-to-end pipeline: one workflow builds and publishes a Docker image of the sample app to GitHub Container Registry, and a separate workflow auto-triggers, pulls the image, and runs it. Real artifact, real deploy, no extra setup — uses only the built-in `GITHUB_TOKEN`.

```bash
gh workflow run beginner-ci.yml
```

---

## Advanced sections and how to run each workflow

Each section under [`advanced/`](./advanced/) has a detailed README. The table below summarises the fastest way to trigger each workflow.

### [01 · Triggers](./advanced/01-triggers/)
**Workflow:** [`01-triggers.yml`](.github/workflows/01-triggers.yml)

| Trigger | How |
|---------|-----|
| Push (`ci` job) | Push any non-`.md` change to `main`, `master`, or `feature/**` |
| Pull request (`ci` job) | Open a PR targeting `main` or `master` |
| Manual (`manual-deploy` job) | Actions tab → "01 - Triggers" → Run workflow → pick environment + dry_run |
| Release (`publish` job) | Create and publish a GitHub Release |
| Schedule (`scheduled-audit` job) | Fires automatically every Monday 08:00 UTC |
| External API (`external-trigger` job) | `gh api repos/:owner/:repo/dispatches -f event_type=run-external-build` |

```bash
# Quickest manual trigger
gh workflow run 01-triggers.yml -f environment=staging -f dry_run=true
```

---

### [02 · Jobs](./advanced/02-jobs/)
**Workflow:** [`02-jobs.yml`](.github/workflows/02-jobs.yml)

Triggers on push to `src/**` or `tests/**`, or manually.

```bash
gh workflow run 02-jobs.yml
```

What runs: a 4-job matrix (ubuntu-latest + ubuntu-22.04 × 2 Python versions), an advanced matrix using `include` / `exclude` plus a `continue-on-error` experimental leg, a conditions demo with `timeout-minutes` and step-level `continue-on-error`, two parallel fan-out jobs (`unit-tests` + `lint`), and a fan-in `report` job. Workflow-level `concurrency:` cancels superseded runs.

---

### [03 · Variables and Expressions](./advanced/03-environment-variables/)
**Workflow:** [`03-variables-expressions.yml`](.github/workflows/03-variables-expressions.yml)

Triggers on push to `advanced/03-environment-variables/**`, or manually.

```bash
gh workflow run 03-variables-expressions.yml
```

What runs: three jobs demonstrating variable scopes, all major contexts, and expression functions. No setup required — results are visible in the logs.

---

### [04 · Artifacts and Caching](./advanced/04-artifacts-and-caching/)
**Workflow:** [`04-artifacts-caching.yml`](.github/workflows/04-artifacts-caching.yml)

Triggers on push to `src/**`, `tests/**`, or `requirements*.txt`, or manually.

```bash
gh workflow run 04-artifacts-caching.yml
```

What runs: `build-and-test` (caches pip, runs pytest, uploads test report + build artifact) then `deploy` (downloads and inspects the artifact). Run twice to see the cache hit on the second run.

---

### [05 · Reusable Workflows](./advanced/05-reusable-workflows/)
**Caller workflow:** [`05-reusable-caller.yml`](.github/workflows/05-reusable-caller.yml)  
**Called workflow:** [`05-reusable-called.yml`](.github/workflows/05-reusable-called.yml) ← cannot be triggered directly

**Required setup:** Add a repository secret named `DEPLOY_TOKEN` (any value) before running.

```bash
gh secret set DEPLOY_TOKEN --body "demo-token-placeholder"
gh workflow run 05-reusable-caller.yml
```

What runs: the caller invokes the reusable deploy workflow twice — once for staging (dry-run) and once for production — then reads the deployment URLs from the outputs.

---

### [06 · Custom Actions](./advanced/06-custom-actions/)
**Workflow:** [`06-custom-action-demo.yml`](.github/workflows/06-custom-action-demo.yml)

Triggers on push to `advanced/06-custom-actions/**`, or manually.

```bash
gh workflow run 06-custom-action-demo.yml
```

What runs: three jobs — one using the local composite action (greeting with language input), one using the local JavaScript action, and one using a Docker container action built from a local Dockerfile. No setup required. Docker action runs on Linux only.

---

### [07 · Deployment with Environments](./advanced/07-deployment/)
**Workflow:** [`07-deployment.yml`](.github/workflows/07-deployment.yml)

Triggers on push to `main` or `master`, or manually.

```bash
gh workflow run 07-deployment.yml
```

Works without setup, but to see the full experience (approval gates, environment secrets):
1. Create `staging` and `production` environments in **Settings → Environments**.
2. Add yourself as a required reviewer on `production`.
3. Push to `main` or `master` — the workflow pauses before the production job waiting for your approval.

---

### [08 · Security](./advanced/08-security/)
**Workflow:** [`08-security.yml`](.github/workflows/08-security.yml)

Triggers on push to `advanced/08-security/**`, or manually.

```bash
gh workflow run 08-security.yml
```

`secrets-demo` and `github-token-demo` jobs run without setup. The `oidc-aws` and `oidc-gcp` jobs require cloud-side OIDC configuration — they will fail until you replace the placeholder ARNs/identifiers. See the [section README](./advanced/08-security/) for step-by-step cloud setup.

---

### [09 · Containers](./advanced/09-containers/)
**Workflow:** [`09-containers.yml`](.github/workflows/09-containers.yml)

Triggers on push to `advanced/09-containers/**`, or manually. No setup required.

```bash
gh workflow run 09-containers.yml
```

What runs: `job-in-container` (entire job inside `node:20-alpine`) and `tests-with-postgres` (Postgres 16 + Redis 7 sidecars with health checks, connection verified with `psql` and `redis-cli`).

---

### [10 · Monitoring](./advanced/10-monitoring/)
**Workflow:** [`10-monitoring.yml`](.github/workflows/10-monitoring.yml)

Triggers on push to `main` or `master` when `advanced/10-monitoring/**` changes, or manually.

```bash
gh workflow run 10-monitoring.yml
```

What runs: `step-summary` (writes a Markdown summary, emits notice/warning annotations, logs a debug message), and conditionally `notify-on-failure` / `notify-on-success`.

Optional: set the `SLACK_WEBHOOK_URL` secret to receive Slack failure alerts. Set `ACTIONS_STEP_DEBUG=true` to make debug log lines visible.

---

## Sample app and tests

The `src/` and `tests/` directories provide a minimal Python project that several CI workflows actually run against.

| File | Purpose |
|------|---------|
| [`src/calculator.py`](src/calculator.py) | Four arithmetic functions |
| [`tests/test_calculator.py`](tests/test_calculator.py) | 5 pytest tests, including an error case |
| [`requirements-test.txt`](requirements-test.txt) | `pytest>=8.0` |

Run locally:
```bash
pip install -r requirements-test.txt
pytest tests/ -v
```

See [tests/README.md](tests/README.md) for more details on how the workflows use these tests.

---

## Secrets and variables reference

| Name | Used by | Where to set | Required? |
|------|---------|-------------|-----------|
| `DEPLOY_TOKEN` | 05-reusable-caller | Repo secrets | Yes (for 05) |
| `API_KEY` | 08-security | Repo secrets | No — demo still runs |
| `OPTIONAL_TOKEN` | 08-security | Repo secrets | No |
| `STAGING_API_KEY` | 07-deployment | `staging` env secrets | No — demo still runs |
| `PROD_API_KEY` | 07-deployment | `production` env secrets | No — demo still runs |
| `SLACK_WEBHOOK_URL` | 10-monitoring | Repo secrets | No — notification skipped if absent |
| `ACTIONS_STEP_DEBUG` | 10-monitoring | Repo secrets | No — set to `true` to enable debug logs |

---

## Contributing

PRs are welcome. Follow the existing pattern: a numbered directory with a `README.md` explaining concepts and detailed run instructions, plus a correspondingly-named workflow file. Keep each workflow focused on one topic so it is easy to read start-to-finish.

---

## License

[MIT](./LICENSE)
