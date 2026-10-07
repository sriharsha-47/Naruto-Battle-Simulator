# Naruto Battle Simulator
### Turn-Based Combat • Adversarial Search • Intelligent Decision Making

> **Project:** Naruto Battle Simulator Using Adversarial AI  
> **Core Idea:** Build a playable battle simulator where the opponent doesn't just attack randomly — it **thinks, evaluates, searches, and adapts**.

---

##  01 — The Big Picture

```mermaid
flowchart LR
    A[" Human Player"] --> B[" Battle Engine"]
    C[" AI Player"] --> B

    B --> D[" Battle State"]
    D --> E[" HP"]
    D --> F[" Chakra"]
    D --> G[" Cooldowns"]
    D --> H[" Status / Effects"]

    B --> I[" Winner"]
```

The project combines a **game environment** with progressively stronger AI techniques.

### The AI Journey

```mermaid
flowchart LR
    R[" Random"] --> RB[" Rule-Based"]
    RB --> H[" Heuristic"]
    H --> M[" Minimax"]
    M --> AB[" Alpha-Beta"]

    style R fill:#2d2d2d,color:#fff
    style RB fill:#3d4f66,color:#fff
    style H fill:#4d5f3d,color:#fff
    style M fill:#654b7a,color:#fff
    style AB fill:#8a3f3f,color:#fff
```

**Goal:** demonstrate how decision quality and computational cost change as the AI becomes more sophisticated.

---

#  02 — What Are We Actually Building?

A **turn-based Naruto-inspired combat simulator** where:

-  Characters have different combat statistics.
-  Jutsu consume Chakra and may have cooldowns.
-  HP determines survival.
-  AI chooses actions instead of blindly attacking.
-  Advanced AI can look ahead at future battle states.
-  Human-vs-AI and AI-vs-AI battles can be played.
-  Hundreds of automated battles can be used to compare strategies.

> **Important:** Naruto is the theme.  
> **AI decision-making is the actual technical focus.**

---

#  03 — Core Battle Architecture

```mermaid
flowchart TB
    UI[" Pygame Interface"]
    UI --> CTRL[" Game Controller"]

    CTRL --> ENGINE[" Battle Engine"]

    ENGINE --> STATE[" Battle State"]
    ENGINE --> ACTION[" Action System"]
    ENGINE --> TURN[" Turn Manager"]
    ENGINE --> RULES[" Battle Rules"]

    STATE --> CHAR[" Character Data"]
    STATE --> RES[" HP +  Chakra"]
    STATE --> CD[" Cooldowns"]
    STATE --> EFFECT[" Status Effects"]

    ACTION --> JUTSU[" Jutsu / Abilities"]
    ACTION --> VALID[" Valid Actions"]

    ENGINE --> AI[" AI Layer"]

    AI --> RANDOM[" Random"]
    AI --> RULE[" Rule-Based"]
    AI --> HEUR[" Heuristic"]
    AI --> MINI[" Minimax"]
    AI --> ALPHA[" Alpha-Beta"]
```

### Design principle

The **battle engine should not depend on a particular AI**.

That means the same battle can be played by:

```text
Human
  ↓
Random AI
  ↓
Rule AI
  ↓
Heuristic AI
  ↓
Minimax
  ↓
Alpha-Beta
```

This makes fair comparison possible.

---

#  04 — Character Model

Initial prototype:

```mermaid
classDiagram
    class Character {
        +name
        +hp
        +max_hp
        +chakra
        +max_chakra
        +attack
        +defense
        +speed
        +abilities
        +cooldowns
    }

    class Ability {
        +name
        +damage
        +chakra_cost
        +cooldown
        +effect
        +target
    }

    Character "1" --> "*" Ability : owns
```

### Initial prototype

| Character | Role |
|---|---|
|  Naruto | Player / AI |
|  Sasuke | Opponent / AI |

We will begin small and expand only after the battle engine is stable.

---

#  05 — Battle Turn Pipeline

