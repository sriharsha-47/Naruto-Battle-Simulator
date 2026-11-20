# Naruto Battle Simulator

**A comparative AI decision laboratory for tactical, turn-based combat.**

Naruto Battle Simulator is a full-stack project that combines a playable Naruto-inspired battle environment with a collection of AI agents. All backend agents operate on a shared battle model and legal-action generator, but differ in how they choose a move: from random and rule-based choices to adversarial game-tree search, probabilistic opponent modelling, Monte Carlo sampling, and evolutionary planning.

The project is intended to make decision-making inspectable. Alongside the selected action, the backend can report action evaluations and computation statistics such as search depth, expanded nodes, pruned nodes, simulations, and execution time. The frontend also contains a browser-side simulation path for interactive play and benchmarking; it is a separate TypeScript implementation and should not be treated as numerically interchangeable with the Python backend. Some API-client calls also have request/response contract drift and can silently fall back to browser-side mock or simulation data.

---

## Contents

- [What the project includes](#what-the-project-includes)
- [AI strategy portfolio](#ai-strategy-portfolio)
- [Research foundations and references](#research-foundations-and-references)
- [Battle model and shared evaluation](#battle-model-and-shared-evaluation)
- [Application architecture](#application-architecture)
- [Getting started](#getting-started)
- [Using the application](#using-the-application)
- [Backend API](#backend-api)
- [Experiments and interpreting results](#experiments-and-interpreting-results)
- [Repository structure](#repository-structure)
- [Current limitations and reproducibility notes](#current-limitations-and-reproducibility-notes)
- [Team](#team)
- [License](#license)

## What the project includes

- **10 playable characters:** Naruto Uzumaki, Sasuke Uchiha, Sakura Haruno, Kakashi Hatake, Itachi Uchiha, Gaara, Rock Lee, Neji Hyuga, Madara Uchiha, and Minato Namikaze.
- **Turn-based tactical combat:** basic attacks, defending, chakra recovery, character abilities, ability costs and cooldowns, ultimate abilities, shields, healing, chakra drain, buffs, debuffs, poison, burn, and stun.
- **Eight Python AI strategies:** Random, Rule-Based, Heuristic, Minimax, Alpha–Beta, Expectimax, Monte Carlo Tree Search (MCTS), and Rolling-Horizon Evolutionary Algorithm (RHEA).
- **Explainability endpoints:** compare candidate-action evaluations and inspect Minimax / Alpha–Beta game trees.
- **Tournament and persistence services:** bracket-style AI tournaments, battle records, per-decision AI metrics, and SQLite-backed summary/comparison endpoints.
- **React interface:** landing page, dashboard, character catalogue, battle setup and arena, AI research lab, decision explainer, game-tree visualizer, tournament page, battle history, and settings.

## AI strategy portfolio

The backend strategy registry is defined by `backend/models/enums.py` and `backend/ai/ai_factory.py`. The eight strategies are distinct implementations:

| Strategy | Decision method | What it does |
|---|---|---|
| **Random** | Random baseline | Selects uniformly from the currently legal actions. Useful as a non-planning reference point. |
| **Rule-Based** | Ordered expert rules | Applies a priority hierarchy: take a lethal action, respond to critical health, use a suitable ultimate, recover chakra when appropriate, defend against a ready opponent ultimate, prefer damaging abilities, then use utility or a fallback action. |
| **Heuristic** | One-ply look-ahead | Simulates each legal action once and chooses the successor state with the highest shared heuristic evaluation. |
| **Minimax** | Adversarial game-tree search | Alternates MAX decisions for the AI and MIN decisions for the opponent, assuming the opponent chooses the reply least favourable to the AI. |
| **Alpha–Beta** | Pruned adversarial search | Computes the Minimax decision while using alpha/beta bounds and move ordering to skip branches that cannot affect the final choice. |
| **Expectimax** | Probabilistic opponent model | Uses MAX nodes for its own turns and chance nodes for opponent turns. Opponent actions receive softmax/Boltzmann probabilities based on their one-step heuristic scores. |
| **MCTS** | Monte Carlo Tree Search (UCT) | Repeatedly selects and expands actions, runs bounded stochastic rollouts, and backpropagates rewards. The implementation selects the most-visited root action. |
| **RHEA** | Rolling-horizon evolutionary planning | Evolves short sequences of future actions using a population, tournament selection, elitism, uniform crossover, and mutation; executes the first action and replans on the next turn. |

### Important implementation details

- Minimax and Alpha–Beta default to a search depth of **3** in their constructors (the caller can override it).
- Expectimax defaults to depth **3**, temperature **12.0**, and a node budget of **2,500**. Its opponent model is hand-designed; it is **not trained from match data**.
- MCTS defaults to **150 iterations**, a **700 ms** time limit, exploration constant **1.2**, and rollout depth **8**. Its rollout policy is biased rather than purely random.
- RHEA defaults to horizon **3**, population **10**, **8 generations**, and **2** fitness samples. It models opponent turns with a greedy action policy.
- Alpha–Beta orders candidate actions using a tactical priority heuristic (ultimate, stun, damage, healing, shield, and other actions) to encourage earlier cutoffs.

These are the defaults visible in the Python implementation, not universal properties of the algorithms.

## Research foundations and references

The project adapts established search and planning methods to its battle-state/action model. The research contribution is the integration of these methods into one comparative simulator, their game-specific implementation, and the exposure of decision/search information—not the invention of the underlying algorithms.

| Implemented method / concept | Reference | Project implementation |
|---|---|---|
| Alpha–Beta pruning | Knuth, D. E. & Moore, R. W. (1975). “An Analysis of Alpha-Beta Pruning.” *Artificial Intelligence*, 6(4), 293–326. [https://doi.org/10.1016/0004-3702(75)90019-3](https://doi.org/10.1016/0004-3702(75)90019-3) | `backend/ai/alphabeta.py` |
| Expectimax | UC Berkeley CS 188. “Expectimax.” [https://inst.eecs.berkeley.edu/~cs188/textbook/games/expectimax.html](https://inst.eecs.berkeley.edu/~cs188/textbook/games/expectimax.html) | `backend/ai/expectimax.py`, `backend/ai/search_utils.py` |
| Softmax / Boltzmann action selection | Sutton, R. S. & Barto, A. G. (2018). *Reinforcement Learning: An Introduction*, 2nd ed., §2.3. MIT Press. | Softmax opponent-action distribution in `backend/ai/expectimax.py` |
| Monte Carlo Tree Search / UCT | Kocsis, L. & Szepesvári, C. (2006). “Bandit Based Monte-Carlo Planning.” *ECML 2006*, 282–293. [https://doi.org/10.1007/11871842_29](https://doi.org/10.1007/11871842_29) | `backend/ai/mcts.py` |
| Rolling-Horizon Evolutionary Algorithm | Gaina, R. D. et al. (2021). “Rolling Horizon Evolutionary Algorithms for General Video Game Playing.” *IEEE Transactions on Games*, 14(2), 232–242. [https://doi.org/10.1109/TG.2021.3060282](https://doi.org/10.1109/TG.2021.3060282) | `backend/ai/evolutionary.py` |
| Minimax and game-tree search concepts | UC Berkeley CS 188. “Minimax.” [https://inst.eecs.berkeley.edu/~cs188/textbook/games/minimax.html](https://inst.eecs.berkeley.edu/~cs188/textbook/games/minimax.html) | `backend/ai/minimax.py` |

The references above identify the methods' foundations. The project code is an application/adaptation of those methods to this simulator; it should not be described as a verbatim reproduction of every paper's full experimental setup.

## Battle model and shared evaluation

### State representation

A battle state contains two character instances, current player, turn count, battle status, turn limit, optional AI strategy identifiers, and an event log. Character state includes:

- Current and maximum health (HP).
- Current and maximum chakra.
- Attack/defence/speed attributes and derived effective stats.
- Available abilities, chakra costs, cooldowns, and ultimate flags.
- Active shields, defending state, and timed status effects.

`ActionValidator` determines which actions are legal before an agent can select one. `BattleEngine` is the shared rules boundary for action execution and simulation. `simulate_action` clones the state and applies deterministic damage for search; actual battle execution can use stochastic damage/recovery.

### Shared heuristic evaluator

Search-oriented agents use the evaluator in `backend/ai/heuristic.py`. Its default non-terminal score is:

\[
E(s,p)=40H_p-40H_o+10C_p-10C_o+5(S_p-S_o)
\]

where:

- \(H_p,H_o\) are the own and opponent HP ratios.
- \(C_p,C_o\) are the own and opponent chakra ratios (with a defined fallback for characters whose maximum chakra is zero).
- \(S_p,S_o\) are status-advantage scores incorporating shields, defending, buffs, debuffs, poison, burn, and stun.

Terminal outcomes override the heuristic: win = **+10,000**, loss = **−10,000**, draw = **0**, from the evaluating player's perspective. The weights are configurable through `HeuristicWeights` and the settings API.

## Application architecture

```text
React 18 + TypeScript + Vite + Zustand + Tailwind CSS
                    │
                    │ HTTP / JSON (/api/...)
                    ▼
             FastAPI application
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
   Battle API    AI API     Tournament / Analytics
        │           │            │
        └───────────┼────────────┘
                    ▼
             Shared Python domain
   BattleEngine · ActionValidator · DamageCalculator
                    │
                    ▼
     Eight backend AI strategy implementations
                    │
                    ▼
       SQLite battle / metric / tournament data
```

**Backend:** Python, FastAPI, Pydantic, Uvicorn, SQLite.

**Frontend:** React 18, TypeScript, Vite, React Router, Zustand, Tailwind CSS, Framer Motion, Recharts, and Lucide icons.

**Important:** the frontend includes its own TypeScript battle simulator and AI utilities (`frontend/src/utils/aiEngine.ts`, `frontend/src/utils/advancedAI.ts`, and `frontend/src/utils/benchmark.ts`) and an API client with local fallback behaviour (`frontend/src/api/client.ts`). This supports browser-side/offline interaction, but it is a second execution path. Backend Python outcomes, node counts, benchmark numbers, and TypeScript fallback results should be labelled by execution path and not mixed as if they came from one engine.

## Getting started

### Requirements

- Python **3.10 or newer**.
- Node.js and npm (Node.js 18+ recommended for this Vite setup).
- A modern browser.
- No GPU is required for the implemented search agents.

### 1. Clone the repository

```bash
git clone https://github.com/sriharsha-47/Naruto-Battle-Simulator.git
cd Naruto-Battle-Simulator
```

### 2. Set up and run the backend

From the repository root:

```bash
python -m venv .venv
```

Activate the environment:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install the backend dependencies and start the API:

```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
```

The API root is [http://localhost:8000](http://localhost:8000), the health check is [http://localhost:8000/health](http://localhost:8000/health), and interactive OpenAPI documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

> Run Uvicorn from the **repository root** using `backend.api.main:app`; the backend modules import through the `backend` package.

### 3. Set up and run the frontend

Open a second terminal, navigate to `frontend/`, and install dependencies:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the application at [http://localhost:5173](http://localhost:5173). The Vite development server proxies `/api` requests to `http://localhost:8000` (see `frontend/vite.config.ts`).

To create and preview a production build:

```bash
npm run build
npm run preview
```

The build script runs TypeScript checking (`tsc`) before Vite bundling.

### Optional: configure the API URL

The frontend defaults to `http://localhost:8000`. Set `VITE_API_URL` in a frontend environment file when the backend is hosted elsewhere, for example:

```env
VITE_API_URL=http://localhost:8000
```

For a same-origin deployment, configure the reverse proxy and API base URL accordingly.

## Using the application

The main application routes are:

| Route | Purpose |
|---|---|
| `/` | Project landing page |
| `/dashboard` | Dashboard and benchmark/history summaries |
| `/characters` | Character catalogue and comparison |
| `/battle/setup` | Configure a battle |
| `/battle/:id` | Play or inspect a battle |
| `/ai-lab` | Run browser-side strategy benchmarks and inspect the strategy portfolio |
| `/ai-lab/explainer` | Inspect a selected decision and alternatives |
| `/ai-lab/game-tree` | Explore a game tree |
| `/tournament` | Configure and run an AI tournament |
| `/history` | Review stored/local battle history |
| `/settings` | Configure application settings |

For the most useful algorithm demonstration, choose one battle state and compare Minimax, Alpha–Beta, Expectimax, MCTS, and RHEA. Then inspect the action evaluations and (for Minimax/Alpha–Beta) the game tree. Keep character selection, state, depth, and configuration fixed when making a controlled comparison.

## Backend API

The FastAPI app exposes these principal routes. Note that history endpoints are mounted under `/api/battles`, and that the TypeScript API client currently sends a few payload shapes/paths that do not match these backend Pydantic contracts; see [Current limitations and reproducibility notes](#current-limitations-and-reproducibility-notes).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API identity/version response |
| `GET` | `/health` | Health check |
| `GET` | `/api/characters` | List the character catalogue |
| `GET` | `/api/characters/{character_id}` | Retrieve one character |
| `POST` | `/api/battle/start` | Create a battle |
| `GET` | `/api/battle/{battle_id}/state` | Read an active battle state |
| `POST` | `/api/battle/{battle_id}/action` | Submit a player action |
| `POST` | `/api/battle/{battle_id}/ai-move` | Ask the configured backend agent to choose (and optionally execute) a move |
| `POST` | `/api/ai/explain` | Return selected move, alternatives, projected state and decision metadata |
| `POST` | `/api/ai/game-tree` | Return a Minimax or Alpha–Beta game tree (depth is capped at 3 by the route) |
| `POST` | `/api/tournament/start` | Create and optionally execute a tournament |
| `GET` | `/api/tournament/{tournament_id}/status` | Retrieve tournament status |
| `GET` | `/api/analytics/summary` | Aggregate persisted battle and AI metrics |
| `GET` | `/api/analytics/ai-comparison` | Head-to-head and Minimax/Alpha–Beta metric comparison |
| `GET` | `/api/battles/history` | List persisted battle records |
| `GET` | `/api/battles/{battle_id}/detail` | Retrieve a battle record, log, and AI metrics |
| `GET` | `/api/settings` | Read configurable AI/battle settings |
| `PUT` | `/api/settings` | Update settings |

Use `/docs` for the exact request and response schemas. Active backend battles are held in memory; completed battle records, AI metrics, and tournament records are written to SQLite.

### Example: start a battle

```bash
curl -X POST http://localhost:8000/api/battle/start \
  -H 'Content-Type: application/json' \
  -d '{
    "player1_character_id": "naruto",
    "player2_character_id": "sasuke",
    "ai1_strategy": "alpha_beta",
    "ai2_strategy": "expectimax"
  }'
```

The response includes the battle state and the legal actions for the player whose turn it is. Character IDs can be checked with `GET /api/characters`.

## Experiments and interpreting results

The backend records, where produced by an AI decision, fields such as strategy, selected action, best score, nodes explored, nodes pruned, execution time, and search depth. The analytics service aggregates persisted records. The frontend's AI Lab also has a browser-side benchmark utility that can run strategy-versus-greedy batches and store its results in browser storage.

### Reproduced smoke-check observation

The supplied project presentation reports one controlled Naruto–Sasuke state evaluated once at each depth. A fresh backend check in the supplied archive, using the initial Naruto–Sasuke state generated by the included character data and the current player determined by speed, reproduced the same figures:

| Search depth | Minimax nodes explored | Alpha–Beta nodes explored | Root score from both | Fewer expansions |
|---:|---:|---:|---:|---:|
| 2 | 56 | 20 | −2.96 | 64.3% |
| 3 | 371 | 81 | 5.75 | 78.2% |

This is a **single-state smoke check**, not a broad performance claim or statistical benchmark. The backend counter named `nodes_pruned` counts cut-off sibling branches, not every descendant omitted beneath those branches; it should not be interpreted as a complete count of all skipped tree nodes.

### Recommended controlled evaluation

For a stronger comparison, run many matches per pairing with multiple random seeds and character pairings. Report, at minimum:

- Win, loss and draw counts/rates, with the number of matches.
- Confidence intervals or another uncertainty measure for win rates.
- Mean/median decision time and node expansions per move.
- Search depth, simulations, and relevant algorithm configuration.
- Character matchup, starting-player advantage, and any stochastic settings.
- Whether each result came from the Python backend or TypeScript browser fallback.

Do not present seeded browser history, placeholder UI values, or an empty database as measured experimental results. The database included in the archive has its schema but contains **zero battle records, zero AI-metric records, and zero tournament records** at packaging time; analytics therefore starts empty until backend matches are played and recorded.

## Repository structure

```text
Naruto-Battle-Simulator/
├── backend/
│   ├── ai/                 # Eight strategy implementations and AI factory
│   ├── analytics/          # Metric collection and aggregation
│   ├── api/                # FastAPI app, schemas and route handlers
│   ├── data/               # Character catalogue and loader
│   ├── database/           # SQLite persistence and record models
│   ├── engine/             # Battle rules, legal-action validation, damage
│   ├── models/             # Character, ability, battle-state and enum models
│   └── tournament/         # Bracket creation and automated match execution
├── frontend/
│   ├── src/
│   │   ├── api/             # API client and frontend sample data
│   │   ├── components/      # Battle, character, layout and shared components
│   │   ├── pages/           # Application screens
│   │   ├── store/           # Zustand stores
│   │   ├── types/           # TypeScript domain types
│   │   └── utils/           # Browser battle/AI, benchmark and UI utilities
│   ├── package.json
│   └── vite.config.ts
├── Overview.md              # Earlier project concept and design notes
├── TODO.md                  # Development checklist
├── requirements.txt         # Root Python dependency list
└── README.md
```

## Current limitations and reproducibility notes

The archive and source inspection reveal several details worth knowing before interpreting results or deploying the project:

1. **Two AI execution paths:** Python backend agents and TypeScript browser agents are separate implementations. A frontend fallback can run when the API is unavailable, so check which path produced a result before comparing metrics.
2. **Strategy naming differs:** the backend registers `rule_based` and `heuristic`; the frontend strategy type uses `greedy` and does not expose the backend `rule_based` / `heuristic` labels as the same set. Treat `greedy` as a frontend strategy, not as another name for the backend Rule-Based agent.
3. **Backend in-memory active battles:** active backend battle states are stored in a process-local dictionary. Restarting the server loses active matches; completed records and metrics are persisted in SQLite.
4. **Empty packaged analytics:** the SQLite database in this archive has no battle, metric, or tournament rows. Run actual backend matches before drawing conclusions from backend analytics.
5. **CORS configuration:** the FastAPI app currently allows all origins (`*`). Restrict this to trusted frontend origins before a public production deployment.
6. **Reproducibility:** stochastic battle execution, random agents, MCTS rollouts, and RHEA population initialization can vary between runs. Record seeds and full configuration when conducting experiments. The `RandomAI` constructor seeds Python’s process-global random generator when a seed is supplied, so be mindful of cross-agent random-state effects in a test harness.
7. **API-client contract drift:** source inspection shows that several calls in `frontend/src/api/client.ts` do not match the backend. For example, the backend expects `player1_character_id` / `player2_character_id`, while the frontend start-battle path sends its own camelCase `BattleConfig`; backend battle-state reads use `/state` while the frontend asks for the bare battle ID; action, AI-explanation, game-tree, tournament, analytics, and history payloads/paths also differ. Since `apiFetch` catches errors and falls back locally, the UI may continue to operate while using the TypeScript engine or demo fallback rather than the Python backend. Verify network requests before claiming an end-to-end backend integration.
9. **Frontend build verification:** the standard frontend build requires a complete and platform-compatible npm dependency installation. If `npm run build` fails, first remove an incomplete `node_modules` directory and run `npm ci` (or `npm install`) in `frontend/` on the target OS.

The README describes features present in the supplied archive. It does not claim that every UI analytics view is backed by a populated experiment dataset or that a full statistical evaluation has already been performed.

## Team

The final project presentation identifies the following five-member team:

- **S. Sri Harsha** — B24DS031
- **M. Uday** — B24CS025
- **M. Nehemya** — B24EC015
- **N. Sravan Kumar** — B24CS032
- **T. Preethi Vardhan** — B24CS046

## License

This project is distributed under the MIT License. See [`LICENSE`](LICENSE) for the full license text.
