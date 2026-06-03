# 🎮 Chain Reaction

A strategic, turn-based multiplayer board game built on the **PERN Stack** (PostgreSQL, Express, React, Node.js). This project transitions a classic tactical grid game into a modern, real-time distributed application featuring secure authentication and robust system design.

---

## 🎯 The Objective
The goal is simple yet intense: **Take absolute control of the grid by eliminating all of your opponents' orbs.** If an opponent has no orbs remaining on the board, they are eliminated.

---

## 🕹️ How to Play

1. **Take Turns:** Players take turns placing a single orb of their assigned color into an eligible cell on the grid.
2. **Claiming Cells:** You can place an orb into an **empty cell** (which claims ownership) or a **cell you already own** (which increments its orb count).
3. **Illegal Moves:** You can **never** place an orb into a cell currently owned by an opponent.

---

## 💥 Core Mechanics: Critical Mass

Every cell on the board has a strict storage capacity determined by its physical location on the grid. Reaching **Critical Mass** triggers an explosion.

| Cell Type | Location | Capacity (Max Orbs) | Explosion Threshold |
| :--- | :--- | :---: | :---: |
| 📐 **Corner** | Any of the 4 corners | **1 Orb** | Explodes on the **2nd** orb |
| 📏 **Edge** | Any outer border cell | **2 Orbs** | Explodes on the **3rd** orb |
| 🛡️ **Middle** | Any internal cell | **3 Orbs** | Explodes on the **4th** orb |

---

## 🚀 The Chain Reaction Cascade

When a cell reaches its threshold and explodes, the following atomic sequence occurs:

```
[Cell Explodes] ──> [Resets to Empty (0)]
                       │
                       └──> [Fires 1 Orb to Neighbors]
                               │
                               ├──> Owners Change: Opponent cells become YOURS
                               └──> Secondary Explosions: Triggers adjacent cascades
```

* **The Takeover:** Any opponent-owned cells hit by the exploding orbs instantly **change color** and transfer ownership to you.
* **The Chain Reaction:** If a neighboring cell was already at its critical mass limit, your incoming orb pushes it over the edge, causing a **secondary explosion**. This can trigger a massive, unpredictable cascade that wipes out entire sections of the board in a single turn!

---

## 🗺️ Engineering Roadmap
* **Phase 1:** The Walking Skeleton (Secure User Registration, JWT Login/Logout, Database Pipeline) 🔄 *[Current]*
* **Phase 2:** Single-Screen Engine (Local gameplay mechanics, state persistence, match history logs) 📊
* **Phase 3:** Real-Time Distributed Multiplayer (Low-latency syncing via WebSockets) 🌐