```mermaid
flowchart TD
    S[" Start Turn"] --> C[" Check Current State"]
    C --> V[" Generate Valid Actions"]

    V --> P{"Who is playing?"}

    P -->|Human| H[" Player Selects Action"]
    P -->|AI| A[" AI Evaluates Actions"]

    H --> X[" Selected Action"]
    A --> X

    X --> Q[" Validate Action"]
    Q --> E[" Execute Action"]

    E --> HP[" Update HP"]
    E --> CH[" Update Chakra"]
    E --> CD[" Update Cooldowns"]
    E --> ST[" Apply Effects"]

    HP --> W{" Battle Over?"}
    CH --> W
    CD --> W
    ST --> W

    W -->|No| N[" Next Turn"]
    N --> C

    W -->|Yes| END[" Declare Winner"]
```

---

#  06 — How the AI Thinks

The most important part of the project is the **decision pipeline**.

```mermaid
flowchart LR
    S[" Current Battle State"]
    S --> G[" Generate Legal Actions"]
    G --> SIM[" Simulate Actions"]
    SIM --> E[" Evaluate States"]
    E --> C[" Compare Outcomes"]
    C --> D[" Choose Best Action"]
    D --> X[" Execute"]
```

For simple AI, this pipeline is shallow.

For advanced AI, it becomes a **game-tree search**.

---

#  07 — Minimax

```mermaid
flowchart TD
    ROOT["Current State"] --> A1["AI: Attack"]
    ROOT --> A2["AI: Defense"]
    ROOT --> A3["AI: Recover Chakra"]

    A1 --> B1["Opponent Response 1"]
    A1 --> B2["Opponent Response 2"]

    A2 --> B3["Opponent Response 1"]
    A2 --> B4["Opponent Response 2"]

    A3 --> B5["Opponent Response 1"]
    A3 --> B6["Opponent Response 2"]

    B1 --> S1["Future State"]
    B2 --> S2["Future State"]
    B3 --> S3["Future State"]
    B4 --> S4["Future State"]
    B5 --> S5["Future State"]
    B6 --> S6["Future State"]

    S1 --> E[" Heuristic Evaluation"]
    S2 --> E
    S3 --> E
    S4 --> E
    S5 --> E
    S6 --> E
```

### Minimax idea

> **AI assumes the opponent will respond intelligently.**

So instead of asking:

> "Which attack looks best right now?"

the AI asks:

> "If I do this, what could the opponent do next — and how good is my position afterward?"

---

#  08 — Alpha-Beta Pruning

Minimax can explore a large number of states.

Alpha-Beta pruning removes branches that cannot influence the final decision.

```mermaid
flowchart LR
    M[" Full Minimax Tree"] --> P[" Alpha-Beta Pruning"]
    P --> R[" Fewer States Explored"]
    R --> F[" Faster Decision"]
```

### Experimental question

```text
Same battle
     │
     ├── Minimax depth 2
     ├── Minimax depth 3
     ├── Minimax depth 4
     │
     └── Alpha-Beta depth 4
                 ↓
        Compare search cost
        and decision time
```

The goal is to show that Alpha-Beta can reduce unnecessary exploration **without changing the Minimax result** for the same search configuration.

---

#  09 — Heuristic Evaluation

The AI needs a way to answer:

> **"How good is this battle state for me?"**

Conceptually:

```text
              OWN ADVANTAGE
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
      HP         Chakra      Battle Position
       │            │            │
       └────────────┼────────────┘
                    ↓
              STATE SCORE
                    ↑
       ┌────────────┼────────────┐
       ↑            ↑            ↑
 Opponent HP   Opponent Chakra   Threat
```

Possible factors:

-  Own HP
-  Opponent HP
-  Own Chakra
-  Opponent Chakra
-  Expected damage
-  Defensive advantage
-  Cooldowns
-  Active effects
-  Immediate threat

The exact weights will be decided during implementation and testing.

---

#  10 — Game Modes

