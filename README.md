# AdverSim - Multi-Agent Cyber Defense Simulation Framework

AdverSim is a simulation and telemetry dashboard for evaluating multi-agent collaborative cyber defense across complex enterprise network topologies. It models interactions between adaptive attackers (utilizing Upper Confidence Bound multi-armed bandits) and distributed defense nodes (utilizing Isolation Forests, Markov chain transition forecasting, and Bayesian risk weighting).

---

## Key Features

- **Interactive Topology Map**: Real-time visualization of network nodes (Workstations, DMZ, Active Directory Domain Controllers, Decoy Honeypots, and SOC Hubs) with dynamic link connections and animated packet flows.
- **MITRE ATT&CK Surface Coverage**: Real-time evaluation across 15 MITRE ATT&CK technique vectors spanning Reconnaissance, Initial Access, Execution, Persistence, Defense Evasion, Lateral Movement, and Exfiltration.
- **Adaptive Adversary (UCB1 Multi-Armed Bandit)**: Simulates adversaries that dynamically balance exploitation of weak defense surfaces against continuous exploration of untargeted arms.
- **Markov Attack Stage Forecasting**: Predicts sequential adversary progression through kill-chain phases to enable proactive defensive pre-hardening.
- **Bayesian Risk Profiling**: Interactive 15-axis radar chart showing posterior threat distribution across targeted attack surfaces.
- **Ablation Benchmark Matrix**: Comparative longitudinal analysis tracking Mean Time To Detect (MTTD), False Positive Rates (FPR), and peer consensus convergence across 6 distinct defense conditions (Conditions A through F).
- **Topology & Resilience Scorecard**: Live heuristic architectural audit calculating graph partition metrics, honeypot placement efficacy, and workstation lateral isolation.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, D3
- **Build Tool**: Vite 6
- **Server / Bridge**: Express 4, WebSocket (`ws`), Node.js
- **Formatting & Bundling**: ESBuild, TypeScript Compiler (`tsc`)

---

## Getting Started Locally

### Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: Version 18.x or higher (recommended: LTS 20.x or 22.x)
- **npm**: Version 9.x or higher (bundled with Node.js)
- **Git**: For cloning and repository management

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/adversim-cyber-defense.git
   cd adversim-cyber-defense
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

### Running in Development Mode

To start the Vite development server with hot-reloading:

```bash
npm run dev
```

Once started, open your browser and navigate to:
```text
http://localhost:3000
```

> **Note**: In development mode, if a separate Python cyber-range backend is not running, the application will automatically run using its built-in client-side simulation engine, executing all mathematical models (UCB1 bandit, Markov stage transitions, Isolation Forest anomaly scoring, and Bayesian weight decay) directly in your browser.

---

## Production Build & Local Server

To test the production build locally:

1. Compile and bundle the application:
   ```bash
   npm run build
   ```
   This generates the production client build in `dist/` and compiles the Node.js server bridge into `dist/server.cjs`.

2. Start the production server:
   ```bash
   npm start
   ```

3. Access the application at `http://localhost:3000` (or the port specified in `process.env.PORT`).

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite development server on port 3000 with hot-reloading. |
| `npm run build` | Compiles Vite frontend into `dist/` and bundles `server.ts` into `dist/server.cjs`. |
| `npm start` | Runs the production Node.js server from `dist/server.cjs`. |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) to verify code integrity. |
| `npm run clean` | Deletes build artifacts in `dist/` and temporary server bundles. |

---

## Deployment Options

### Deploying to Vercel (Edge CDN)
The repository includes a ready-to-use `vercel.json` configured for SPA routing.
1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **Import Project**.
3. Select your repository.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build` (or `vite build`).
6. Output Directory: `dist`.
7. Click **Deploy**.

### Deploying to Render (Full-Stack Web Service)
The repository includes a `render.yaml` configuration file for Render's infrastructure blueprint.
1. Push your repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New +** &rarr; **Web Service**.
3. Connect your repository.
4. Set Build Command: `npm install && npm run build`.
5. Set Start Command: `npm start`.
6. Select the **Free** instance plan and click **Create Web Service**.

---

## Project Structure

```text
├── src/
│   ├── components/            # UI components (Topology Map, Radar Chart, Alerts, MTTD Chart, etc.)
│   ├── data/                  # Initial state definitions, MITRE ATT&CK techniques, presets
│   ├── lib/                   # Simulation engine, Markov transitions, Bayesian calculations
│   ├── types.ts               # Core TypeScript interface and type definitions
│   ├── App.tsx                # Primary application container and tab coordinator
│   ├── main.tsx               # React DOM entrypoint
│   └── index.css              # Global styles and Tailwind configuration
├── server.ts                  # Full-stack Node.js Express & WebSocket proxy bridge
├── render.yaml                # Render Blueprint deployment configuration
├── vercel.json                # Vercel SPA routing rules
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript compiler settings
└── package.json               # Dependencies, scripts, and project metadata
```

---

## License

This project is open-source and available under the [MIT License](LICENSE).
