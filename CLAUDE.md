# admin

Admin panel for the Sakuci/Dataku school system. Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4, running on port **3009**. Talks to the `sakuci-express` backend (Express + Sequelize + MySQL, db `coba`) on port **3010** — sibling repo at `../../sakuci-express`.

## Running

```
npm run dev    # next dev -p 3009
npm run build
npm start      # next start -p 3009
```

Backend must be running separately (`sakuci-express`, port 3010) — this app has no backend code of its own; all data comes from `NEXT_PUBLIC_API_URL` (see `.env.local`).

## Architecture

- **Menus / routes** (`app/*`): `dashboard`, `siswa`, `kelas-ppdb`, `riwayat-kelas` (labeled "Pengaturan Kelas" in the sidebar), `master-ppdb`, `jurusan`, `master-spp`, `role`, `user`, `backup-restore`, plus `login`.
- **`lib/api.ts`**: `apiFetch(endpoint, options)` — thin fetch wrapper. Reads the JWT from `localStorage["token_admin"]`, attaches `Authorization: Bearer`, skips `Content-Type` for `FormData` bodies, throws on non-2xx using the backend's `message` field. Use this for every backend call instead of raw `fetch`.
- **`lib/auth.ts`**: `token_admin` / `user_admin` are the localStorage keys — deliberately prefixed with `_admin` because this app runs alongside sibling apps (e.g. `ppdb-next` uses `token_ppdb`) against the same backend/browser profile, so keys must not collide. `isAllowedAdmin` gates access to role `"admin"` only.
- **`lib/use-sort.ts`** + **`components/sortable-th.tsx`**: shared client-side sort abstraction used by every table page. `useSort(data, getValue)` returns `{ sorted, sortKey, sortDir, toggleSort }`; `<SortableTh>` renders a clickable header with an arrow icon. Use this pair for any new sortable table **unless the data is server-side paginated** (see below).
- **Siswa page is the one exception**: it has ~2000 rows and is paginated server-side, so sorting there is also server-side (`sort_by`/`sort_dir` query params sent to `GET /siswa/master`, page reset to 1 on sort change) rather than the shared `useSort` hook. If a future table grows large enough to need pagination, follow that pattern instead of client-side sort.
- **`components/app-shell.tsx`**: wraps every authenticated page — `ProtectedRoute` + `AppSidebar` + `AppHeader` + `<main>`. New pages should be wrapped in `<AppShell>`.
- **`components/modal.tsx`**: shared modal shell used for all add/edit/detail dialogs.
- SweetAlert2 (`Swal.fire`) for all confirms/success/error dialogs — don't use `window.confirm`/`alert`.
- `components/app-sidebar.tsx` holds the menu list (icon + href) — add new menus here.

## Conventions

- No backend code lives here. If a page needs data or behavior the backend doesn't support yet, the fix goes in `sakuci-express` first (check there for existing endpoints before assuming one needs to be added — several controllers had unused endpoints, e.g. `trfServer` for siswa, that were repurposed rather than duplicated).
- Prefer reusing existing backend CRUD endpoints over adding new ones (e.g. the Jurusan menu reuses `JurusanPpdb`'s existing `/ppdb/jurusan*` routes with zero backend changes).
- Keep scope tight — don't add fields/params beyond what was asked (e.g. `updateSiswa` only grew a `status` field when that was the explicit ask, not adjacent fields like `no_hp_ortu`).
- Never run destructive `.next` cleanup (`rm -rf .next`) while the dev server is running — it corrupts Turbopack's cache and crashes the dev server. Kill the server first if a clean rebuild is needed.
- Any backend change should be verified live against the real running backend using **disposable test data** (obviously-named, e.g. `"TEST ... DELETE ME"`), always deleted immediately after verification — the database has real student records.
- Don't test destructive operations (e.g. full DB restore) against the live database.
