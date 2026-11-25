## Install on macOS

```bash
curl -fsSL https://raw.githubusercontent.com/XavierClavel/superset-private/main/scripts/install-fork-mac.sh | bash
```

The `.dmg` is not notarized: macOS says the app is "damaged" when it comes from a browser. To open it anyway, copy it to
Applications, then run `xattr -dr com.apple.quarantine /Applications/Superset.app`.
