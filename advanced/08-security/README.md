# 08 · Security

This workflow covers three security topics: how secrets are stored and accessed safely, how to lock down `GITHUB_TOKEN` to minimum permissions, and how to authenticate to cloud providers without storing any long-lived credentials.

**Workflow file:** [`.github/workflows/08-security.yml`](../../.github/workflows/08-security.yml)

---

## Jobs in this workflow

| Job | What it covers | Runs without setup? |
|-----|---------------|:---:|
| `secrets-demo` | Secret storage, masking, safe access pattern | ✅ |
| `github-token-demo` | Minimum-permission model, read + write API calls | ✅ |
| `oidc-aws` | Keyless AWS authentication via OIDC | ❌ requires AWS setup |
| `oidc-gcp` | Keyless GCP authentication via OIDC | ❌ requires GCP setup |

---

## How to run

### Trigger on push

The workflow fires on any push that modifies a file under `advanced/08-security/`:

```bash
echo " " >> advanced/08-security/README.md
git add advanced/08-security/README.md
git commit -m "test 08 security"
git push
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"08 - Security"**.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 08-security.yml
```

---

## What to observe

### `secrets-demo` job

**Step: "Use a secret via environment variable"**

Without `API_KEY` configured:
```
API key length: 0
First char:     ***  (masked by GitHub in real runs)
```

With `API_KEY` configured (**Settings → Secrets and variables → Actions → New repository secret**, name `API_KEY`, any value):
```
API key length: 18
First char:     d***  (masked)
```

GitHub automatically masks any value that matches a configured secret — even in `echo` output.

**Step: "Check optional secret"**
```
OPTIONAL_TOKEN not set — skipping optional step
```
This pattern is how you make a step conditional on whether a secret exists, without the workflow failing when the secret is absent.

**Step: "Use GITHUB_TOKEN"**
```
your-org/git-actions-demo
```
`GITHUB_TOKEN` is always available — no secrets to configure. `gh api` authenticates with it automatically via the `GH_TOKEN` env var.

---

### `github-token-demo` job

The job declares explicit permissions:
```yaml
permissions:
  contents: read
  pull-requests: write
```

**Step: "Read repo metadata"**
```json
{
  "name": "git-actions-demo",
  "visibility": "public",
  "language": null
}
```
`contents: read` is sufficient for this API call.

**Step: "Post a comment on the triggering PR"**

This step only runs on `pull_request` events (`if: github.event_name == 'pull_request'`). Trigger the workflow manually or via push and this step will be **skipped**. To see it run:

1. Open a pull request targeting `main` or `master`.
2. The workflow runs automatically — the `github-token-demo` job fires and posts a comment on the PR:
   ```
   CI passed for commit `abc1234` 🎉
   ```
   The `pull-requests: write` permission grants this capability. Remove it and the step fails with a 403.

---

### `oidc-aws` and `oidc-gcp` jobs (cloud setup required)

Without cloud setup these jobs **fail** at the authentication step. That is expected — the `echo` commands that follow are never reached.

To make them work:

#### AWS setup

1. In your AWS account, create an **IAM OIDC Identity Provider**:
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

2. Create an **IAM Role** with a trust policy that allows the GitHub OIDC provider:
   ```json
   {
     "Effect": "Allow",
     "Principal": {
       "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
     },
     "Action": "sts:AssumeRoleWithWebIdentity",
     "Condition": {
       "StringLike": {
         "token.actions.githubusercontent.com:sub": "repo:your-org/git-actions-demo:*"
       }
     }
   }
   ```

3. Update the workflow with your real role ARN:
   ```yaml
   role-to-assume: arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_ROLE_NAME
   ```

4. Uncomment the `aws` commands in the final step.

**Full guide:** [Configuring OIDC in AWS](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

#### GCP setup

1. Create a **Workload Identity Pool** and **Provider** in your GCP project.
2. Bind a **Service Account** to the pool, granting it access to GitHub's token claims.
3. Update the workflow:
   ```yaml
   workload_identity_provider: "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER"
   service_account: "my-sa@my-project.iam.gserviceaccount.com"
   ```

**Full guide:** [Configuring OIDC in GCP](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-google-cloud-platform)

---

## Security practices to notice in the workflow YAML

### Minimum permissions declared at workflow level

```yaml
permissions:
  contents: read   # deny everything except read
```

The `github-token-demo` job then overrides with exactly what it needs:
```yaml
permissions:
  contents: read
  pull-requests: write
```

### Secret passed through env var, not inline

```yaml
# In the workflow:
env:
  API_KEY: ${{ secrets.API_KEY }}
run: echo "length: ${#API_KEY}"
```

The `${{ secrets.API_KEY }}` expression is evaluated by GitHub before the runner executes anything — if the secret value contains shell metacharacters (backticks, `$(...)`), embedding it inline in `run:` would execute them. Passing through `env:` means the shell always treats it as a data value.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| Automatic masking | `secrets-demo` — secret value replaced with `***` in logs |
| Optional secret check | `secrets-demo` — step prints "not set" gracefully |
| `GITHUB_TOKEN` always available | `secrets-demo` — `gh api` call succeeds with no setup |
| Minimum permissions | `github-token-demo` job `permissions:` block |
| PR comment with `write` permission | `github-token-demo` — only fires on PR, posts comment |
| OIDC — no stored credentials | `oidc-aws` / `oidc-gcp` — no secret for cloud creds |
