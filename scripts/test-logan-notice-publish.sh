#!/usr/bin/env bash
set -euo pipefail

fixtures=$(mktemp -d)
trap 'rm -rf "$fixtures"' EXIT
cat > "$fixtures/curl" <<'MOCK'
#!/usr/bin/env bash
case "${!#}" in
  https://logankerbside.app/*) value=$LOGAN_MARKER ;;
  https://whenskerbside.com/*) value=$DIRECTORY_MARKER ;;
  *) exit 2 ;;
esac
[[ "$value" != unavailable ]] || exit 22
printf '%s\n' "$value"
MOCK
chmod +x "$fixtures/curl"
export PATH="$fixtures:$PATH"
export LOGAN_MARKER DIRECTORY_MARKER
expected=$(printf '%064d' 1)
previous=$(printf '%064d' 2)
probe() { bash "$(dirname "$0")/logan-notice-needs-publish.sh" "$expected" '123-1'; }

# Snapshot changed, both sites still serve the previous version.
LOGAN_MARKER=$previous DIRECTORY_MARKER=$previous
[[ $(probe) == true ]]
# One site published; the next poll sees the same desired snapshot and retries.
LOGAN_MARKER=$expected DIRECTORY_MARKER=$previous
[[ $(probe) == true ]]
# Site failure is not mistaken for successful publication.
DIRECTORY_MARKER=unavailable
[[ $(probe) == true ]]
# Both sites converged and no further deployment is needed.
DIRECTORY_MARKER=$expected
[[ $(probe) == false ]]
echo 'Notice deployment retry fixtures passed.'
