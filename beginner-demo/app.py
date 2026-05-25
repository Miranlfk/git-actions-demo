"""Entry point used by the Beginner CI/CD demo container.

When the container starts, this script runs a handful of calculator
operations and prints the results — proof that the published image was
pulled, deployed, and is actually executing.
"""

from calculator import add, subtract, multiply, divide


def main() -> None:
    print("=== Calculator container running ===")
    print(f"add(2, 3)       = {add(2, 3)}")
    print(f"subtract(10, 4) = {subtract(10, 4)}")
    print(f"multiply(3, 4)  = {multiply(3, 4)}")
    print(f"divide(10, 2)   = {divide(10, 2)}")
    print("=== Done ===")


if __name__ == "__main__":
    main()
