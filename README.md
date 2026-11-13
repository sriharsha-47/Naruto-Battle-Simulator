# 🍥 Naruto Battle Simulator — Ultimate Edition
### Turn-Based Combat • Adversarial Search • Intelligent Decision Making

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React: 18](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC.svg)](https://tailwindcss.com/)

A premium, anime-themed turn-based tactical combat simulator coupled with a rigorous **Artificial Intelligence & Adversarial Search Laboratory**. This project brings classical AI theory to life — comparing decision quality, speedup, and pruning efficiency across multiple algorithms inside an authentic shinobi battle arena.

---

## 🌟 Key Highlights & Features

- **🥋 10 Balanced Shinobi Roster**: Naruto Uzumaki, Sasuke Uchiha, Sakura Haruno, Kakashi Hatake, Itachi Uchiha, Gaara, Rock Lee, Neji Hyuga, Madara Uchiha, and Minato Namikaze.
- **⚡ Authentic Jutsu & Resource System**: Health Points (HP), Chakra management, cooldown tracking, shields, stuns, burn/poison damage-over-time, and ultimate abilities.
- **🧠 5 Fully-Implemented AI Strategies**:
  1. **Random AI**: Uniform random legal action selection baseline.
  2. **Rule-Based AI**: 8-tier expert decision hierarchy prioritizing lethal strikes, emergency healing, ultimate moves, and anticipatory defending.
  3. **Heuristic AI**: Configurable 5-factor evaluation weighting relative HP advantage, chakra conservation, and active status effects.
  4. **Minimax AI**: Genuine multi-ply adversarial search modeling opponent counter-moves.
  5. **Alpha-Beta Pruning**: Optimized adversarial search with move-ordering heuristics, alpha/beta bounds, and identical mathematical evaluations with drastically reduced node expansion.
- **📊 Comprehensive AI Laboratory & Visualizer**:
  - Interactive Game Tree explorer visualizing root, minimax nodes, and pruned branches.
  - Tactical Decision Explainer breaking down why an action was chosen over alternatives.
  - Head-to-head benchmarking and tournament simulation engine.
- **🎨 Premium Anime Cyber Aesthetic**:
  - Deep obsidian dark UI, electric blue chakra glows, fiery orange accents, and custom CSS-crafted shinobi insignias (zero fragile external image links).
  - Synthesized dynamic sound effects powered entirely by the Web Audio API.

---

## 🏗️ Architecture Overview

```text
naruto-battle-simulator/
├── backend/
│   ├── ai/                  # AI Algorithm implementations
│   │   ├── base.py          # Abstract Base AI class
│   │   ├── random_ai.py     # Random baseline
│   │   ├── rule_based.py    # Priority-rule expert system
│   │   ├── heuristic.py     # Feature evaluation function
│   │   ├── minimax.py       # Full adversarial game-tree search
│   │   ├── alphabeta.py     # Alpha-Beta pruning with move ordering
│   │   └── ai_factory.py    # Strategy factory
│   ├── analytics/           # Step metrics and performance aggregator
│   ├── api/                 # FastAPI server & route handlers
│   │   ├── routes/          # Endpoints for battle, characters, AI, tournament, history
│   │   └── main.py          # FastAPI application entry point with CORS
│   ├── data/                # Balanced character stats and ability definitions
│   ├── database/            # SQLite persistence for battle history & metrics
│   ├── engine/              # Turn-based combat engine, validation & damage calculations
│   ├── models/              # Pydantic v2 domain schemas (Character, Ability, State)
│   ├── tournament/          # Automated bracket elimination engine
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed API client with complete offline simulation fallback
│   │   ├── components/      # Reusable combat UI, visualizers, radar charts, bars
│   │   ├── pages/           # 12 complete pages (Arena, AI Lab, Tree Visualizer, etc.)
│   │   ├── store/           # Zustand reactive state stores
│   │   ├── types/           # TypeScript definitions mirroring backend schemas
│   │   ├── utils/           # Web Audio API sound synthesizer & client-side AI
│   │   ├── App.tsx          # Main React router
│   │   └── main.tsx         # Root DOM mount
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── Overview.md              # Original system blueprint
├── TODO.md                  # Comprehensive build status and task checklist
└── README.md                # Project documentation & execution guide
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher & npm

### 2. Backend Setup
```bash
# Navigate to repository root
cd naruto-battle-simulator

# Install backend dependencies
pip install -r backend/requirements.txt

# Launch FastAPI server
cd backend
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API docs will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd naruto-battle-simulator/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Open your browser at: [http://localhost:5173](http://localhost:5173)

*(Note: The frontend includes a full offline simulation fallback engine. If the backend is not yet started, battles, AI algorithms, and sound effects can still be previewed in the browser!)*

---

## 📋 What Still Needs To Be Done (Roadmap & Next Steps)

While the full core engine, all 5 AI algorithms, API layer, and all 12 frontend pages are written, the following tasks remain for full end-to-end polish and verification:

### 🔴 High Priority (Verification & Execution)
1. **Dependency Installation**:
   - Run `npm install` inside `frontend/` to download and install node modules.
   - Run `pip install -r backend/requirements.txt` to install FastAPI, Pydantic, and Uvicorn.
2. **Type Checking & Build Audit**:
   - Run `npx tsc --noEmit` in `frontend/` and resolve any minor type discrepancies between generated components.
   - Ensure `npm run build` generates a clean production bundle.
3. **End-to-End API Integration Testing**:
   - Start the FastAPI backend and test live battle requests (`POST /api/battle/start`, `POST /api/battle/{id}/action`).
   - Validate live AI moves and decision tree data streamed to the frontend game-tree visualizer.

### 🟡 Medium Priority (Automated Test Suites & Edge Cases)
4. **Backend Pytest Suite**:
   - Write unit tests under `backend/tests/` to verify:
     - Resource bounding (HP and Chakra never drop below 0).
     - Minimax vs. Alpha-Beta score equivalence (must yield identical optimal scores for the same state/depth).
     - Alpha-Beta pruning efficiency (pruned node count > 0).
     - Status effect expiration (cooldown decrements, stun removal).
5. **Real Tournament Data Seeding**:
   - Execute batch AI tournaments (e.g., 50 matches of Rule-Based vs. Alpha-Beta) to pre-populate SQLite with real historical analytics.

### 🟢 Low Priority (UI/UX Polish)
6. **Mobile Viewport Optimization**:
   - Fine-tune side-by-side action docks for narrow mobile screens.
7. **Extended Audio Synthesizer**:
   - Add specialized sound frequencies for Ultimate Jutsu execution (e.g., Kirin thunder pitch, Rasenshuriken wind whir).

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.
