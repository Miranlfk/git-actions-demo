# 02 · Jobs

Jobs are the top-level units of work in a workflow. They run on fresh, isolated runners and are parallel by default. This workflow demonstrates four major job patterns together.

**Workflow file:** [`.github/workflows/02-jobs.yml`](../.github/workflows/02-jobs.yml)

---

## Jobs in this workflow

| Job | Pattern | What it does |
|-----|---------|-------------|
| `matrix-test` | Matrix strategy | Runs pytest across 2 Ubuntu variants × 2 Python versions (4 jobs) |
| `conditions-demo` | `if:` conditions | Shows step-level and job-level conditions activating |
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

### Conditions (`conditions-demo`)

Open the `conditions-demo` job log. Step outcomes change depending on how you triggered it:

| Step | Fires on push | Fires on manual |
|------|:---:|:---:|
| Always runs | ✅ | ✅ |
| Only on push to main | ✅ (if branch is main) | ❌ skipped |
| Only on manual dispatch | ❌ skipped | ✅ |
| Runs only if output == 'ok' | ✅ | ✅ |
| always() — runs even on failure | ✅ | ✅ |

Skipped steps are listed in the log with a grey **skipped** badge next to them. They are not failures.

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
| `if:` on a step | `conditions-demo` — different steps active per trigger type |
| `always()` | `report` job always runs, `conditions-demo` last step always runs |
| Job `outputs:` | `unit-tests` emits `result=passed`; `report` reads it via `needs.unit-tests.outputs.result` |
| `needs:` | `report` waits for the fan-out jobs; visible as arrows in the workflow graph |
| `concurrency:` | Rapid successive pushes cancel the queued run |
