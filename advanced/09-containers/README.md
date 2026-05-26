# 09 · Containers

GitHub Actions supports two container patterns: running the entire job inside a Docker image, and attaching sidecar service containers (databases, caches) to a job. This workflow demonstrates both.

**Workflow file:** [`.github/workflows/09-containers.yml`](../../.github/workflows/09-containers.yml)

---

## Jobs in this workflow

| Job | Pattern | Container(s) |
|-----|---------|-------------|
| `job-in-container` | Job container | `node:20-alpine` — entire job runs inside it |
| `tests-with-postgres` | Service containers | `postgres:16` + `redis:7-alpine` as sidecars |

---

## How to run

No setup is required — all Docker images are pulled from Docker Hub automatically.

### Trigger on push

The workflow fires on any push that modifies a file under `advanced/09-containers/`:

```bash
echo " " >> advanced/09-containers/README.md
git add advanced/09-containers/README.md
git commit -m "test 09 containers"
git push
```

### Trigger manually

**Via GitHub UI:**
1. **Actions** tab → **"09 - Containers"**.
2. Click **"Run workflow"** → **"Run workflow"**.

**Via CLI:**
```bash
gh workflow run 09-containers.yml
```

---

## What to observe

### `job-in-container` job

The entire job runs inside `node:20-alpine`. Before the first step executes, the runner pulls the image and starts the container. This takes a few extra seconds on the first run (subsequent runs may be faster if the image is cached on the hosted runner pool).

**Step: "Verify we are inside the container"**
```
Node: v20.x.x
OS:   PRETTY_NAME="Alpine Linux v3.x"
User: root
```

The runner is executing shell commands **inside** the container, not on the host Ubuntu VM. The Alpine OS and Node binary come from the image.

**Step: "Run tests inside container"**
```
v20.x.x
Tests would run here
```

In a real workflow you would replace this with `npm test`. The key benefit is that the environment is guaranteed to match the image exactly — no "works on my machine" drift.

---

### `tests-with-postgres` job

The runner starts two sidecar containers (`postgres:16` and `redis:7-alpine`) **before** any steps execute. The `--health-*` options tell Docker to wait until each container reports healthy before the job steps begin. Without the health checks, the first step might try to connect before the database is ready.

**Health check sequence (visible in the "Set up job" log section):**
```
Waiting for service postgres to be healthy...  ✅  (after ~10s)
Waiting for service redis to be healthy...     ✅  (after ~2s)
```

**Step: "Connect to Postgres"**
```
                                              version
----------------------------------------------------------------------
 PostgreSQL 16.x on x86_64-pc-linux-gnu, compiled by gcc ...
(1 row)
```
The `psql` command connected to `localhost:5432` and ran a `SELECT version()` query successfully. The password is passed via `PGPASSWORD` env var.

**Step: "Connect to Redis"**
```
PONG
```
`redis-cli ping` returns `PONG` when the Redis server is up and reachable.

**Step: "Run integration tests"**
```
DATABASE_URL is available: postgres://testuser:testpass@localhost:5432/testdb
REDIS_URL is available:    redis://localhost:6379
Integration tests would run here against real services
```

In a real workflow these URLs would be passed to your test runner and your app code would use them to connect.

---

## Networking note

| Job runs on | Hostname to use for services |
|-------------|------------------------------|
| Runner directly (no `container:`) | `localhost` |
| Inside a container (`container:` block) | Use the **service name** (e.g. `postgres`) |

The `tests-with-postgres` job runs directly on the runner (no `container:` block), so services are accessible at `localhost`. If you add a `container:` block to the job, change `localhost` to `postgres` and `redis` in the connection strings.

---

## Key concepts recap

| Concept | Where to see it |
|---------|----------------|
| `container:` on a job | `job-in-container` — shell runs inside `node:20-alpine` |
| `options:` on a container | `--cpus 1` limits the container's CPU allocation |
| `services:` block | `tests-with-postgres` — Postgres + Redis run as sidecars |
| Health checks | `--health-cmd pg_isready` — job waits until DB is ready |
| `ports:` mapping | `5432:5432` makes the service available on `localhost` |
| Service accessible at `localhost` | `psql -h localhost` connects from the runner to the sidecar |
