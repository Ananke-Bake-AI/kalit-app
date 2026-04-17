# @kalit/desktop

Desktop renderer for Kalit Studio. React 19 + Vite, consumes `@kalit/studio-ui`
so the UI stays in lockstep with the web version at `apps/landing`.

## Running

```bash
pnpm --filter @kalit/desktop dev
```

Opens on http://localhost:5173. The Vite dev server proxies `/api/broker/*`
to `VITE_BROKER_URL` (default `http://localhost:9000`) with a rewrite to
`/api/flow/*` — matches the path shape that shared components expect.

## Auth (current state)

There is no real auth yet. `src/broker.ts` reads the bearer token from
`localStorage["kalit-broker-token"]` — drop one in DevTools to exercise
authenticated broker calls during development. `src/App.tsx` provides a
stub `StudioHostValue` with a placeholder user. Swap both out when we wire
OAuth + OS keychain storage.

## What renders

`App.tsx` currently mounts the welcome surface: `SessionSidebar`,
`WelcomeScreen`, `ChatInput`, all from `@kalit/studio-ui`. The streaming
orchestration (session loading, message streaming, widget hydration) lives
in the landing app's `StudioClient` and hasn't been lifted into the package
yet — that's the next chunk of work before the desktop shell is feature-
complete.

## Next (shell)

The Vite renderer is framework-agnostic, so wrapping it in a native shell
is now an independent choice:

- **Tauri 2** — smaller bundle, native OS keychain access, requires Rust
  toolchain on CI. Run `pnpm create tauri-app` in this directory.
- **Electron** — no Rust, heavier bundle, mature tooling.

Pick one and the integration contract (`setStudioBrokerClient` +
`StudioHostProvider`) does not change.
