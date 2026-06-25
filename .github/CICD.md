# CI/CD — frontend (Spoonrest / Expo)

## CI — `.github/workflows/ci.yml`

Runs on every push to `main`, every pull request **targeting `main`**, on demand
(`workflow_dispatch`), and is reused as a gate by the CD workflow
(`workflow_call`). Job **quality** (blocking, `timeout-minutes: 15`):

| Étape | Commande | Rôle |
|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit -p tsconfig.ci.json`) | Type-check du **code source** (les tests sont validés par jest, pas par tsc — ils n'ont pas `@types/jest`). |
| Parité i18n | `npm run i18n:check` | Échoue si `en.json` et `fr.json` n'ont pas exactement les mêmes clés (tableaux indexés inclus) — `scripts/check-i18n-parity.mjs`. |
| Tests | `npm run test:ci` (`jest --ci --maxWorkers=2`) | Suite Jest. `testTimeout` 15 s. `test:ci` **sans** `--passWithNoTests` : un 0-test casse volontairement le gate. |
| Expo doctor | `npx expo-doctor` (`continue-on-error`) | Santé deps/config Expo — **non bloquant**, réutilise `node_modules`. |

Node épinglé via `.nvmrc` (20) ; cache npm activé.

> **Élargir les déclencheurs** : la CI ne tourne sur `push` que pour `main` (+
> PR vers `main`). Pour le signal sur une branche de travail (ex.
> `p1-store-fixes`), ajoute-la sous `on.push.branches`.

## CD — `.github/workflows/cd-eas.yml`

Construit les binaires via **EAS Build**. Déclencheurs : manuel
(`workflow_dispatch`, choix profil/plateforme) ou push d'un **tag semver**
`vX.Y.Z` (build **production**). **Chaque build est précédé du gate qualité**
(job `ci`, réutilise `ci.yml`) — un tag de release ne peut pas builder du code
qui ne passe pas la CI. Profils dans `eas.json` (`preview` → API staging,
`production` → API prod).

### ⚙️ Activation (à faire une fois — nécessite ton compte Expo)

1. **Lier le projet à EAS** (crée `extra.eas.projectId` dans `app.config.ts`) :
   ```bash
   npm i -g eas-cli      # ou: npx eas-cli@latest
   eas login
   eas init              # crée le projet EAS + le projectId
   ```
2. **Pré-provisionner les credentials store** (obligatoire **avant** le 1er build
   `production`, sinon `eas build --non-interactive` échoue) :
   ```bash
   eas credentials       # Android : keystore ; iOS : cert distribution +
                         # provisioning profile (session Apple interactive)
   ```
   > Tant que les certs iOS n'existent pas, tu peux limiter un 1er build à
   > Android (input `platform: android` en dispatch).
3. **Créer un token Expo** (https://expo.dev → Account → Access tokens) et
   l'ajouter en **secret GitHub** `EXPO_TOKEN`
   (Settings → Secrets and variables → Actions).
4. Lancer un build : **Actions → CD — EAS Build → Run workflow** (profil
   `preview` pour un build interne de test).

**Comportement sans configuration** (rien n'est cassé côté CI) :
- sans `EXPO_TOKEN` → le job échoue tôt à l'étape **« Require EXPO_TOKEN »** ;
- avec le token mais sans `projectId`/credentials → échec à l'étape
  **« Build on EAS »** (`eas build` ne peut pas résoudre le projet/les certs).

> ⚠️ Le build est lancé avec `--no-wait` : **succès du job ≠ succès du build**.
> Le runner rend la main dès la mise en file ; vérifie l'état réel sur
> https://expo.dev (ou retire `--no-wait` pour que le job attende et reflète
> l'échec, au prix de minutes Actions).

## Suite (non bloquant)

- **ESLint** : pas encore configuré (dette connue, ADR-018). Ajouter
  `eslint-config-expo` + `npx expo lint`, corriger le bruit, puis en faire un
  gate CI bloquant.
- **EAS Update (OTA)** : pour livrer des correctifs JS sans rebuild store. Avant
  de l'activer, ajouter un `"channel"` aux profils `preview`/`production` de
  `eas.json` **puis** rebuilder le binaire (un build sans channel ne peut pas
  recevoir d'OTA). Ensuite `eas update --branch <preview|production>` sur push
  `main`.
- **EAS Submit (stores)** : `eas submit` est **bloqué** tant que le renommage
  **Spoonrest** n'est pas finalisé (clearance marque + comptes App Store Connect
  / Play Console). Voir `docs/avancement-release.md` (P0 hors-code). Le bloc
  `submit.production` d'`eas.json` est inerte (jamais invoqué).
- **Profil `development`** (`API_BASE_URL=localhost`) : volontairement **exclu**
  des déclencheurs cloud — réservé au dev local (`eas build --profile
  development` à la main).
- **`@types/jest`** : pour étendre le typecheck CI aux tests, ajouter
  `@types/jest` (+ types testing-library) puis retirer l'exclusion des tests de
  `tsconfig.ci.json`.
