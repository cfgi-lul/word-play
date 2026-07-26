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

## Linting

Uses Taiga UI’s official ESLint preset
[`@taiga-ui/eslint-plugin-experience-next`](https://www.npmjs.com/package/@taiga-ui/eslint-plugin-experience-next).

```bash
cd wordplay/frontend
npm run lint
npm run lint:fix
```

