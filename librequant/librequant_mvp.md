# LibreQuant Nexus: MVP Technical Requirements & Architecture

## 1. Executive Summary
**LibreQuant Nexus** is a high-performance, browser-based financial engineering workbench. The goal is to provide a "Sophisticated Minimalist" interface for executing Python-based quantitative research using the Jupyter Protocol.

## 2. Technical Stack (Locked)
- **Framework:** Next.js 16.2.2 (App Router)
- **Language:** TypeScript 5.x
- **UI/Styles:** Tailwind CSS v4, Lucide React
- **Jupyter Engine:** `@datalayer/jupyter-react`, `@jupyterlab/services`
- **State Management:** Zustand (App State), `@datalayer` internal (Engine State)
- **Theming:** `next-themes` (Class-based dark mode)

## 3. Architecture & State Management
### 3.1 Three-Tier State Design
1. **Engine State:** Handled by `@datalayer` for CRDT-based cell content and kernel communication.
2. **Global App State:** Zustand store for UI persists (sidebar state, active notebook metadata, user preferences).
3. **Local State:** React `useState` for transient UI interactions (modals, tooltips, hover states).

### 3.2 Kernel Communication
- **Protocol:** WebSocket-based Jupyter Message Protocol.
- **Provider:** All notebook components must be wrapped in the `<Jupyter>` context provider.
- **SSR Boundary:** All Jupyter-related components MUST use `"use client"` and be loaded via `next/dynamic` with `ssr: false`.

## 4. Visual Identity & UI Standards
### 4.1 Design Tokens (Source: tailwind.config.ts & globals.css)
- **Alpha (Primary):** `brand.teal` (`#0d9488` / `--alpha`)
- **Risk (Secondary):** `brand.rose` (`#e11d48` / `--risk`)
- **Background:** `bg-background` with `bg-grid-pattern` (radial-gradient).
- **Surface:** `.glass` class (60% opacity white/zinc-900, 20px backdrop-blur).

### 4.2 Typography
- **Headings:** `.heading-brand` (Inter, semi-bold, -0.011em tracking).
- **Code/Data:** `font-mono-code` (JetBrains Mono).

### 4.3 Layout Density
- **Workbench Aesthetic:** High-density display. Minimal padding (8px-16px). Focus on maximum vertical space for code and charts.

## 5. Security Requirements
- **Sandbox Execution:** Kernel must default to a restricted environment (Docker/Subprocess).
- **Output Sanitization:** Utilize `DOMPurify` for all HTML-based cell outputs.
- **Header Security:** Enforce strict CSP to prevent XSS in rich-text outputs.
- **Token Auth:** Secure WebSocket connections using standard Jupyter tokens.

## 6. Implementation Roadmap (Agent Checklist)

### Phase 1: The Core Shell
- [ ] Initialize `components/notebook/` directory.
- [ ] Implement `JupyterProvider` wrapper with dynamic import strategy.
- [ ] Create `styles/jupyter-bridge.css` to map the following:
    - `--jp-layout-color1` -> `var(--background)`
    - `--jp-brand-color1` -> `var(--alpha)`
    - `--jp-ui-font-family` -> `var(--font-inter)`

### Phase 2: The LibreCell Component
- [ ] Build a custom wrapper for `@datalayer/jupyter-react` cells.
- [ ] Apply `.glass` styling to the cell container.
- [ ] Customize the "Input" prompt (e.g., `In [1]:`) to use `brand.teal` and `heading-brand` style.
- [ ] Integrate a "Play" button using Lucide's `Play` icon with `animate-soft-pulse` on execution.

### Phase 3: Execution & Output
- [ ] Configure connection to local Jupyter Server (defaulting to `localhost:8888`).
- [ ] Ensure `stdout` and `stderr` render correctly in the output area.
- [ ] Implement support for Plotly/Matplotlib rich HTML outputs.

### Phase 4: Theme Sync
- [ ] Ensure the Jupyter bridge CSS variables update reactively when `.dark` class is toggled on `html`.

## 7. Quality Gate
- **Accessibility:** Keyboard navigable cells (Shift + Enter to run).
- **Performance:** No main-thread blocking during heavy cell outputs.
- **Consistency:** No "default" JupyterLab styles (grey borders/blue buttons) should be visible.