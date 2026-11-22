#!/usr/bin/env bash
set -euo pipefail

expected=${1:?expected notice digest}
probe_id=${2:?cache-busting probe ID}
[[ "$expected" =~ ^[a-f0-9]{64}$ && "$probe_id" =~ ^[0-9-]+$ ]]

needs_publish=false
for site in logankerbside.app whenskerbside.com; do
  if marker=$(curl --silent --show-error --fail --max-time 15 \
      -H 'Cache-Control: no-cache' "https://$site/data/logan-notice-version.txt?probe=$probe_id") \
      && [[ "$marker" == "$expected" ]]; then
    printf '%s has the current notice\n' "$site" >&2
  else
    printf '%s did not confirm the current notice\n' "$site" >&2
    needs_publish=true
  fi
done
printf '%s\n' "$needs_publish"
