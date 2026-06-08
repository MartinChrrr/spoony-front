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

## Emulateur Android (Linux)

SDK Android dans `~/Android/Sdk`, AVD disponible : `Pixel_9`.

```bash
# 1. Lancer l'emulateur
~/Android/Sdk/emulator/emulator -avd Pixel_9

# 2. Attendre le boot complet
~/Android/Sdk/platform-tools/adb wait-for-device
until [ "$(~/Android/Sdk/platform-tools/adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done

# 3. Demarrer Metro (port 8081 occupe par Adminer Docker → utiliser 8083)
npx expo start --port 8083

# 4. Ouvrir l'app dans Expo Go via adb
~/Android/Sdk/platform-tools/adb reverse tcp:8083 tcp:8083
~/Android/Sdk/platform-tools/adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8083" host.exp.exponent
```

Sur emulateur, `API_BASE_URL=http://10.0.2.2:8080` dans `.env`. Le web n'est pas supporte (expo-secure-store absent sur web).

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
