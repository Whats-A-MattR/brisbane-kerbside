# Contributing

Thanks for helping make Brisbane's kerbside collection schedule easier to use.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Keep changes inside the root static app unless the issue explicitly concerns
   archived code under `_old/`.
3. Run `pnpm typecheck` and `pnpm build`.
4. Do not hand-edit files in `public/data`; run
   `pnpm data:update` instead.
5. Explain the user-facing change and include screenshots for visual changes.

Please use GitHub Issues for bugs, data discrepancies and proposed features.
Never include private addresses, credentials or personal data in an issue.
