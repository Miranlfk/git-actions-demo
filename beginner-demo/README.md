# Beginner CI/CD walkthrough

A complete, hands-on tour of a real **CI → CD** pipeline. One workflow builds and publishes a Docker image of the sample calculator app to **GitHub Container Registry (GHCR)**. A second workflow watches for that build to finish, pulls the image, and runs it — that's the deploy.

Two workflows. One trigger between them. Nothing simulated.

**Workflow files:**
- [`.github/workflows/beginner-ci.yml`](../.github/workflows/beginner-ci.yml)
- [`.github/workflows/beginner-cd.yml`](../.github/workflows/beginner-cd.yml)

---

## What this demo does

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Beginner CI             │         │  Beginner CD             │
│  Build and Publish       │ ──────▶ │  Deploy from GHCR        │
│                          │workflow │                          │
│  1. Run pytest           │  _run   │  1. Pull image from GHCR │
│  2. Build Docker image   │ trigger │  2. docker run image     │
│  3. Push image to GHCR   │         │  3. Verify output        │
└──────────────────────────┘         └──────────────────────────┘
        triggers on:                       triggers on:
        push to main                       CI workflow completed
        workflow_dispatch                  workflow_dispatch
```

The two workflows are wired together by the [`workflow_run`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run) event: when CI finishes successfully, CD starts automatically. No shared secrets, no polling — GitHub fires the event itself.

---

## Files in this demo

| File | Purpose |
|------|---------|
| [`Dockerfile`](./Dockerfile) | Packages `src/calculator.py` + `app.py` into a tiny Python image |
| [`app.py`](./app.py) | Entry point that exercises the calculator so `docker run` produces visible output |
| [`../.github/workflows/beginner-ci.yml`](../.github/workflows/beginner-ci.yml) | Test → build → publish to GHCR |
| [`../.github/workflows/beginner-cd.yml`](../.github/workflows/beginner-cd.yml) | Pull from GHCR → run the container |

---

## Jobs

### CI — `beginner-ci.yml`

| Job | What it does |
|-----|-------------|
| `test` | Sets up Python 3.12, installs `pytest`, runs the existing test suite in `tests/` |
| `build-and-publish` | Logs in to `ghcr.io` with `GITHUB_TOKEN`, builds the Docker image, pushes two tags: `:<sha>` and `:latest` |

`build-and-publish` needs `test` — a failing test blocks the publish.

### CD — `beginner-cd.yml`

| Job | What it does |
|-----|-------------|
| `deploy` | Logs in to `ghcr.io`, pulls `calculator:latest`, runs the container, prints the calculator output |

The job is guarded by `if: github.event.workflow_run.conclusion == 'success'` — a failed CI run will not trigger a deploy.

---

## Prerequisites

None beyond a forked copy of this repo. The CI workflow uses the built-in `GITHUB_TOKEN`, which is automatically provided to every workflow — no secrets to configure.

---

## How to run

### 1. Trigger CI by pushing to `main`

Any change under `src/`, `tests/`, or `beginner-demo/` on the default branch fires the CI workflow:

```bash
git commit --allow-empty -m "test beginner CI"
git push origin main
```

Or trigger it manually:

```bash
gh workflow run beginner-ci.yml
```

Open the **Actions** tab and watch **"Beginner CI - Build and Publish"** run:

1. `test` job — installs pytest, runs 5 tests
2. `build-and-publish` job — logs in to GHCR, builds, pushes

When the second job finishes, your repository's **Packages** sidebar shows a new `calculator` package.

### 2. CD triggers automatically

Within roughly 10–30 seconds of CI succeeding, **"Beginner CD - Deploy from GHCR"** starts on its own. Watch its `deploy` job:

```
=== Running container ghcr.io/<owner>/git-actions-demo/calculator:latest ===
=== Calculator container running ===
add(2, 3)       = 5
subtract(10, 4) = 6
multiply(3, 4)  = 12
divide(10, 2)   = 5.0
=== Done ===
Deployed ghcr.io/<owner>/git-actions-demo/calculator:latest successfully
```

That output is the calculator running *from the image you just published* — proof the publish and the deploy both work end-to-end.

You can also trigger CD manually (useful for re-deploying the current `:latest` tag without rebuilding):

```bash
gh workflow run beginner-cd.yml
```

### 3. (Optional) Make the package public

GHCR images are **private by default**, scoped to the repo's collaborators. CD still works because it authenticates with `GITHUB_TOKEN`, but anyone outside the repo can't `docker pull` it.

To make it world-readable:

1. Open your repo on github.com → **Packages** sidebar → click **`calculator`**.
2. **Package settings** → scroll to **Danger Zone** → **Change visibility** → **Public**.

Then anyone can:

```bash
docker pull ghcr.io/<owner>/git-actions-demo/calculator:latest
docker run --rm ghcr.io/<owner>/git-actions-demo/calculator:latest
```

---

## `workflow_run` gotchas

The `workflow_run` trigger is powerful but has two quirks worth knowing:

1. **The CD workflow file must already exist on the default branch.** A PR that *adds* `beginner-cd.yml` won't make it fire — merge to `main` first, then push another commit to trigger CI.
2. **`workflow_run` always uses the version of the workflow file from the default branch**, not from the commit that triggered CI. Editing `beginner-cd.yml` on a feature branch has no effect until merged.

Both behaviours are intentional — they prevent a malicious PR from rewriting your deploy logic.

---

## What to observe

### In the CI run

- **`test` job log:** `5 passed` — the same suite that section 04 uses.
- **`build-and-publish` job → Compute lowercase image name:** prints the final image name. GHCR requires lowercase, so `Miranlfk/git-actions-demo` becomes `miranlfk/git-actions-demo`.
- **Login step:** `Login Succeeded`.
- **Build step:** Docker prints layer hashes as it builds.
- **Push step:** Each layer uploads, then the manifest. Two tags pushed: `:<sha>` and `:latest`.

### On the repo

- **Packages sidebar** on the repo home page shows `calculator`.
- Click it → see all tags, pull command, total size.

### In the CD run

- **Run header:** "Triggered by Beginner CI - Build and Publish #N" — the link back to the CI run.
- **Pull step:** Docker downloads the image layers from GHCR.
- **Deploy step:** the calculator output above.

### Failure paths

- **Failing test** → CI's `build-and-publish` is skipped (because of `needs: test`) → CD is skipped (because the `conclusion == 'success'` guard is false).
- **Image push fails** (e.g., missing `packages: write` permission) → CI run fails → CD is skipped.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| `GITHUB_TOKEN` for GHCR auth | Login step in both workflows |
| `permissions: packages: write` | CI's `build-and-publish` job — required to push |
| `permissions: packages: read` | CD's `deploy` job — only needs to pull |
| `workflow_run` trigger | CD workflow's `on:` block — auto-fires when CI completes |
| Conditional based on upstream result | `if: github.event.workflow_run.conclusion == 'success'` in CD |
| Lowercase image name | `tr '[:upper:]' '[:lower:]'` step in both workflows |
| Two tags per push | `:<sha>` for traceability, `:latest` for the deploy target |
| Real artifact, real deploy | `docker pull` + `docker run` proves the image works |
