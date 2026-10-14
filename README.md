# Tarkov Companion

A web companion app for Escape from Tarkov, powered by the free [tarkov.dev](https://tarkov.dev) JSON API (`json.tarkov.dev`). Its GraphQL API has been down since mid-2026, so the app downloads item data once per game mode and searches it in the browser.

## Features

Built for quick checks during a raid, on a phone, a second monitor, or alt-tabbed.

- **Loot**: search any item and get a verdict first (**QUEST / HIDEOUT / KEEP / SELL**), then flea and trader prices, value per slot and cheapest buy. Star items to pin them to a watchlist you can check without typing.
- **Raid**: a plan view ranks maps by how many of your available quests they move forward. Pick a map to plan a raid:
  - choose which quests to do this raid; the **Bring** list (quest keys, items to plant, markers) follows your picks
  - **Item hunt**: turn on **All keys** to see every key spawn on the map (by area and floor, most valuable keys first, plus the containers likeliest to hold a key), or add items to look for (suggestions come from quest/hideout needs and your watchlist). For each item you get its loose spawn spots by area and floor, the locked room it's likely behind (and that key), and which containers can hold it with SPT odds
  - an interactive map with pins for hunt spawns, containers, likely-room doors, your objectives and extracts, with floor switching
  - **Start raid** opens a compact in-raid screen; **End raid** asks which picked quests you finished
- **Quests**:- **Quests**: mark quests done (ticking a quest also marks its required earlier quests). Quests you just ticked show under "Finished recently" with an Undo button. Filter by available, locked or done, or by Kappa. Pick a map to see only the objectives you can do there. A list shows every item your open quests still need.
- **Hideout**: set each station's level and see what the next upgrade needs. Tap items as you collect them (or "Mark all"); collected items drop off the shopping list, the loot verdicts and hunt suggestions, and a station shows "Ready to build" when everything is in.
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

## Data

- Live game data (items, prices, quests, hideout, maps, loose spawns, locks) comes from `json.tarkov.dev` at runtime.
- `npm run update-data` refreshes the files the app ships with: container odds in `public/loot/` from the [SPT](https://github.com/SP-Tushonka/server-csharp) game data (may lag live patches), and map image/floor setup in `src/data/mapConfigs.json` from [tarkov.dev's site](https://github.com/the-hideout/tarkov-dev) (MIT). The deploy runs it automatically and keeps the committed copies if a source is down.
- Rooms for loose spawns are inferred from the nearest locked door, so they're shown as "likely".

## Deployment

Pushes to `main` build and deploy to GitHub Pages through `.github/workflows/deploy.yml`.
Turn this on under **Settings → Pages → Source: GitHub Actions**.

Not affiliated with Battlestate Games.
