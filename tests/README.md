# Sample Tests

This directory contains a small pytest suite used by the CI workflows in this demo repo. Its purpose is to give workflows something real to run — real tests, real cache, real test report artifacts.

---

## Files

| File | Description |
|------|-------------|
| [`test_calculator.py`](test_calculator.py) | pytest tests for `src/calculator.py` |

The application code being tested lives in [`src/calculator.py`](../src/calculator.py).

---

## Running locally

```bash
# From the repo root
pip install -r requirements-test.txt
pytest tests/ -v
```

Expected output:
```
tests/test_calculator.py::test_add            PASSED
tests/test_calculator.py::test_subtract       PASSED
tests/test_calculator.py::test_multiply       PASSED
tests/test_calculator.py::test_divide         PASSED
tests/test_calculator.py::test_divide_by_zero PASSED

5 passed in 0.xx s
```

---

## Producing a JUnit XML report

The [04-artifacts-caching workflow](../.github/workflows/04-artifacts-caching.yml) runs:

```bash
pytest tests/ -v --junit-xml=reports/junit.xml
```

The `reports/junit.xml` file is then uploaded as an artifact and can be downloaded from the Actions run page. To render it as a PR check, use the [dorny/test-reporter](https://github.com/dorny/test-reporter) action.

---

## How workflows use these tests

| Workflow | How tests are used |
|----------|--------------------|
| [`01-triggers.yml`](../.github/workflows/01-triggers.yml) | `ci` job runs `pytest` on push and PR |
| [`02-jobs.yml`](../.github/workflows/02-jobs.yml) | `matrix-test` job runs across 3 OS × 2 Python versions; `unit-tests` + `lint` jobs fan out |
| [`04-artifacts-caching.yml`](../.github/workflows/04-artifacts-caching.yml) | `build-and-test` caches pip, runs tests with JUnit output, uploads the report |

---

## Extending the tests

To add more test coverage:

1. Add functions to `src/calculator.py` (or create a new module in `src/`).
2. Add corresponding test functions in `tests/test_calculator.py` (or a new `tests/test_<module>.py` file).
3. The workflows pick up new test files automatically via `pytest tests/`.
