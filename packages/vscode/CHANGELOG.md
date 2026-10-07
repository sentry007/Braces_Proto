# Changelog

## 1.0.0

First Marketplace release under the name **Bracer** (previously "Braces Reborn").

- Exact `o200k_base` token counts in the status bar. An approximate count, marked with `~`, is shown while the tokenizer loads.
- TOON output follows the current TOON spec (`@toon-format/toon` v4).
- Repair no longer rewrites words like "undefined" or "NaN" that appear inside string values.
- CSV export includes every column across all rows and flattens nested objects.
- XML export always produces a single root element.
- TOML export reports `null` values instead of silently dropping them.
- The extension now bundles all its dependencies. The previous build failed to activate.
