# kalit-app — Audit global (page Studio + landing)

État au 2026-04-28. Focus sur `apps/landing/app/[locale]/(studio)` + `packages/studio-ui` + intégrations broker/Vercel/Neon.

## Architecture studio en bref

```
URL: /[locale]/studio?session=<id>
   │
   ▼
StudioClient (apps/landing/app/[locale]/(studio)/studio/studio-client.tsx)
   │
   ├─ useStudioStore (Zustand, global per-app)
   │     ├─ sessions[], activeSessionId, messages[], streamSegments[]
   │     ├─ quota, activeWidgets[], importedRepo
   │     ├─ progressMode (default | expert), selectedModel
   │     └─ rightPanelOpen, sidebarOpen, previewFile, atMenu
   │
   ├─ useStudioChat (packages/studio-ui/src/hooks/use-studio-chat.ts)
   │     ├─ Loads sessions on mount → setReady(true)
   │     ├─ POST /api/broker/sessions/{id}/messages → SSE stream
   │     ├─ Parses event types: text|thinking|tool_use|tool_result|widget|debug_summary|done
   │     ├─ fetchQuota at mount + after each turn (optimistic decrement on debug_summary)
   │     └─ Background follow-stream re-attaches when activeSessionId changes
   │
   └─ ChatLayout (packages/studio-ui/src/components/chat-layout)
         ├─ <SessionSidebar> (gauche): liste sessions + ⌘K search + footer quota
         ├─ <ChatInput> + <MessageList> + <WelcomeScreen> (centre)
         ├─ <FileExplorer> (droite, file tree + project status)
         ├─ <SessionUsageBadge> (topRight: live tokens via /api/usage/session)
         ├─ <ModelSelector> (topRight, admin only)
         └─ <FilePreviewModal>, <RoutingDebugPanel>, <DebugConsole>
```

Couches:
- **`apps/landing/`** — Next.js 16 App Router host, Prisma (Neon), NextAuth v5 + JWT bridge, Vercel deploy.
- **`packages/studio-ui/`** — pure UI logic, broker-client agnostic via `setStudioBrokerClient` host singleton.
- **`packages/broker-client/`** — fetch wrapper + token resolver.
- **`packages/i18n/`** — locale strings.

---

## Points forts

### Architecture clean
- **studio-ui agnostique** du host (Next.js / Electron / mobile). Peut être réutilisé.
- **broker-client** isolé en package avec tokens cachés (`clearToken` exposé pour logout).
- **i18n** déjà branché — strings centralisées, prêt pour FR/EN/ES.

### State management
- **Zustand store unique** (`useStudioStore`) — pas de Redux/Context-hell, tout en un fichier ~300 lignes.
- **`mergeMessages` + `shouldSkipAdd`** — dédup robuste user/assistant entre l'optimistic temp-id et le serveur (commit ID assigned by broker).
- **Stream state isolé** (segments, thinking, isStreaming) — reset propre entre sessions.

### Streaming UX
- **SSE keepalive** côté broker, follow-stream client peut reconnect après refresh.
- **Optimistic quota decrement** sur event `debug_summary` — sidebar descend en temps réel pendant un tour.
- **Watchdog** sur les SSE qui stallent.
- **Handle de l'orphan tool_use** côté broker (`healOrphanedToolCalls`) — refresh ne casse jamais l'état logique.

### File explorer (right panel)
- **Polling 5s** workspace-tree + project status.
- **Phase configs** mappés (idle, preparation, planning, running, developing, testing, deploying, done, error, cancelled) avec couleur + pulse + i18n.
- **Image preview modal** avec navigation prev/next sur les siblings.
- **Drag & drop upload**, paste image, file delete.
- **Stats progress bar** (done/total tasks).

### Session sidebar
- **⌘K shortcut** + search.
- **Date buckets** (today / yesterday / last7 / last30 / older) + pinned section.
- **Pin to top** (localStorage), rename inline, soft-delete avec confirm.
- **Progress mode toggle** (default ↔ expert) — verbosity du progress messaging adaptable.

### Mobile responsiveness (récent, fixes de cette session)
- Sidebar drawer overlay <1084px avec backdrop.
- Right panel full-screen overlay <600px avec backdrop + close button propre.
- Top toolbar shrink-friendly avec compact-notation pour les compteurs (1.2M/44K).
- Default rightPanelOpen=false sur phone (force-close au mount).

