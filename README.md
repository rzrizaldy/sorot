# Sorot

A teleprompter that lives in your Mac's notch. It scrolls while you talk and stops when you stop. Switch to Listen for live captions of whoever is speaking. Everything runs on your Mac.

**[Download the latest version](https://github.com/rzrizaldy/sorot/releases/latest)** · [sorot.app](https://sorot.app/)

Needs macOS 26 or later on Apple silicon. Sorot isn't notarized yet: the first time, right-click the app and choose Open.

## Checking a download

Every release lists the SHA-256 of `Sorot.dmg` in its notes and attaches it as `Sorot.dmg.sha256`. Compare it with yours:

```bash
shasum -a 256 ~/Downloads/Sorot.dmg
```

Sorot's own update check does this for you before it opens a new version.

Sorot is free to download: Music is free, and the prompter and Listen are free for three sessions each. **[Sorot Pro](https://sorot.app/buy/)** is $8.99, once, with every update to come.

This repository holds the website and the release downloads. The app's source is private.
