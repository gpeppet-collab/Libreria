# ADR-0001 · React Native con Expo per l'app Android

**Stato:** accettata · **Data:** 2026-11-11

## Contesto

Serve un'app che giri in locale su un telefono Android, sviluppata e mantenuta da una sola persona, con fotocamera (scanner ISBN), database locale e accesso al file system. Le alternative valutate: React Native con Expo, Flutter, Kotlin nativo, PWA.

## Decisione

React Native con **Expo** (SDK 58) e TypeScript, routing con expo-router.

## Motivazioni

- Un solo linguaggio (TypeScript) per tutto il progetto, con tipi condivisi tra dominio, dati e UI.
- Moduli ufficiali per tutto ciò che serve: `expo-camera`, `expo-sqlite`, `expo-file-system`, `expo-sharing`, `expo-document-picker`.
- Build Android senza installare Android Studio grazie a EAS Build; in alternativa `expo run:android` in locale.
- Il codice resta portabile su iOS se in futuro servisse, senza riscrivere nulla.

## Conseguenze

- Expo Go non basta per i moduli nativi usati: serve una development build.
- Le cartelle native sono generate e non versionate; la configurazione nativa passa da `app.json` e dai config plugin.
- Si accetta un bundle più grande rispetto a Kotlin nativo, irrilevante per questo caso d'uso.