```mermaid
flowchart TB
    MENU[" Main Menu"] --> H[" Human vs AI"]
    MENU --> A[" AI vs AI"]

    H --> B[" Battle"]
    A --> B

    B --> R[" Battle Result"]

    R --> H
    R --> A
    R --> MENU
```

### Human vs AI

Useful for demonstrating the project interactively.

### AI vs AI

More important for **scientific evaluation**, because hundreds of battles can be automated.

---

#  11 — AI Comparison System

```mermaid
flowchart LR
    A[" AI Strategy A"] --> B[" Automated Battles"]
    C[" AI Strategy B"] --> B

    B --> D[" Collect Results"]

    D --> E[" Win Rate"]
    D --> F[" Avg HP"]
    D --> G[" Chakra Efficiency"]
    D --> H[" Decision Time"]
    D --> I[" Search Nodes"]
    D --> J[" Battle Length"]
```

### Metrics

| Metric | Why it matters |
|---|---|
|  Win Rate | Overall effectiveness |
|  Average HP | Survival quality |
|  Average Damage | Offensive effectiveness |
|  Chakra Efficiency | Resource management |
|  Decision Time | Computational cost |
|  Search Nodes | Search complexity |
|  Battle Length | Battle behavior |

---

#  12 — Experimental Pipeline

```mermaid
flowchart TD
    SETUP[" Configure Battle"] --> MATCH[" Run AI vs AI"]
    MATCH --> REPEAT[" Repeat N Times"]
    REPEAT --> DATA[" Store Results"]

    DATA --> CLEAN[" Process Data"]
    CLEAN --> STATS[" Calculate Statistics"]
    STATS --> GRAPH[" Generate Graphs"]
    GRAPH --> ANALYSIS[" Compare AI Strategies"]
    ANALYSIS --> CONCLUSION[" Draw Conclusions"]
```

Possible experiments:

```text
Random vs Rule-Based
Random vs Heuristic
Rule-Based vs Heuristic
Heuristic vs Minimax
Minimax vs Alpha-Beta
```

And later:

```text
Alpha-Beta depth 2
Alpha-Beta depth 3
Alpha-Beta depth 4
Alpha-Beta depth 5
```

---

#  13 — Development Roadmap

```mermaid
flowchart LR
    P1["01\n Battle Engine"] --> P2["02\n Basic AI"]
    P2 --> P3["03\n Heuristic AI"]
    P3 --> P4["04\n Minimax"]
    P4 --> P5["05\n Alpha-Beta"]
    P5 --> P6["06\n Pygame"]
    P6 --> P7["07\n Experiments"]
    P7 --> P8["08\n Results"]
    P8 --> P9["09\n Report + README"]
```

### Phase breakdown

**01 — Battle Engine**
- Character model
- Ability system
- HP
- Chakra
- Cooldowns
- Turns
- Victory conditions

**02 — Basic AI**
- Random
- Rule-Based

**03 — Strategic AI**
- Heuristic evaluation

**04 — Adversarial Search**
- Minimax

**05 — Optimization**
- Alpha-Beta pruning

**06 — Interface**
- Pygame battle UI

**07 — Experiments**
- AI-vs-AI tournaments
- Automated battles

**08 — Analysis**
- Graphs
- Tables
- Performance comparison

**09 — Documentation**
- Final report
- Screenshots
- README
- Project presentation

---

#  14 — Planned Project Structure

We will **not create all of this immediately**.

```text
naruto-battle-ai/
│
├──  Overview.md
├──  requirements.txt
├──  .gitignore
│
├──  src/
│   ├── main.py
│   ├── battle/
│   ├── models/
│   ├── ai/
│   └── data/
│
├──  tests/
│
├──  experiments/
│
├──  assets/
│
└──  README.md          ← created near the end
```

> **Architecture rule:** establish the core structure early, then extend it instead of repeatedly redesigning it.

---

#  15 — Technology Stack

