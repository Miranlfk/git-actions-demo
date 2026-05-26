# 03 · Variables and Expressions

GitHub Actions has a layered variable system and an expression language for reading run metadata. This workflow exercises all three layers in separate jobs so you can see each concept in isolation.

**Workflow file:** [`.github/workflows/03-variables-expressions.yml`](../../.github/workflows/03-variables-expressions.yml)

---

## Jobs in this workflow

| Job | What it shows |
|-----|--------------|
| `variable-scopes` | `env:` at workflow/job/step scope, `GITHUB_ENV`, `GITHUB_PATH`, `vars` context |
| `explore-contexts` | `github`, `runner`, and `steps` contexts printed to the log |
| `expressions` | String functions, status functions, simulated ternary, `hashFiles` |

---

## How to run

### Trigger on push

The workflow fires on any push that modifies a file inside `advanced/03-environment-variables/`:

```bash
# Touch this README to fire it
echo " " >> advanced/03-environment-variables/README.md
git add advanced/03-environment-variables/README.md
git commit -m "test 03 trigger"
git push
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"03 - Variables and Expressions"**.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 03-variables-expressions.yml
```

---

## What to observe

### `variable-scopes` job

Open this job's log and read the steps in order:

**Step: "Show workflow and job-level vars"**
```
APP_NAME (workflow): github-actions-demo
REGION   (job):      us-east-1
```
Both values come from `env:` blocks, one at workflow level, one at job level.

**Step: "Step-level override"**
```
REGION    (step):  eu-west-1
STEP_ONLY (step):  only here
```
`REGION` is now `eu-west-1` because the step's own `env:` shadows the job-level value. `STEP_ONLY` only exists here.

**Step: "After the step, job-level REGION is back"**
```
REGION (job again): us-east-1
STEP_ONLY:          '' (empty — out of scope)
```
The step-level override is gone. This confirms variable scoping is lexical to the step.

**Step: "GITHUB_ENV — persist a variable for later steps"**  
Nothing is printed here — it only writes to `$GITHUB_ENV`.

**Step: "Read the dynamically set variable"**
```
DYNAMIC_VAR: set-at-runtime
BUILD_TIME:  2025-05-24T10:30:00Z
```
`DYNAMIC_VAR` and `BUILD_TIME` were set by the previous step. They persist because `GITHUB_ENV` is a shared file that GitHub reads between steps.

**Step: "vars context"**
```
vars.MY_CONFIG_VALUE: ''
(Empty until you set MY_CONFIG_VALUE in repo settings)
```
To see a real value here:
1. Go to **Settings → Secrets and variables → Actions → Variables → New repository variable**.
2. Name: `MY_CONFIG_VALUE`, Value: `hello`.
3. Re-run the workflow — the step now prints `hello`.

---

### `explore-contexts` job

**Step: "github context"**

Every field printed here is live data about the current run:
```
repository:   your-org/git-actions-demo
event_name:   workflow_dispatch
ref_name:     main
sha:          abc123...
actor:        your-username
run_id:       12345678
run_number:   3
workflow:     03 - Variables and Expressions
server_url:   https://github.com
```
Re-run the workflow and compare `run_number` — it increments each time.

**Step: "runner context"**
```
os:         Linux
arch:       X64
name:       GitHub Actions 2
temp:       /home/runner/work/_temp
tool_cache: /opt/hostedtoolcache
```

**Step: "steps context"**
```
my-step outcome: success
my-step output:  blue
```
The `color=blue` output was written by the previous step (`id: my-step`) with `echo "color=blue" >> $GITHUB_OUTPUT`. The `steps` context lets subsequent steps read it.

---

### `expressions` job

**Step: "Built-in string functions"**
```
contains:   true
startsWith: true
endsWith:   true
format:     Hello your-username!
toJSON:     "workflow_dispatch"
```
These are evaluated at **workflow parse time** by GitHub before the runner executes anything. The result is substituted directly into the shell command.

**Step: "Simulated ternary"**

If the workflow was triggered via `workflow_dispatch`:
```
Target: staging    ← github.ref is the short name (e.g. 'main'/'master'), not 'refs/heads/main' or 'refs/heads/master'
```
If triggered by a push to `refs/heads/main` or `refs/heads/master`:
```
Target: production
```
The pattern `condition && 'a' || 'b'` works because GitHub short-circuits `&&` and `||`.

**Step: "hashFiles"**
```
Hash of requirements: a1b2c3d4e5f6...
```
Change `requirements-test.txt`, re-run, and the hash changes — this is how cache keys are automatically invalidated.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| Variable scope hierarchy | `REGION` changes value across the three scope steps |
| `GITHUB_ENV` persistence | `DYNAMIC_VAR` is set in one step, read in the next |
| `vars` context | `MY_CONFIG_VALUE` — empty until you set it in Settings |
| `github` context | All live run metadata in `explore-contexts` |
| `steps` context | `steps.my-step.outputs.color` in the last step of that job |
| Expression functions | All printed in `expressions` job first step |
| `hashFiles()` | Deterministic hash changes when the file changes |
