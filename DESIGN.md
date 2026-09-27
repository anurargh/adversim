# DESIGN.md — Impeccable Style System for AdverSim
// Aligned with impeccable.style design system specifications by Paul Bakaus

## 1. Aesthetic Archetype & Mood
- **Archetype**: *Dark Mode First • High-Precision Defense Operations Center (DOC)*
- **Tone**: Rigorous, technical, restrained, authoritative. Avoid frivolous fluff, cartoon pills, and generic SaaS tropes.
- **Visual Weight**: Deep dark obsidian canvas punctured by intentional, calibrated telemetry signals.

## 2. Color Palette & Functional Semantics
- **Background Root**: `#06080e` (Obsidian Deep Space)
- **Surface Elevation 1 (Cards, Headers)**: `#0b0f19` / `rgba(15, 23, 42, 0.7)` with subtle `border-slate-800/80`
- **Surface Elevation 2 (Inputs, Code blocks)**: `#030712` / `rgba(2, 6, 23, 0.85)` with `border-slate-800`
- **Signal — Cyan (Telemetry / Verified Stability)**:
  - Text: `#22d3ee` (cyan-400), `#67e8f9` (cyan-300)
  - Surface: `rgba(6, 182, 212, 0.1)`
  - Accent / Focus: `#06b6d4` (cyan-500)
- **Signal — Amber / Orange (Adversary Probing / Active Attack)**:
  - Text: `#f59e0b` (amber-500), `#fbbf24` (amber-400)
  - Surface: `rgba(245, 158, 11, 0.12)`
- **Signal — Crimson / Rose (Critical Breach / Compromised Asset)**:
  - Text: `#f43f5e` (rose-500), `#fb7185` (rose-400)
  - Surface: `rgba(244, 63, 94, 0.12)`
- **Signal — Emerald (Decoy Divergence / Mitigated / Hardened)**:
  - Text: `#10b981` (emerald-500), `#34d399` (emerald-400)
  - Surface: `rgba(16, 185, 129, 0.12)`

## 3. Typography & Typeset Rules
- **Display / Headers**: High-contrast geometric sans (`font-sans`, tracking `-0.025em` on hero, `-0.015em` on section titles).
- **Telemetry Data / Timestamps / Code**: Tabular Monospace (`font-mono`, `font-feature-settings: 'tnum' 1`).
- **Body & Explanatory Text**: High legibility, crisp contrast (`text-slate-300` on regular, `text-slate-400` on captions). Never drop body text contrast below `slate-400` on dark backgrounds.
- **Hierarchy Scale**:
  - H1: 3.5rem to 4.5rem (`font-extrabold`, leading `1.08`)
  - H2: 2rem to 2.5rem (`font-bold`, leading `1.2`)
  - H3: 1.125rem to 1.25rem (`font-semibold`)
  - Telemetry Value: 1.75rem to 2.25rem (`font-mono`, `font-bold`)
  - Micro-readout: 0.6875rem (11px, uppercase monospace tracking `0.05em`)

## 4. Anti-AI-Slop Guardrails (Deterministic Constraints)
1. **NO Cliché Purplish-Blue Gradients**: Do not use generic `from-purple-600 to-indigo-500` floating blobs or rainbow text gradients. Stick strictly to intentional telemetry spectrum (cyan, teal, dark obsidian).
2. **NO Nested Border Soups**: Prevent cards inside cards inside cards where every element has its own bright border. Use elevation and tonal background contrasts (`bg-slate-900/60` vs `bg-black/40`) rather than duplicate borders.
3. **NO Decorative Cartoon Pills**: Replace random rounded pills with functional status indicators (e.g., live pulse dots, monospace badges with 1px structural framing).
4. **NO Low-Contrast Gray-on-Black**: All interactive elements, labels, and form fields must meet strict WCAG AA contrast standards.
5. **NO Jittery Layout Shifts**: All transitions must use `transform`, `opacity`, or fixed-size bounding boxes.

## 5. Micro-Interactions & Motion
- Fast, fluid transitions: `duration-150` to `duration-200` with `ease-out`.
- Status indicators: Precision pulse on real-time activity (`animate-pulse`, `animate-ping` with `duration-1000`).
- Subtle tactile hover feedback on interactive cards with scale `[1.01]` or crisp border glow.
