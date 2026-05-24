# 06 · Custom Actions

Custom actions are reusable units that encapsulate logic into a single step. This section contains two local actions and a workflow that uses both.

---

## Files

```
06-custom-actions/
├── composite-action/
│   └── action.yml          ← Composite action (shell steps, no extra runtime)
├── javascript-action/
│   ├── action.yml          ← JavaScript action metadata
│   └── index.js            ← Node.js entry point
└── README.md
```

**Demo workflow:** [`.github/workflows/06-custom-action-demo.yml`](../.github/workflows/06-custom-action-demo.yml)

---

## How to run

### Trigger on push

The workflow fires on any push that modifies any file under `06-custom-actions/`:

```bash
# Edit the composite action to trigger
echo "# comment" >> 06-custom-actions/composite-action/action.yml
git add 06-custom-actions/
git commit -m "test 06 custom actions"
git push
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"06 - Custom Actions Demo"**.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 06-custom-action-demo.yml
```

---

## What to observe

### `use-composite-action` job

The workflow calls the local composite action at `./06-custom-actions/composite-action`:

```yaml
- uses: ./06-custom-actions/composite-action
  with:
    name: "GitHub Actions learner"
    language: "en"
```

Open the job log. You will see the composite action's internal steps listed as expandable groups within the parent step:

**Step: "Run our composite action"**
- Sub-step: *Build greeting* — runs the shell `case` statement, sets `message=Hello, GitHub Actions learner!` as an output, and prints it.
- Sub-step: *Print greeting* — prints `Hello, GitHub Actions learner!`

**Step: "Use the composite action output"**
```
Composite action said: Hello, GitHub Actions learner!
```
This reads `${{ steps.greet.outputs.greeting }}` — the output that the composite action emitted.

Try changing the `language:` input to `es` or `fr` and re-running:
- `es` → `¡Hola, GitHub Actions learner!`
- `fr` → `Bonjour, GitHub Actions learner !`

---

### `use-javascript-action` job

The workflow calls the JavaScript action at `./06-custom-actions/javascript-action`:

```yaml
- uses: ./06-custom-actions/javascript-action
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    message: "Hello from a JS action!"
```

Open the log:

**Step: "Run our JavaScript action"**
```
Message received: Hello from a JS action!
Repository: your-org/git-actions-demo
Actor:      your-username
Action completed successfully
```

**Step: "Use JS action output"**
```
JS action result: Hello from a JS action!
```

The JS action reads its inputs from environment variables (the standard mechanism), emits an output to `$GITHUB_OUTPUT`, and logs to `stdout`.

---

## Understanding local action paths

```yaml
uses: ./06-custom-actions/composite-action
```

The path is always **relative to the repository root**, regardless of where the workflow file lives. The leading `./` is mandatory — without it GitHub tries to resolve it as `owner/repo@ref`.

`actions/checkout@v4` must run first so the workspace is populated. Without it the local action path cannot be found.

---

## How the JavaScript action works without `npm install`

The `index.js` file deliberately avoids importing `@actions/core` from `node_modules` and instead replicates the few functions it needs inline. This means the runner does not need to run `npm install` before using the action.

In a production JavaScript action you would:
1. `npm install @actions/core @actions/github`
2. Bundle with `npx @vercel/ncc build index.js -o dist`
3. Commit the `dist/` folder
4. Set `main: dist/index.js` in `action.yml`

The bundled file includes all dependencies so the runner never needs internet access or `npm`.

---

## Action types at a glance

| Type | Runtime | How to use |
|------|---------|-----------|
| **Composite** | Shell on the runner | `using: "composite"` in `action.yml` |
| **JavaScript** | Node.js on the runner | `using: "node20"` in `action.yml` |
| **Docker** | Container pulled/built per step | `using: "docker"` in `action.yml` |

Docker actions are not included in this demo because they require a Docker daemon and are slow to start — composite and JavaScript actions are preferred for most use cases.
