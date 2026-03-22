# Spoony Frontend

Application mobile de gestion du quotidien basee sur la theorie des cuilleres.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) ou Android Emulator

## Installation

```bash
npm install
cp .env.exemple .env
```

## Demarrage

```bash
npx expo start
```

## Tests

```bash
npm test
```

## Stack

- **Framework**: React Native + Expo SDK 55
- **Navigation**: Expo Router (file-based)
- **Styling**: NativeWind (TailwindCSS)
- **State**: TanStack Query v5
- **i18n**: react-i18next
- **API**: Axios
- **Tests**: Jest + Testing Library