### Studio integration features
- **Welcome screen** avec suggestions de prompts pré-remplies par suite.
- **Notification modes** (off / title / title+sound) — flash le tab quand l'agent finit.
- **Debug console admin-only** — events tagés (route/tool/text/think/cost/etc).
- **Routing debug panel** — affiche live le suite_selected event (suite + confidence + reasoning).
- **Focus mode** (toggle plein écran sans chrome).
- **Theme toggle** dark/light.

### Auth & infra
- **NextAuth v5 (Auth.js)** + Prisma adapter — sessions DB + JWT bridge vers le broker.
- **`brokerFetch` + `signBrokerJwt`** — JWT 5min HS256 signé avec `BROKER_JWT_SECRET` ou fallback `SUITE_JWT_SECRET`/`AUTH_SECRET`.
- **Rewrites Next.js** `/api/broker/:path*` → broker prod (sauf override par routes locales spécifiques pour les paths /broker/usage, /broker/research, /broker/project, /broker/find-assets).
- **`@kalit/usage-ts`** intégrée pour reporter consumption.

---

## Points faibles

### Couplage entre store et broker SSE
- `useStudioChat` est un méga-hook 900+ lignes. Très dense, difficile de tester en isolation.
- L'event handler SSE switch sur 11 types — refacto en handler-map serait plus maintenable.

### Skill prompt opaque côté UI
- Le user ne voit jamais quel skill set est actif, ni pourquoi l'agent a refusé / accepté un truc.
- Pas de "explain why" dropdown qui affiche le routing classifier output (pourtant déjà fetch dans `lastRouting` admin).

### Quota refresh
- **`fetchQuota` polled à chaque end-of-stream**, pas de subscription. Si le user a deux onglets ouverts, l'autre lag de plusieurs minutes.
- Pas d'alerte "tu as dépassé X% du budget mensuel" — silencieusement à 0 puis l'agent ERROR sur out of credits.

### File explorer
- 50KB+ pour les HTML — pas de lazy-load par section, le panel charge tout le tree à chaque poll.
- Pas de **search dans les fichiers** côté UI (l'agent a `project_grep` mais le user n'y a pas accès).
- Pas de diff viewer post-patch — quand l'agent dit "j'ai changé X", le user doit ouvrir le fichier pour voir.

### Mobile
- Beaucoup d'états visuels contestables sur petits écrans (badge cassé qu'on a fixé, panel overlay) — pas de QA mobile systématique.
- Pas de **PWA manifest** / installable, pas de offline mode malgré la nature chat.

### Performance
- Multiple `polls` indépendants : research status (UI), workspace-tree (right panel), project status, quota, sessions, messages. Aucune de-duplication / coalescing.
- Bundle size pas mesuré — `@dicebear/collection` + GSAP + Framer Motion + Iconify peuvent être lourds.

### Notification logic
- `notify()` flash le titre / play un sound seulement quand `isStreaming` flip à false. Si le user a notifs OS bloquées, perd le signal.
- Pas de Web Push subscription — donc pas de "ton build est fini, viens" en background.

### Erreurs
- 429 / 500 du broker affichés en text simple ("Error 429"). Pas de retry button, pas d'explication contextuelle.
- Pas de **`retry-after`** parsing — quand Anthropic dit "wait 12s", on n'attend pas, on relance immédiatement à la prochaine action user.

### Studio admin tools
- ModelSelector et DebugConsole sont admin-only mais vivent dans le bundle prod normal.
- Pas de feature flag system — chaque toggle est un fork de code (`isAdmin && …`).

### Session organization
- Pas de **dossiers / tags** sur les sessions. 50+ sessions = scroll infini.
- Pas de **partage de session** via lien (read-only). Utile pour debug entre devs.
- Pas d'**archivage**. La sidebar deviendra ingérable.

### Right panel
- Le bouton Publish est désactivé pendant build (✅ fix de cette session) mais pas de tooltip cohérent côté UX.
- Pas de **historique des deploys** (URLs précédentes, timestamps, rollback).

### Server actions vs client
- `getRemainingCredits` query Neon depuis un server component à chaque GET / page. Pas de cache. À l'échelle ça va saturer la pool Neon.

