#!/bin/sh
# args:[0]=name, args:[1]=language — positional from action.yml
NAME="$1"
LANGUAGE="$2"

case "$LANGUAGE" in
  es) MSG="¡Hola, $NAME! (from Docker)" ;;
  fr) MSG="Bonjour, $NAME ! (from Docker)" ;;
  *)  MSG="Hello, $NAME! (from Docker)" ;;
esac

echo "$MSG"

# Set the action output. $GITHUB_OUTPUT is a file path the runner mounts
# into the container, so writing to it from inside the container works
# exactly the same as from a composite/JS action.
echo "greeting=$MSG" >> "$GITHUB_OUTPUT"
