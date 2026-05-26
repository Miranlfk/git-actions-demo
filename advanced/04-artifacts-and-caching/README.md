# 04 · Artifacts and Caching

Artifacts pass files between jobs (or let you download them after the run). Caching reuses downloaded dependencies across runs. This workflow demonstrates both in a realistic build → deploy flow.

**Workflow file:** [`.github/workflows/04-artifacts-caching.yml`](../../.github/workflows/04-artifacts-caching.yml)

---

## Jobs in this workflow

| Job | What it does |
|-----|-------------|
| `build-and-test` | Caches pip packages, installs deps, runs pytest with JUnit XML output, uploads test report + build artifact |
| `deploy` | Downloads the build artifact, inspects it, downloads all artifacts |

`deploy` has `needs: build-and-test` so it only starts after the first job succeeds.

---

## How to run

### Trigger on push

The workflow fires on any push that modifies `src/**`, `tests/**`, or `requirements*.txt`:

```bash
# Edit a test file to trigger
echo "# comment" >> tests/test_calculator.py
git add tests/test_calculator.py
git commit -m "test 04 trigger"
git push
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"04 - Artifacts and Caching"**.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 04-artifacts-caching.yml
```

---

## What to observe

### First run — cache miss

Open the `build-and-test` job log. Look at the **"Cache pip packages"** step:
```
Cache not found for input keys: Linux-pip-<hash>
```
The step reports a **cache miss** because no prior run created a cache for this key.

The **"Report cache status"** step confirms:
```
Cache hit: false
```

Pip then downloads and installs pytest from PyPI in the **"Install dependencies"** step.

### Second run — cache hit

Run the workflow again **without changing `requirements-test.txt`**. The cache key (`Linux-pip-<hash>`) is identical, so the cache is restored:

```
Cache restored successfully
```

The **"Report cache status"** step now shows:
```
Cache hit: true
```

The **"Install dependencies"** step still runs but `pip` finds all packages already in `~/.cache/pip` and skips downloading — significantly faster.

> **To force a cache miss:** change `requirements-test.txt` (even adding a blank line). The `hashFiles()` function produces a new hash, the key changes, and the cache is missed.

### Test results

The **"Run tests and produce a JUnit XML report"** step runs:
```
tests/test_calculator.py::test_add            PASSED
tests/test_calculator.py::test_subtract       PASSED
tests/test_calculator.py::test_multiply       PASSED
tests/test_calculator.py::test_divide         PASSED
tests/test_calculator.py::test_divide_by_zero PASSED
5 passed
```

The `--junit-xml=reports/junit.xml` flag writes a machine-readable test report.

### Artifacts

After the run completes:
1. Scroll to the bottom of the run page.
2. Under **Artifacts**, you will see:
   - `test-report-<N>` — the JUnit XML report, kept for 30 days
   - `build-<N>` — the simulated distributable, kept for 7 days

Click either to download a `.zip`. The `test-report` zip contains `junit.xml`. The `build` zip contains `version.txt` (with the commit SHA and build timestamp) and `calculator.py`.

**The test report always uploads** (`if: always()`) — even if tests fail. This ensures you can always download the report to debug failures.

### The `deploy` job

Watch the log:
```
=== Release contents ===
-rw-r--r-- calculator.py
-rw-r--r-- version.txt

version=abc123...
built=2025-05-24T10:30:00Z

Deploying build 5 to staging...
```

The `deploy` job has its own fresh runner — it cannot access `build-and-test`'s filesystem. Everything comes from the downloaded artifact.

The final step downloads **all** artifacts and lists them:
```
all-artifacts/build-5/calculator.py
all-artifacts/build-5/version.txt
all-artifacts/test-report-5/junit.xml
```

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| Cache miss on first run | "Cache pip packages" step reports `Cache not found` |
| Cache hit on second run | "Cache pip packages" reports `Cache restored` |
| Cache key with `hashFiles` | Change `requirements-test.txt` to bust the cache |
| `if: always()` on upload | Test report uploads even when tests fail |
| Artifact retention | `test-report` = 30 days, `build` = 7 days |
| `needs:` dependency | `deploy` is blocked until `build-and-test` succeeds |
| Downloading by name | `deploy` fetches only `build-<N>` |
| Downloading all artifacts | Last step in `deploy` gets everything via omitted `name:` |
