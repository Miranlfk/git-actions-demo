# Beginner CI/CD walkthrough

A complete, hands-on tour of a real **CI → CD** pipeline. One workflow builds and publishes a Docker image of the sample calculator app to **GitHub Container Registry (GHCR)**. A second workflow watches for that build to finish, pulls the image, and runs it — that's the deploy.

Two workflows. One trigger between them. Nothing simulated.

**Workflow files:**
- [`.github/workflows/beginner-ci.yml`](../.github/workflows/beginner-ci.yml)
- [`.github/workflows/beginner-cd.yml`](../.github/workflows/beginner-cd.yml)

---

## What this demo does

```
┌─────────────────────────────────────────────────────────────┐
│  Beginner CI — Build and Publish                            │
│                                                             │
│  test ──▶ release ──▶ build-and-publish                     │
│    │          │               │                             │
│  pytest   create GitHub    docker build                     │
│           Release v0.1.0   docker push :v0.1.0 + :latest   │
└────────────────────────────────┬────────────────────────────┘
                                 │ workflow_run trigger
┌────────────────────────────────▼────────────────────────────┐
│  Beginner CD — Deploy from GHCR                             │
│                                                             │
│  deploy                                                     │
│    │                                                        │
│  docker pull :v0.1.0 ──▶ docker run ──▶ verify output      │
└─────────────────────────────────────────────────────────────┘

CI triggers on: push to master (src/tests/beginner-demo changes)
CD triggers on: CI workflow completed (workflow_run)
Both accept: workflow_dispatch for manual runs
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

| Job | Needs | What it does |
|-----|-------|-------------|
| `test` | — | Sets up Python 3.12, installs `pytest`, runs the test suite in `tests/` |
| `release` | `test` | Finds the latest `vX.Y.Z` git tag, increments the patch version, creates a GitHub Release with auto-generated notes |
| `build-and-publish` | `release` | Selects the base image (clean vs vulnerable), logs in to `ghcr.io`, builds, **runs Trivy scan**, pushes only if scan passes |

A failing test blocks the release; a failed scan blocks the push.

### CD — `beginner-cd.yml`

| Job | What it does |
|-----|-------------|
| `deploy` | Logs in to `ghcr.io`, pulls `calculator:latest`, runs the container, prints the calculator output |

The job is guarded by `if: github.event.workflow_run.conclusion == 'success'` — a failed CI run will not trigger a deploy.

---

## Trivy security scan

The `build-and-publish` job runs a **Trivy vulnerability scan** on the Docker image immediately after it is built — before any push to GHCR. If Trivy finds `HIGH` or `CRITICAL` CVEs the step exits non-zero, the push steps are skipped, and the workflow fails.

```
build image → Trivy scan ─── PASS ──▶ push to GHCR
                         └── FAIL ──▶ workflow fails, nothing pushed
```

### Demo the gate

The `workflow_dispatch` trigger exposes a `demo_mode` input:

| `demo_mode` | Base image | Expected scan result |
|-------------|-----------|---------------------|
| `clean` (default) | `python:3.12-slim` | Pass — few or no HIGH/CRITICAL CVEs |
| `vulnerable` | `python:3.8` | Fail — many HIGH/CRITICAL CVEs in the full Python 3.8 image |

**To demo a failing scan:**

1. **Actions** tab → **"Beginner CI - Build and Publish"** → **Run workflow**
2. Set `demo_mode` to **`vulnerable`** → **Run workflow**
3. Watch `build-and-publish` → **Trivy vulnerability scan** print a table of CVEs and fail

**Via CLI:**
```bash
gh workflow run beginner-ci.yml -f demo_mode=vulnerable
```

A push to `master` always runs in `clean` mode (the `inputs` context is empty on push events, so the `if [ ... = "vulnerable" ]` condition is false).

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

- **`test` job:** `5 passed` — the same suite that section 04 uses.
- **`release` job → Create GitHub Release:** prints `Creating release v0.1.0...` (or the next incremented patch). The step outputs the tag name which is passed to the next job.
- **Releases tab** on the repo: a new release appears with auto-generated notes listing the commits since the last release.
- **`build-and-publish` job → Compute lowercase image name:** GHCR requires lowercase, so `Miranlfk/git-actions-demo` becomes `miranlfk/git-actions-demo`.
- **Push step:** two tags pushed — `:v0.1.0` (or whatever the release is) and `:latest`.

### On the repo

- **Releases sidebar** shows the new release with its semver tag.
- **Packages sidebar** shows `calculator` with both version-tagged and `latest` images.
- Click a package tag to see the exact image digest, size, and pull command.

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
| `permissions: contents: write` | CI's `release` job — required to create tags and releases |
| `permissions: packages: write` | CI's `build-and-publish` job — required to push images |
| `permissions: packages: read` | CD's `deploy` job — only needs to pull |
| Job outputs | `release` job exposes `tag:` output; `build-and-publish` reads it via `needs.release.outputs.tag` |
| Auto-incrementing semver | `git tag --sort=-v:refname` + shell arithmetic finds and bumps the latest `vX.Y.Z` tag |
| `gh release create` | GitHub CLI creates the release and tag in one command; `--generate-notes` adds commit-based notes automatically |
| `concurrency:` with `cancel-in-progress: false` | Queues rapid pushes rather than cancelling a half-created release |
| Trivy scan with `exit-code: 1` | Fails the step (and blocks the push) on HIGH/CRITICAL CVEs |
| `--build-arg PYTHON_VERSION` | Dockerfile ARG lets the workflow swap the base image without editing the file |
| `workflow_dispatch` inputs with `type: choice` | Exposes a dropdown in the GitHub UI for the demo toggle |
| `inputs.demo_mode` empty on push | `if [ "${{ inputs.demo_mode }}" = "vulnerable" ]` is false on push events — safe default |
| `workflow_run` trigger | CD workflow's `on:` block — auto-fires when CI completes |
| Conditional based on upstream result | `if: github.event.workflow_run.conclusion == 'success'` in CD |
| Lowercase image name | `tr '[:upper:]' '[:lower:]'` step in both workflows |
| Two tags per push | `:v0.1.x` ties the image to an exact release; `:latest` is what CD deploys |
| Real artifact, real deploy | `docker pull` + `docker run` proves the image works |
