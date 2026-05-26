# Small base image — keeps the first-run image build under 10s.
FROM alpine:3.20

# The entrypoint is a plain shell script. Anything you'd write in a CI
# step you can write here — the script runs inside the container with the
# workspace mounted at /github/workspace.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
