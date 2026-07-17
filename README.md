# Binary Atlas

Binary Atlas gives any piece of digital information a permanent, mathematically reproducible location in an infinite visual data space. It is a React, TypeScript, Vite, and React Three Fiber application that procedurally visualizes binary values on a cylindrical coordinate system.

## Installation

```bash
npm install
npm run dev
```

## Development commands

- `npm run dev` starts Vite.
- `npm run test` runs Vitest unit tests.
- `npm run test:e2e` runs Playwright tests.
- `npm run build` type-checks and creates a production build.

## Mathematical formulas

Levels begin at 1. Level `n` contains `2^n` nodes. `firstKey = 2^n - 1` and `lastKey = 2^(n + 1) - 2`. For key `k`, the level is the BigInt-safe bit length of `k + 1` minus one. The local index is `k - firstKey`, padded to `level` binary digits. For binary `b`, the global key is `(2^b.length - 1) + BigInt(0b b)`.

Each level is a ring on a cylinder. The sector start is `2π × j / 2^n`, centre is `2π × (j + 0.5) / 2^n`, and width is `2π / 2^n`. Rendering uses `visualY = levelScale × log2(level + 1)` while the mathematical level remains exact.

## Architecture

- `src/lib/binaryAtlas.ts` is a standalone BigInt mathematical engine independent of React.
- `src/components/AtlasScene.tsx` renders only the selected node, ancestors, children, and saved landmarks.
- `src/lib/crypto.ts` uses the browser Web Crypto API for SHA-256 and UTF-8 byte conversion.
- `src/lib/storage.ts` persists landmarks in localStorage.
- `src/App.tsx` provides Explorer, Compare, Landmarks, Certificate, and About views.

## Precision limitations

The default render precision is 20 visible subdivision bits. Larger binary values remain mathematically exact, but visual markers may share the same visible sector. A short prefix cannot uniquely identify or reconstruct a larger file.

## Privacy

Text, files, and images are processed locally in the browser. Files are not uploaded to a server by this application. Saved landmarks remain in localStorage unless exported by the user.

## Testing

```bash
npm run test
npm run build
npm run test:e2e
```

## Deployment

Run `npm run build` and deploy the generated `dist/` directory to any static hosting provider.

## What Binary Atlas Is Not

Binary Atlas is not:

- compression;
- infinite storage;
- proof that files physically exist in a cylinder;
- a replacement for cryptographic storage;
- a method for reconstructing a file from a short prefix.
