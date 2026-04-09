# Copilot Instructions — Boulder Front (React Web UI)

## Architecture

`boulder-front` is the **web adapter** in the hexagonal architecture. It communicates with `boulder-analyzer` exclusively via the REST API (`/api/*`), never by importing Python code.

```
boulder-front (React SPA)
  └── /api proxy → boulder-analyzer FastAPI (port 8000)
```

### Directory Layout

```
src/
├── components/   — React components (one file per component)
├── stores/       — Zustand stores (app.ts)
├── lib/          — API client, helpers, constants
├── App.tsx       — Root component with view routing
└── main.tsx      — Entry point with QueryClientProvider
```

## Tech Stack

| Tool              | Version  | Purpose                      |
|-------------------|----------|------------------------------|
| Bun               | ≥1.3     | Runtime, package manager     |
| Vite              | ≥8.0     | Dev server, bundler          |
| React             | 19       | UI library                   |
| TypeScript        | ≥6.0     | Type safety                  |
| Zustand           | ≥5.0     | Global state management      |
| @tanstack/react-query | ≥5  | Server state & caching       |
| Tailwind CSS      | ≥4.0     | Utility-first styles         |

## Conventions

### State Management
- **Zustand** for client-side state: selected video, active job, UI view, job history.
- **React Query** for server state: video list, config, job polling.
- Do NOT mix — never put fetched server data in Zustand unless it needs to be mutated client-side.

### API Communication
- All API calls go through `src/lib/api.ts`. Never use raw `fetch` in components.
- The Vite dev server proxies `/api` → `http://localhost:8000` (configured in `vite.config.ts`).
- For real-time progress, use SSE via `streamJob()` — NOT polling.

### Styling
- **Tailwind only**. No CSS modules, no styled-components, no inline style objects.
- Dark theme: `bg-gray-950` base, `bg-gray-900` cards, `emerald-*` accent.
- Use Tailwind's `transition-colors` for hover states.

### Components
- One component per file in `src/components/`.
- Named exports only (no default exports for components).
- Props interfaces defined inline or co-located in the same file.
- Prefer composition over deep prop drilling — use Zustand hooks directly.

### TypeScript
- Strict mode enabled. No `any` types.
- API response types defined in `src/lib/api.ts` and imported where needed.

## Running

```bash
# Dev server (port 5173, proxies /api to port 8000)
bun dev

# Build for production
bun run build

# Preview production build
bun run preview
```

Requires `boulder-analyzer` API running on port 8000:
```bash
cd ../boulder-analyzer && make serve
```

## Key Files

- `src/lib/api.ts` — Typed HTTP client for all boulder-analyzer endpoints
- `src/stores/app.ts` — Global UI state (view, videos, jobs)
- `src/components/Layout.tsx` — App shell with tab navigation
- `src/components/VideoUpload.tsx` — Drag-and-drop video upload
- `src/components/VideoList.tsx` — Lists uploaded videos with Process button
- `src/components/JobProgress.tsx` — SSE-driven progress bar
- `src/components/ResultsView.tsx` — Video player + download links
- `vite.config.ts` — Tailwind plugin + API proxy config
