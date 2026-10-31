# Brightloop – Subscription Management System

Each member has their own folder with the files they own.

| Folder | Member | Area |
|---|---|---|
| `arjun/` | Arjun | Auth & main interface (App, AuthContext, AuthModal, Navbar, Sidebar, Staff mgmt) |
| `abiraj/` | Abiraj | Customers, customer portal, subscriptions, plans, products |
| `aninditha/` | Aninditha | Finance dashboard, billing UI, invoices, payments, quotations, taxes/discounts, printables |
| `leonardo/` | Leonardo | Backend server, auth/billing/db logic, `api.ts`, `types.ts` |
| `shared/` | Everyone | package.json, configs, index.html, index.css, main.tsx, docs – discuss before editing |

Folder paths inside each member folder match the real project paths (e.g. `arjun/src/App.tsx` = `src/App.tsx`).

## Run the full app
```
./assemble.sh
cd full-project
bun install   # or npm install
bun run dev   # or npm run dev
```
(`full-project/` is generated, don't commit it.)

## Rules
- Only edit files in your own folder.
- `api.ts`, `types.ts` (Leonardo) are used by everyone — tell him before changing anything.
- Use your own branch, e.g. `arjun-work`, and open a pull request.
