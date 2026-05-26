# 02 · Jobs

Jobs are the top-level units of work in a workflow. They run on fresh, isolated runners and are parallel by default. This workflow demonstrates four major job patterns together.

**Workflow file:** [`.github/workflows/02-jobs.yml`](../../.github/workflows/02-jobs.yml)

---

## Jobs in this workflow

| Job | Pattern | What it does |
|-----|---------|-------------|
| `matrix-test` | Matrix strategy | Runs pytest across 2 Ubuntu variants × 2 Python versions (4 jobs) |
| `matrix-include-exclude` | Matrix `include` / `exclude` | Same base grid + one excluded combo + one experimental include |
| `conditions-demo` | `if:` + `continue-on-error` + `timeout-minutes` | Step-level conditions, non-blocking failures, time caps |
| `unit-tests` | Fan-out (parallel) | Runs pytest, emits a job output |
| `lint` | Fan-out (parallel) | Runs pyflakes, emits a job output |
| `report` | Fan-in | Waits for `unit-tests` + `lint`, aggregates results |

---

## How to run

### Trigger on push

The workflow fires on any push that modifies `src/**` or `tests/**`:

```bash
# Edit a source file and push
echo "# comment" >> src/calculator.py
git add src/calculator.py
git commit -m "test 02-jobs trigger"
git push
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"02 - Jobs"** in the sidebar.
2. Click **"Run workflow"** → **"Run workflow"** (no inputs required).

**Via CLI:**
```bash
gh workflow run 02-jobs.yml
```

---

## What to observe

### Matrix jobs (`matrix-test`)

After triggering, open the run and expand the job list. You will see **4 separate jobs** all named with the pattern `Test / <os> / py<version>`:

```
Test / ubuntu-latest  / py3.11   ✅
Test / ubuntu-latest  / py3.12   ✅
Test / ubuntu-22.04   / py3.11   ✅
Test / ubuntu-22.04   / py3.12   ✅
```

- `fail-fast: false` means all 4 continue even if one fails. Remove it and break a test to see early-exit behaviour.
- Each job prints its `OS` and `Python` version at the end of its log so you can verify the matrix values are correct.
- `timeout-minutes: 10` caps each leg — a hung pytest can't block the runner forever.

### Matrix `include` / `exclude` (`matrix-include-exclude`)

The base grid is `{ubuntu-latest, ubuntu-22.04} × {3.10, 3.11, 3.12}` = **6 legs**. The strategy then:

- **excludes** `(ubuntu-22.04, 3.10)` — drops to 5 legs
- **includes** `(ubuntu-latest, 3.13, experimental=true)` — adds 1 leg with an extra parameter that doesn't exist in the base grid

Final job list (6 legs):

```
Advanced / ubuntu-latest / py3.10
Advanced / ubuntu-latest / py3.11
Advanced / ubuntu-latest / py3.12
Advanced / ubuntu-latest / py3.13 (experimental)
Advanced / ubuntu-22.04  / py3.11
Advanced / ubuntu-22.04  / py3.12
```

The experimental leg uses `continue-on-error: ${{ matrix.experimental == true }}` so a failure there doesn't fail the workflow — useful when adding bleeding-edge versions before they are officially supported.

> **Rule of thumb:** use `exclude:` to remove combinations from the cartesian product, and `include:` to add extra combinations (often with extra parameters) that are not in the cartesian product.

### Conditions (`conditions-demo`)

Open the `conditions-demo` job log. Step outcomes change depending on how you triggered it:

| Step | Fires on push | Fires on manual |
|------|:---:|:---:|
| Always runs | ✅ | ✅ |
| Only on push to main/master | ✅ (if branch is main/master) | ❌ skipped |
| Only on manual dispatch | ❌ skipped | ✅ |
| Runs only if output == 'ok' | ✅ | ✅ |
| Step with timeout-minutes | ✅ | ✅ |
| Non-blocking step (continue-on-error) | ✅ (fails, ignored) | ✅ (fails, ignored) |
| Runs after the failing step | ✅ | ✅ |
| always() — runs even on failure | ✅ | ✅ |

Skipped steps are listed in the log with a grey **skipped** badge next to them. They are not failures.

**About `continue-on-error`:** the step shows as ❌ in the UI but the job result stays ✅. Use this for non-blocking checks (lint warnings, coverage reports, experimental tooling) where you want signal in the logs but not a red build. Different from `if: failure()` — that *runs only on failure*, this *tolerates a failure*.

**About `timeout-minutes`:** can be set at step level (cap one slow command) or job level (cap the entire job — see `matrix-test`). The default job timeout is 6 hours, which is rarely what you want.

### Fan-out / fan-in (`unit-tests`, `lint`, `report`)

- `unit-tests` and `lint` start at the same time (parallel).
- `report` starts only after **both** complete (the `needs:` dependency).
- Open the **report** job log:
  ```
  === CI Report ===
  Unit tests: passed  (job: success)
  Lint:       passed  (job: success)
  All checks passed
  ```
- `if: always()` on `report` means it runs even if one of the upstream jobs fails, so you always see the aggregated result.

To see a failure in action, intentionally break `src/calculator.py`:
```bash
echo "this is not valid python!!!" >> src/calculator.py
git add src/calculator.py && git commit -m "break it" && git push
```
Watch `unit-tests` fail, `lint` fail, and `report` still run but exit non-zero.

### Concurrency

The workflow-level `concurrency:` block cancels the in-flight run if you push again before it finishes:

```bash
git commit --allow-empty -m "push 1" && git push
git commit --allow-empty -m "push 2" && git push
```

Go to the Actions tab — "push 1" run is cancelled automatically.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| `fail-fast: false` | Matrix — all 4 legs finish even after one fails |
| Matrix OS list | Only `ubuntu-latest` and `ubuntu-22.04` appear in the job list |
| `matrix: include / exclude` | `matrix-include-exclude` — final job list = base grid − excludes + includes |
| `continue-on-error` (job) | Experimental leg in `matrix-include-exclude` can fail without failing the workflow |
| `continue-on-error` (step) | `conditions-demo` — a failing step is tolerated, next step still runs |
| `timeout-minutes` | `matrix-test` (job-level) and `conditions-demo` (step-level) |
| `if:` on a step | `conditions-demo` — different steps active per trigger type |
| `always()` | `report` job always runs, `conditions-demo` last step always runs |
| Job `outputs:` | `unit-tests` emits `result=passed`; `report` reads it via `needs.unit-tests.outputs.result` |
| `needs:` | `report` waits for the fan-out jobs; visible as arrows in the workflow graph |
| `concurrency:` | Rapid successive pushes cancel the queued run |