### Sécurité
- JWT 5min — court mais pas de refresh transparent. Le broker rejette une fois la fenêtre dépassée et l'UI ne re-mint pas automatiquement.
- `BROKER_JWT_SECRET` et `AUTH_SECRET` peuvent diverger entre Vercel et broker (vu cette session: dev pointait sur prod, fallait aligner manuellement).
- Pas de **CSP** strict côté Next.js (juste `X-Frame-Options: SAMEORIGIN` dans next.config).

---

## Idées de nouvelles fonctionnalités (studio-only)

### 1. **Side-by-side preview**
Une colonne "Live preview" en plus du file tree. iframe sur l'URL deploy, refresh auto après chaque deploy. Permet de voir le résultat sans quitter le chat.

### 2. **Inline diff post-patch**
Quand un widget `patch` ou `hotfix` complète, afficher un diff cliquable dans le chat (Monaco-like). User clique fichier → voit avant/après.

### 3. **Session forking depuis l'UI**
Bouton "Continue with another model" / "Branch off this turn" — clone la session jusqu'à un point précis, expérimente sans casser le main thread.

### 4. **Multi-session view**
2-3 sessions en split view (comme un IDE multi-tabs). Utile quand l'utilisateur build 2 sites en parallèle.

### 5. **Voice input**
Browser SpeechRecognition + envoyer transcribed text. Pour mobile en mouvement, utile.

### 6. **Templated prompts**
Library de prompt templates par type de site ("restaurant", "portfolio dev", "saas landing"). Le user pick + tweak + envoie. Réduit le "blank page syndrome".

### 7. **Quota prediction overlay**
Barre verte/jaune/rouge + projection "à ton rythme actuel, tu vas être à 0 dans X jours". Permet à l'user d'anticiper avant de tomber sec.

### 8. **Inline command palette ⌘P**
Au lieu de toggles isolés (theme, focus, notify), un palette ⌘P avec toutes les actions: rename session, fork, change model, deploy now, copy url, etc.

### 9. **History search across sessions**
"Cherche dans tous mes chats: 'iop'" — full-text search côté Postgres FTS5. Retrouve un design discuté il y a 3 sessions.

### 10. **Onboarding tutorial inline**
Premier user sur le studio = mini-stepper interactif (4 étapes). Aujourd'hui zéro guidance.

### 11. **Asset library globale**
Tous les assets cherchés/générés par un user → bibliothèque persistante. Réutilisable d'un projet à l'autre sans re-fire `find_assets_search`.

### 12. **Real-time collaboration**
Plusieurs users dans la même session studio (CRDT-based ou Yjs). Démo avec un client par exemple.

---

## Synergies cross-suite (côté UI)

### A. **Suite-aware welcome screen**
Le welcome screen suggère des prompts en fonction de la suite active (Flow vs Project vs Marketing). Aujourd'hui fait basiquement ; **idée**: enrichir avec des prompt-templates par INDUSTRIE (restaurant, fintech, e-commerce, RPG…) qui composent direct le brief enrichi pour Taskforce.

### B. **Marketing → Flow handoff visible**
Quand un user en Marketing suite veut un site, bouton "Open in Flow" qui ouvre le brief enrichi côté Flow studio sans ressaisir.

### C. **Pentest as widget in Project studio**
Quand un projet Project est déployé, afficher en permanence un widget "Security score" (basé sur les findings pentest). Cliquable → onglet pentest avec les détails.

### D. **Cross-session dashboard**
Page `/projects` qui liste tous les sites/apps d'un org, avec status (live, building, error), URL, last deploy, credit consumption. Aujourd'hui split entre `/dashboard`, `/jobs`, `/settings/usage`.

### E. **Search.kalit ↔ Flow welcome**
La welcome page de Flow propose "X bonnes idées de sites en ce moment" tirées de search.kalit (idée du jour). User pick → spec auto-prefilled.

### F. **Marketing campaign generator post-deploy**
Modal après un `deploy_project` réussi: "Tu veux que je lance une mini-campagne email/social ? Je peux écrire 3 posts + 1 newsletter avec ce site comme sujet. ~500 credits". Un clic → bridge avec Marketing suite.

