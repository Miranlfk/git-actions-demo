# 06 · Custom Actions

Custom actions are reusable units that encapsulate logic into a single step. This section contains all three GitHub-supported action types as local actions and a workflow that uses all three.

---

## Files

```
06-custom-actions/
├── composite-action/
│   └── action.yml          ← Composite action (shell steps, no extra runtime)
├── javascript-action/
│   ├── action.yml          ← JavaScript action metadata
│   └── index.js            ← Node.js entry point
├── docker-action/
│   ├── action.yml          ← Docker action metadata
│   ├── Dockerfile          ← Image built per first use, then cached
│   └── entrypoint.sh       ← Container entrypoint script
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

### `use-docker-action` job

The workflow calls the Docker action at `./06-custom-actions/docker-action`:

```yaml
- uses: ./06-custom-actions/docker-action
  with:
    name: "GitHub Actions learner"
    language: "es"
```

Open the log:

**Step: "Build /06-custom-actions/docker-action/Dockerfile"** (auto-injected by the runner)
- The runner builds the image from the local Dockerfile on the first run. Subsequent runs on the same runner reuse the cached image.

**Step: "Run our Docker action"**
```
¡Hola, GitHub Actions learner! (from Docker)
```

**Step: "Use Docker action output"**
```
Docker action said ¡Hola, GitHub Actions learner! (from Docker)
```

The action runs inside an Alpine container. Inputs are passed positionally via `args:` in `action.yml` (not as env vars like the JS action). Outputs are written to `$GITHUB_OUTPUT`, a file the runner mounts into the container — exactly the same protocol as composite/JS actions.

> **Linux only.** Docker actions cannot run on macOS or Windows runners. The job pin to `ubuntu-latest` is mandatory.

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

| Type | Runtime | OS support | Best for |
|------|---------|------------|----------|
| **Composite** | Shell on the runner | All | Sequences of existing shell/CLI steps; thinnest wrapper |
| **JavaScript** | Node.js on the runner | All | Logic that benefits from a real programming language and the [`@actions/*`](https://github.com/actions/toolkit) toolkit |
| **Docker** | Container built or pulled by the runner | Linux only | Polyglot tooling, system dependencies, or a pinned reproducible runtime |

**Cold-start cost:** composite ≈ instant · JavaScript ≈ instant (toolkit is small) · Docker ≈ 10–60s for the first image build, near-instant when cached. Pin a tagged image (`image: "ghcr.io/owner/img:1.2.3"`) instead of `Dockerfile` to skip the build entirely.
