# Release and Directory Submission

## Release Checks

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
npm audit
```

The build checks version consistency, plugin ID, JavaScript syntax, bundled offline images, complete license notices, and external runtime imports. Only `obsidian` may remain an external runtime dependency. `npm run lint` currently performs strict TypeScript checks; it is not an ESLint policy audit.

Use the [manual checklist](MANUAL_VERIFICATION.md) for actual Obsidian-host testing. Browser tests and mocked host tests must never be reported as native Android/iOS verification. The user reported successful desktop viewing in the local test vault; the remaining host scenarios still need explicit verification.

## Publish on GitHub

1. Update the version consistently in the manifest, package, lockfile, and versions map.
2. Commit and push the reviewed, verified source. Never tag uncommitted output as a release.
3. Create a normal GitHub release whose tag is exactly the manifest version, without a `v` prefix, targeting the verified source commit.
4. Attach `main.js`, `manifest.json`, and `styles.css` individually. The license and third-party notices can also be attached for convenience; their full text is already bundled in `main.js`.
5. Download the release assets and compare their SHA-256 hashes with the tested local files before submitting to the directory.

The plugin ID is `totonio-presentation`; the repository is `GuruVlk/totonio-obsidian-plugin`. The former local-test ID `totonio-obsidian` must not be submitted because new IDs cannot contain `obsidian`.

## Obsidian Community Directory

Follow the [official submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin) and [developer policies](https://docs.obsidian.md/community-directory/developer-policies).

1. Sign in at [Obsidian Community](https://community.obsidian.md/) with the maintainer's Obsidian account.
2. Connect GitHub account `GuruVlk` in the profile.
3. Under Plugins, select New plugin and enter `https://github.com/GuruVlk/totonio-obsidian-plugin`.
4. Select the maintainer as owner. Read and personally accept the developer policies and maintenance commitment, then submit.
5. Resolve review feedback with updated source and a new versioned release. Publish the listing when eligible.

The manifest on the default branch must match the available GitHub release. A release is not an approval: do not claim directory availability until the directory confirms publication. Pending/unpublished submissions can still reserve names even when the public registry has no matching entry.

Account passwords, tokens, verification codes, and policy agreements must be handled by the maintainer in the browser, not pasted into chat or committed to the repository.