### G. **Org assets pool**
Les assets (logos, photos brand, colors, fonts) cherchés une fois sont partagés au niveau ORG. Le 5e site de la même org démarre avec une "brand kit" pré-rempli, no need to re-search.

### H. **Unified billing dashboard**
Une vue qui croise:
- Tokens broker (depuis Anthropic)
- Tokens taskforce (depuis Anthropic)
- Tokens findasset (depuis Ollama Cloud)
- Pentest scans
- Marketing sends
Avec drill-down par session, par suite, par jour. Déjà à moitié dans `/settings/usage` mais pas suite-aware.

### I. **Project history in dashboard**
Carrousel des dernières landings/apps/campagnes du user. Click → ré-ouvre la session. Utile pour reprendre.

### J. **Marketplace de templates internes**
"Charlotte de l'org X a fait un super site restaurant — réutiliser comme starter ?" — template-marketplace au niveau org. Combine la mémoire `org_memory` (broker) et l'UI Studio.

---

## Priorisation recommandée

| Priorité | Item | Impact UX |
| --- | --- | --- |
| 🔴 P0 | Inline diff post-patch (idée 2) | Transparency, build confidence |
| 🔴 P0 | Quota prediction (idée 7) | Trust + no surprise crashes |
| 🟠 P1 | Side-by-side preview (idée 1) | Time-to-feedback divisé par 5 |
| 🟠 P1 | Asset library org (idée 11 / synergie G) | Croissance des projets/user |
| 🟠 P1 | Cross-session dashboard (synergie D) | Tenue à l'échelle |
| 🟡 P2 | Templates par industrie (idée 6) | Onboarding nouveaux users |
| 🟡 P2 | Pentest widget (synergie C) | Security trust |
| 🟢 P3 | Multi-session split (idée 4) | Power users |
| 🟢 P3 | Marketing post-deploy (synergie F) | Cross-sell suite |

---

## Bugs UI vivants (ce session)

| Bug | Statut |
| --- | --- |
| Compteur credits stuck à 10000/10000 | ✅ Decimal(12,4) + getRemainingCredits |
| Build kalit-app cassé après schema migration | ✅ coerce Decimal → Number |
| Dev pointait localhost DB | ✅ `.env.local` sur prod Neon |
| pgbouncer plan cache 0A000 | ✅ `pgbouncer=true` |
| URL `apps1.kalit.ai` dans hint chat | ✅ broker rewrite |
| Avatar/identicon hydration mismatch | ✅ `randomizeIds: false` |
| Right panel cassé sur mobile | ✅ overlay + close button + force-closed mount |
| topRight overflow sur phone | ✅ flex-shrink + compact numbers |
| Badge sans bg dark mode | ✅ `--glass-50` + color-mix |
| Stream state leak entre sessions | ✅ resetStream sur handleSessionSelect |
| Project section "Completed" sur projet vide | ✅ stats.total > 0 guard |
| Publish button actif pendant build | ✅ disabled state |
| Quota ne baisse qu'à end-of-stream | ✅ optimistic decrement sur debug_summary |
| Quota pas affiché au mount | ✅ fetchQuota sur ready |
| `[ASSET-SEARCHES-COMPLETED]` leak chat | ✅ broker (déduit sur fragment FR) |

**Tous les bugs studio identifiés cette session sont fixés en local + push (Vercel auto-deploy).**

---

## Stack health summary

| Composant | État | Note |
| --- | --- | --- |
| Studio chat flow | 🟢 OK | SSE + healing solides, refacto useStudioChat à envisager |
| Sidebar sessions | 🟢 OK | Manque tags/dossiers à terme |
| File explorer | 🟢 OK | Manque diff + search |
| Mobile UX | 🟡 Acceptable | Fixes ce session, pas de QA systématique |
| Quota / billing UI | 🟢 OK depuis ce session | Manque prediction |
| Auth / JWT bridge | 🟡 Fonctionnel | Refresh non automatique, secrets divergents possibles |
| Performance polls | 🟡 À surveiller | 5+ polls indépendants en parallèle |
| Bundle size | 🟠 Inconnu | Pas mesuré récemment |
| Sécurité | 🟡 Standard | Manque CSP strict, rate limit user-side |
| i18n | 🟢 OK | FR/EN solide |
| A11y | 🟠 Partiel | aria-labels présents mais pas d'audit systématique |
