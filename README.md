# Tarkov Companion

A web companion app for Escape from Tarkov, powered by the free [tarkov.dev](https://tarkov.dev) API.

## Features

- **Prices**: search any item and see its flea market price, the best trader to sell to, value per slot, and the cheapest place to buy it. Switch between PvP and PvE prices.
- Quests, Hideout and Ammo tabs are coming next.

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
