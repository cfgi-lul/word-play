# Word Play

Monorepo for the Word Play guessing game.

## Structure

```text
wordplay/
  frontend/   Angular app (UI + game logic)
.github/
  workflows/  CI
```

## Frontend

```bash
cd wordplay/frontend
npm install
npm start
```

Production build:

```bash
cd wordplay/frontend
npm run build
```

## PWA

Production builds generate a **Workbox** service worker (`sw.js`) so the app can be installed on phones.

```bash
cd wordplay/frontend
npm run build:gh-pages
```

After deploy, open the site on mobile and use **Add to Home Screen** / **Install app**.

## Deploy (GitHub Pages)

On every push to `main`, GitHub Actions builds and deploys the frontend.

Site URL after the first successful deploy:

`https://cfgi-lul.github.io/word-play/`

One-time repo setup:

1. Open **Settings → Pages**
2. Set **Source** to **GitHub Actions**

## Linting

Uses Taiga UI’s official ESLint preset
[`@taiga-ui/eslint-plugin-experience-next`](https://www.npmjs.com/package/@taiga-ui/eslint-plugin-experience-next).

```bash
cd wordplay/frontend
npm run lint
npm run lint:fix
```

