# Contributing

Thanks for helping improve Clippy. Keep changes focused and easy to review.

## Setup

```bash
npm install
npm run dev
```

Before opening a PR:

```bash
npm run typecheck
npm test
```

## Guidelines

- Prefer small PRs with a clear problem and solution
- Match existing TypeScript, React, and Electron patterns in `src/`
- Main-process / native work lives under `src/main/`; UI under `src/renderer/`
- Do not commit secrets, `.env` files, or `release/` build artifacts
- Platform-specific paste/focus logic belongs in `src/main/platform/` and related services — document OS caveats in [docs/PLATFORMS.md](docs/PLATFORMS.md) when behavior differs

## Native module

`better-sqlite3` must be rebuilt for the Electron ABI:

```bash
npm run rebuild:native
```

Installer builds should run on the target OS (or CI) for that platform.

## License

By contributing, you agree that your contributions are licensed under the project’s [GPL-3.0-or-later](LICENSE) license.