```mermaid
flowchart TB
    PY[" Python"] --> GAME[" Battle Simulator"]

    GAME --> PG[" Pygame"]
    GAME --> NP[" NumPy"]

    GAME --> AI[" AI Algorithms"]
    AI --> HEUR[" Heuristics"]
    AI --> MINI[" Minimax"]
    AI --> AB[" Alpha-Beta"]

    GAME --> DATA[" Experiment Data"]
    DATA --> MPL[" Matplotlib"]
```

### Main technologies

- **Python** — core implementation
- **Pygame** — graphical interface
- **NumPy** — numerical operations where useful
- **Matplotlib** — experimental visualization
- **JSON / Python data structures** — character and ability data

---

#  16 — Initial Prototype

We start **small**.

```mermaid
flowchart LR
    N[" Naruto"] --> B[" Battle Engine"]
    S[" Sasuke"] --> B

    B --> A[" 3–4 Actions"]
    B --> HP[" HP"]
    B --> C[" Chakra"]
    B --> T[" Turn System"]
    B --> W[" Win Condition"]

    B --> AI[" Basic AI"]
```

### First milestone

**Naruto vs Sasuke**

with:

- 2 characters
- 3–4 abilities
- HP
- Chakra
- Turn system
- Action validation
- Basic AI
- Battle log
- Victory condition

No fancy GUI yet.

**First make the brain work. Then make it look good.**

---

#  17 — What Makes This More Than a Game?

The project is designed as an **AI experiment wrapped inside a playable game**.

```mermaid
flowchart TB
    GAME[" Game Environment"] --> STATE[" State Representation"]
    STATE --> DECISION[" AI Decision Making"]
    DECISION --> ACTION[" Action"]
    ACTION --> RESULT[" Result"]

    RESULT --> LEARN[" Analyze Performance"]
    LEARN --> IMPROVE[" Tune / Improve AI"]
    IMPROVE --> DECISION
```

The final project should allow us to investigate:

- Does heuristic reasoning beat random decisions?
- Does Minimax improve decision quality?
- What happens when search depth increases?
- How much work does Alpha-Beta eliminate?
- What is the trade-off between stronger decisions and computation time?

---

#  18 — Final Vision

```mermaid
flowchart TB
    START[" CHOOSE YOUR FIGHTER"] --> BATTLE[" ENTER BATTLE"]

    BATTLE --> PLAYER[" HUMAN"]
    BATTLE --> AI[" AI"]

    PLAYER --> STATE[" BATTLE STATE"]
    AI --> THINK[" THINK"]

    THINK --> SEARCH[" SEARCH FUTURE"]
    SEARCH --> SCORE[" SCORE STATES"]
    SCORE --> ACTION[" BEST ACTION"]

    STATE --> ACTION
    ACTION --> BATTLE

    BATTLE --> RESULT[" RESULT"]

    RESULT --> DATA[" PERFORMANCE DATA"]
    DATA --> INSIGHT[" AI INSIGHTS"]
```

##  The Final Goal

> **Build a battle simulator where the AI doesn't just fight — it reasons.**

The Naruto theme makes the project engaging.

The battle engine makes it playable.

The heuristic system makes it intelligent.

Minimax makes it adversarial.

Alpha-Beta makes it efficient.

The experiments make it an **AI project rather than just a game**.

---

##  Current Status

### ` PROJECT SETUP`

- [x] Project idea finalized
- [x] AI approach planned
- [x] Initial scope defined
- [x] Development pipeline defined
- [ ] GitHub repository initialized
- [ ] Battle engine
- [ ] Character system
- [ ] Ability system
- [ ] Basic AI
- [ ] Heuristic AI
- [ ] Minimax
- [ ] Alpha-Beta
- [ ] Pygame interface
- [ ] AI-vs-AI experiments
- [ ] Results and graphs
- [ ] Final report
- [ ] README

---

###  First Coding Milestone

**Naruto vs Sasuke → Working battle engine → Basic AI**

Everything else builds on that foundation.
