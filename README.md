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

Output: `wordplay/frontend/dist/word-play`
