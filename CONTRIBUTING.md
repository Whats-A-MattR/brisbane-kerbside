# Contributing

Thanks for helping make council kerbside collection schedules easier to use.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Keep shared behaviour in `src/` or `scripts/` and council-specific source fields, wording and assets inside `sites/<site-id>/`.
3. Run `pnpm typecheck` and `pnpm build:all`.
4. Do not hand-edit files in `sites/*/public/data`; run `pnpm data:update` or `pnpm data:update:all` instead.
5. Explain the user-facing change and include screenshots for visual changes.

Please use GitHub Issues for bugs, data discrepancies and proposed features.
Never include private addresses, credentials or personal data in an issue.
