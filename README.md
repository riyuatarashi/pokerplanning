# Planning Poker Application

> TL;DR (ngrok):
> 1. Cloner & installer: `git clone … && cd pokerplanning && npm install`  
> 2. (Optionnel en dev) Watch du bundle: `npm run watch:frontend` ou build unique: `npm run build:frontend`  
> 3. Démarrer sur un port fixe (important pour ngrok): `PORT=3001 npm start`  
> 4. Dans un autre terminal: `ngrok http 3001`  
> 5. Ouvrir l'URL fournie (ex: `https://xxxx.ngrok-free.app`) → créer une session → copier l'ID.  
> 6. Partager soit l'ID + URL, soit un lien direct: `https://xxxx.ngrok-free.app?session=<SESSION_ID>`  
> 7. Les participants rejoignent depuis ce lien ou en entrant l'ID dans le champ « Join Existing Session ».  
> (Si le port 3001 est occupé, le serveur choisit le suivant; réglez `PORT` pour éviter la surprise avec ngrok.)

Une application **Planning Poker** légère en **Node.js / Express / socket.io**, avec un front minimal bundlé par **esbuild** (aucun framework lourd). Les votes sont anonymes et persistés côté client grâce à `localStorage`.

## 🎯 Motivation
Le Planning Poker aide les équipes Agile à estimer grâce à une échelle dérivée de Fibonacci (1,2,3,5,8,13,…). Les espacements croissants évitent les débats sur des chiffres trop proches. Ici, on expose une séquence étendue pour la granularité des estimations.

## ✨ Fonctionnalités
- Création / Rejoint de session en temps réel (WebSockets via socket.io)
- Stockage local (persistence de l'identité anonyme & des votes par round)
- Cartes Fibonacci prédéfinies (`[1,2,3,5,8,13,21,34,55,89]`)
- Reveal global des votes & reset (nouveau round avec nouvel identifiant)
- Détection de consensus (tous les votes identiques une fois révélés)
- Limitation du nombre total de connexions (configurable via `MAX_CONNECTIONS`)
- Reconnexion transparente (un même clientId retrouve son état si possible)
- Invite Link généré dynamiquement (`?session=<id>`) pour simplifier le partage

## 🗂 Structure du projet
```
public/
  index.html        # Page principale + injection bundle esbuild
  styles.css        # Styles custom (CDN Tailwind + ce fichier)
  favicon.svg
  dist/app.js       # Bundle généré (npm run build:frontend ou watch)
src/
  client/
    app.js          # Orchestrateur côté navigateur
    core/           # state, storage, statistics, logger
    features/       # vote.js, session.js (logique métier UI/socket)
    ui/             # dom.js (refs, rendering, helpers)
  server/
    constants.js    # Paramètres (délais cleanup, max connexions...)
    fibonacci.js    # Génération de la séquence
    logger.js       # Logger simple (socket + console)
    sessions.js     # État en mémoire des sessions & rounds
    socket.js       # Événements socket.io (join, vote, reveal, reset...)
server.js           # Entrée Express + socket.io + static + API /api/*
package.json        # Scripts npm, deps (express, socket.io, esbuild, uuid)
README.md
```

## ⚙️ Scripts npm
- `npm start` : démarre le serveur (port par défaut 3001, auto‑fallback si occupé)
- `PORT=3010 npm start` : force un port spécifique (recommandé pour ngrok)
- `npm run dev` : serveur avec `nodemon` (redémarrage automatique)
- `npm run build:frontend` : bundle unique de `src/client/app.js` → `public/dist/app.js`
- `npm run watch:frontend` : watch esbuild (rebuild rapide en dev)
- `npm run lint` / `npm run lint-fix` : ESLint (configuration moderne flat)
- `npm test` : (placeholder actuel, aucun test dans le repo)

## 🚀 Démarrage
### Installation
```sh
git clone https://github.com/riyuatarashi/pokerplanning.git
cd pokerplanning
npm install
```
### Build (optionnel en dev)
Le bundle est requis (sinon `public/dist/app.js` peut ne pas exister) :
```sh
npm run build:frontend
# ou, pour développement continu
npm run watch:frontend
```
### Lancement
```sh
PORT=3001 npm start
# puis visiter http://localhost:3001
```
Si le port est déjà pris, le serveur tentera n+1 (3002, etc.). Pour éviter ce comportement avec ngrok, fixez toujours `PORT`.

## 🌐 Exposition publique rapide avec ngrok
1. Installer ngrok (brew ou site officiel): `brew install --cask ngrok`
2. Démarrer le serveur sur un port fixe: `PORT=3001 npm start`
3. Ouvrir un second terminal: `ngrok http 3001`
4. Copier l’URL fournie (`https://xxxx.ngrok-free.app`) et l’ouvrir.
5. Créer une session (saisir votre nom → Create New Session → nom de la session), puis copier l’ID.
6. Partager soit:
   - L’ID seul + l’URL et laisser les participants cliquer « Join Existing Session »,
   - Un lien direct prérempli: `https://xxxx.ngrok-free.app?session=<SESSION_ID>`
7. Chacun vote; quand prêt, cliquer « Reveal Votes » puis « New Round » pour recommencer.

### Astuces
- Lien d’invitation dans l’UI: bouton « Copy invite link » (active après join).
- Rejoindre via paramètre: toute URL avec `?session=<id>` préremplit le champ.
- Pour tracer les événements serveur côté client: ouvrir la console (logs préfixés `Socket:` ou `UI:`).

## 🧠 Détails Techniques
- Les sessions sont uniquement en mémoire (`sessions.js`). Inactives (sans clients) sont nettoyées après délai (`CLEANUP_DELAY_MS`).
- Un round possède un `roundId` (UUID tronqué) qui change à chaque reset.
- La détection de consensus utilise un `Set` après filtrage des votes numériques.
- Le serveur propose deux endpoints REST simples (séquence Fibonacci & génération sessionId) puis le reste est temps réel via socket.io.
- Client: stockage du `clientId`, `displayName` et dernier vote (par round) dans `localStorage`.
- Fallback de port: récursif tant qu’un `EADDRINUSE` est rencontré.

## 📦 Dépendances clés
- `express` (serveur HTTP + static)
- `socket.io` (temps réel)
- `esbuild` (bundle front rapide)
- `uuid` (identifiants session / round / client)

## 🚧 Limitations / Prochaines étapes
- Aucun test automatisé actuel (script placeholder) → ajouter Jest + tests de logique session.
- Pas de persistance serveur (tout disparaît si redémarrage) → option: Redis ou base simple si besoin.
- Pas de authentification / rôles (tous peuvent reveal/reset) → ajouter contrôle si nécessaire.
- Séquence de cartes figée → rendre configurable côté session.
- Pas de license file séparé (seulement mention MIT ici) → ajouter `LICENSE`.

## 📝 Licence
MIT — libre d’utiliser, modifier et partager.

Bonnes estimations !
