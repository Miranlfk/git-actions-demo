# 10 · Monitoring, Notifications, and Debugging

GitHub Actions provides several built-in mechanisms to communicate results, surface warnings, and debug failures — without needing external tools. This workflow exercises all of them.

**Workflow file:** [`.github/workflows/10-monitoring.yml`](../.github/workflows/10-monitoring.yml)

---

## Jobs in this workflow

| Job | Fires when | What it does |
|-----|-----------|-------------|
| `step-summary` | Always | Writes a Markdown summary, emits annotations, logs a debug message |
| `notify-on-failure` | `step-summary` fails | Sends a Slack webhook message |
| `notify-on-success` | `step-summary` succeeds | Logs a success message (hooks for Slack/commit comment) |

---

## How to run

### Trigger on push to main

The workflow fires on any push to `main` that modifies a file under `10-monitoring/`:

```bash
echo " " >> 10-monitoring/README.md
git add 10-monitoring/README.md
git commit -m "test 10 monitoring"
git push origin main
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"10 - Monitoring and Notifications"**.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 10-monitoring.yml
```

---

## What to observe

### Step summary

After the run completes, click on the run name to open it. Below the job graph, you will see a **Summary** tab (or scroll down past the job list). It renders a Markdown table:

```
## Build Summary

| Step     | Status |
|----------|--------|
| Checkout | ✅     |
| Lint     | ✅     |
| Test     | ✅     |
| Build    | ✅     |

Commit: `abc123def...`
Branch: main
Actor:  your-username
```

This is written by appending Markdown to `$GITHUB_STEP_SUMMARY`. It renders on the run page for anyone who opens the run — useful as a human-readable report without opening individual job logs.

---

### Annotations

Open the `step-summary` job log and look at the **"Emit workflow commands"** step. In the raw log you will see:

```
::notice file=README.md,line=1::This is an informational annotation
::warning file=README.md,line=1::This is a warning annotation
```

GitHub transforms these `::` prefixed lines into **annotations** that appear in:
- The job log alongside the step that emitted them
- The run summary page (as a collapsible "Annotations" section)
- The **Files Changed** tab on a pull request (if the file referenced is in the diff)

Three annotation levels:
```bash
echo "::notice  file=src/app.py,line=10::Info message"
echo "::warning file=src/app.py,line=20::Deprecation warning"
echo "::error   file=src/app.py,line=30::Build error"
```

---

### Debug logging

**Step: "Debug logging"** emits:
```
Debug mode: false
::debug::This message only appears when debug logging is enabled
```

The `::debug::` line is **invisible** in the log unless debug logging is enabled. To enable it:

1. **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `ACTIONS_STEP_DEBUG`, Value: `true`.
3. Re-run the workflow — the debug line becomes visible.

A second secret, `ACTIONS_RUNNER_DEBUG` = `true`, enables verbose runner-level logging (Docker setup, file copies, environment dumps). This produces a large amount of output and is usually only needed when diagnosing runner infrastructure issues.

---

### Failure notification (`notify-on-failure` job)

This job has `if: failure()` — it only runs when `step-summary` has failed. In normal operation it is **skipped**.

To see it run:
1. Temporarily break the `step-summary` job by adding a failing step:
   ```yaml
   - name: Force failure
     run: exit 1
   ```
2. Push the change, trigger the workflow, and watch `notify-on-failure` activate.
3. Without `SLACK_WEBHOOK_URL` configured, it prints:
   ```
   SLACK_WEBHOOK_URL not configured — skipping notification
   ```
4. With a webhook configured (**Settings → Secrets → `SLACK_WEBHOOK_URL`** = your Slack incoming webhook URL), it sends a formatted message:
   ```
   ❌ Workflow "10 - Monitoring and Notifications" failed on `main`
   Repository: your-org/git-actions-demo
   Actor:      your-username
   Run URL:    https://github.com/...
   ```

**To get a Slack webhook URL:**
1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps).
2. Enable **Incoming Webhooks** and add it to a channel.
3. Copy the webhook URL and save it as the `SLACK_WEBHOOK_URL` secret.

---

### Success notification (`notify-on-success` job)

This job has `if: success()` and runs after `step-summary` succeeds. In the demo it only logs to the console. In a real workflow you would:
- Post a commit comment via `github.rest.repos.createCommitComment`
- Update a Slack message (using the message timestamp to edit rather than post new)
- Trigger a downstream notification system

---

## Status badge

Add a live badge to any Markdown file by embedding this URL (replace `{owner}` and `{repo}`):

```markdown
![10 - Monitoring](https://github.com/{owner}/{repo}/actions/workflows/10-monitoring.yml/badge.svg)
```

The badge turns red when the last run on the default branch failed and green when it passed. Append `?branch=main` to lock it to a specific branch.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| `$GITHUB_STEP_SUMMARY` | Summary tab on the run page — Markdown table |
| `::notice::` / `::warning::` | Annotations section on run + Files Changed on PR |
| `::debug::` | Invisible unless `ACTIONS_STEP_DEBUG=true` secret is set |
| `if: failure()` | `notify-on-failure` — only activates when upstream fails |
| `if: success()` | `notify-on-success` — only activates when upstream passes |
| Slack webhook | `notify-on-failure` — sends formatted failure alert |
| Status badge | Markdown embed using the workflow's badge URL |
