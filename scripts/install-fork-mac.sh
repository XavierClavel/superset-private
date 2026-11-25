#!/usr/bin/env bash
# Installs the latest fork release in /Applications. A browser marks its downloads as quarantined, and macOS then
# refuses the app as "damaged" because it is not notarized. curl does not mark them.
set -euo pipefail

REPO=XavierClavel/superset-private
APP=/Applications/Superset.app
RELEASE="https://github.com/$REPO/releases/latest/download"

zips=$(curl -fsSL "$RELEASE/latest-mac.yml" | sed -n "s/^ *- url: '\(.*-mac\.zip\)'$/\1/p")
if [ "$(uname -m)" = arm64 ]; then
	zip=$(grep arm64 <<<"$zips")
else
	zip=$(grep -v arm64 <<<"$zips")
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
echo "Downloading $zip"
curl -fL --progress-bar -o "$tmp/$zip" "$RELEASE/$zip"
ditto -x -k "$tmp/$zip" "$tmp"
codesign --verify --deep --strict "$tmp/Superset.app"

if [ -e "$APP" ]; then
	backup=$(mktemp -d)
	mv "$APP" "$backup/"
	echo "Previous app moved to $backup/Superset.app"
fi
ditto "$tmp/Superset.app" "$APP"
echo "Installed $APP. If Superset is running, quit it (⌘Q) and open it again."
