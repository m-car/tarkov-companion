# Tarkov Companion

A web companion app for Escape from Tarkov, powered by the free [tarkov.dev](https://tarkov.dev) JSON API (`json.tarkov.dev`). Its GraphQL API has been down since mid-2026, so the app downloads item data once per game mode and searches it in the browser.

## Features

Built for quick checks during a raid, on a phone, a second monitor, or alt-tabbed.

- **Loot**: search any item and get a verdict first (**QUEST / HIDEOUT / KEEP / SELL**), then flea and trader prices, value per slot and cheapest buy. Star items to pin them to a watchlist you can check without typing.
- **Raid**: a pre-raid plan that ranks maps by how many of your available quests they move forward, with what to bring (quest keys, items to plant, markers). Pick a map for its extracts (PMC or Scav, with requirements like payments or switches), transits, your objectives there, boss spawn chances, and keys: mark the keys you own, and see which ones your quests need.
- **Quests**: mark quests done (ticking a quest also marks its required earlier quests). Quests you just ticked show under "Finished recently" with an Undo button. Filter by available, locked or done, or by Kappa. Pick a map to see only the objectives you can do there. A list shows every item your open quests still need.
- **Hideout**: set each station's level and see what the next upgrade needs, plus a full shopping list.
- **Settings** (⚙): your level, faction, and the value per slot worth keeping.
- **Shortcuts**: `/` search loot, `1`–`4` switch tabs, `Esc` clear search.
- Progress is saved in your browser, separately for PvP and PvE.

## Development

```sh
npm install
npm run dev      # start the dev server
npm test         # run unit tests
npm run build    # typecheck and build for production
```

## Deployment

Pushes to `main` build and deploy to GitHub Pages through `.github/workflows/deploy.yml`.
Turn this on under **Settings → Pages → Source: GitHub Actions**.

Not affiliated with Battlestate Games.
