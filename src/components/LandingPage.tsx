import React from 'react';
import { UserProfile } from '../lib/authService';
import { 
  ShieldCheck, 
  Play, 
  Network, 
  LogOut,
  Fingerprint,
  Radio,
  Sliders,
  CheckCircle2,
  Lock,
  GitBranch,
  Gauge,
  ArrowRight
} from 'lucide-react';

interface LandingPageProps {
  currentUser: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onEnterSimulator: () => void;
  onLogout: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onOpenAuth,
  onEnterSimulator,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 font-sans relative overflow-x-hidden">
      {/* Background Architectural Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Atmospheric Focus Glows */}
      <div className="fixed -top-48 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-cyan-900/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[260px] bg-emerald-950/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060911]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded bg-cyan-950/90 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white text-base font-heading">AdverSim</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight hidden sm:block">
                Cyber Defense & Resilience Simulator
              </span>
            </div>
          </div>

          {/* Core Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono text-slate-300">
            <a href="#overview" className="hover:text-cyan-400 transition-colors">Overview</a>
            <a href="#capabilities" className="hover:text-cyan-400 transition-colors">Capabilities</a>
            <a href="#ablation" className="hover:text-cyan-400 transition-colors">Benchmark Regimes</a>
            <a href="#architecture" className="hover:text-cyan-400 transition-colors">Architecture</a>
          </nav>

          {/* User Auth Action Status */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {currentUser.role} · {currentUser.organization}
                  </span>
                </div>
                <button
                  onClick={onEnterSimulator}
                  className="flex items-center space-x-2 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-950/50 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Open Simulation</span>
                </button>
                <button
                  onClick={onLogout}
                  title="Log out of session"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="overview" className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-slate-900/90 border border-slate-700/80 text-cyan-300 text-xs mb-8">
          <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[11px] font-medium tracking-wide">
            Enterprise Security Simulation & Benchmark Platform
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] font-heading">
          Simulate enterprise cyber defense before attacks occur.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed font-sans">
          AdverSim provides security teams with an interactive simulation environment to model network topologies,
          test autonomous honeypot strategies, and benchmark Mean Time to Detect (MTTD) against adaptive cyber threats.
        </p>

        {/* Primary CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onEnterSimulator}
            className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-7 py-3.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Launch Live Simulator</span>
          </button>
          {!currentUser ? (
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-medium text-sm transition-all hover:border-slate-600 cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              <span>Sign Up for Access</span>
            </button>
          ) : (
            <div className="px-4 py-3 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-mono">
              Signed in as <strong className="text-cyan-400">{currentUser.email}</strong>
            </div>
          )}
        </div>

        {/* Simulator Key Indicators */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl pt-8 border-t border-slate-800/80">
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">15</span>
            <span className="text-xs text-slate-400 mt-1">MITRE ATT&CK Surfaces</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-cyan-400 tracking-tight">6</span>
            <span className="text-xs text-slate-400 mt-1">Ablation Conditions</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 tracking-tight">100%</span>
            <span className="text-xs text-slate-400 mt-1">Client-Side or Connected</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 tracking-tight">Real-Time</span>
            <span className="text-xs text-slate-400 mt-1">SOC Telemetry Graphs</span>
          </div>
        </div>
      </section>

      {/* Simulator Capabilities Section */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
            Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 font-heading">
            Designed for Security Operations and Resilience Audits
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-4 font-sans leading-relaxed">
            Gain complete visibility into breach lifecycles through interactive controls, visual topology graphs, and automated defense responses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#090d16] border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-heading tracking-wide">Interactive Topology Modeling</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-sans">
              Inspect DMZ edge gateways, employee workstations, critical server clusters, and honeypot traps. Observe live compromises and lateral movements across network links.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#090d16] border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-heading tracking-wide">Targeted Attack Scenarios</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-sans">
              Inject active adversarial scenarios into the network—including APT29 Lateral Probes, Pass-the-Hash (PtH), Exfiltration, and Decoy Baiting—to observe defense triaging.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#090d16] border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4">
              <Gauge className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 font-heading tracking-wide">Dynamic Speed & Run Controls</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-sans">
              Pause, step forward round-by-round, or run simulations at speeds up to 4×. Compare detection speeds and track the degradation of adversary success over rounds.
            </p>
          </div>
        </div>
      </section>

      {/* Ablation Benchmark Regimes */}
      <section id="ablation" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400">
            Resilience Benchmarking
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 font-heading">
            Comparative Ablation Conditions
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-4 font-sans leading-relaxed">
            AdverSim enables direct comparisons across six standardized defense configurations to evaluate the impact of collaboration, honeypots, and predictive defense.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090d16]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#03060c] text-slate-400 uppercase font-mono text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Condition</th>
                <th className="py-3.5 px-4">Defense Configuration</th>
                <th className="py-3.5 px-4 text-center">Mean MTTD</th>
                <th className="py-3.5 px-4 text-center">False Positive Rate</th>
                <th className="py-3.5 px-4 text-center">Attacker Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300 font-mono">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-400">Condition A</td>
                <td className="py-3.5 px-4 font-sans text-xs">Baseline Static Defense (No Sharing, No Decoys)</td>
                <td className="py-3.5 px-4 text-center text-rose-400 font-bold">142.5s</td>
                <td className="py-3.5 px-4 text-center text-rose-400">4.8%</td>
                <td className="py-3.5 px-4 text-center text-slate-400 font-sans">Static</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-400">Condition B</td>
                <td className="py-3.5 px-4 font-sans text-xs">Collaborative Sharing Only (Peer Weight Sync)</td>
                <td className="py-3.5 px-4 text-center text-amber-400 font-bold">88.3s</td>
                <td className="py-3.5 px-4 text-center text-amber-400">2.1%</td>
                <td className="py-3.5 px-4 text-center text-slate-400 font-sans">Static</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-400">Condition C</td>
                <td className="py-3.5 px-4 font-sans text-xs">Honeypots Only (Decoy Nodes Deployed)</td>
                <td className="py-3.5 px-4 text-center text-emerald-400 font-bold">72.1s</td>
                <td className="py-3.5 px-4 text-center text-emerald-400">1.4%</td>
                <td className="py-3.5 px-4 text-center text-slate-400 font-sans">Static</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-400">Condition D</td>
                <td className="py-3.5 px-4 font-sans text-xs">Predictive Modeling Only (Stage Forecasting)</td>
                <td className="py-3.5 px-4 text-center text-emerald-400 font-bold">64.8s</td>
                <td className="py-3.5 px-4 text-center text-emerald-400">1.9%</td>
                <td className="py-3.5 px-4 text-center text-slate-400 font-sans">Static</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-400">Condition E</td>
                <td className="py-3.5 px-4 font-sans text-xs">Full Defense Suite vs Naive Attacker</td>
                <td className="py-3.5 px-4 text-center text-teal-400 font-bold">27.4s</td>
                <td className="py-3.5 px-4 text-center text-teal-400">0.6%</td>
                <td className="py-3.5 px-4 text-center text-teal-400 font-sans">Naive</td>
              </tr>
              <tr className="bg-cyan-950/30 hover:bg-cyan-950/40 transition-colors border-l-2 border-l-cyan-400">
                <td className="py-3.5 px-4 font-bold text-cyan-300">Condition F</td>
                <td className="py-3.5 px-4 font-sans text-xs font-semibold text-white">
                  Full Defense Suite vs Adaptive Bandit Attacker
                </td>
                <td className="py-3.5 px-4 text-center text-cyan-400 font-bold text-base">36.8s</td>
                <td className="py-3.5 px-4 text-center text-cyan-400 font-bold">0.8%</td>
                <td className="py-3.5 px-4 text-center text-cyan-300 font-sans font-semibold">Adaptive Bandit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Dual Architecture (Client & Server) */}
      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
              Deployment & Connectivity
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 font-heading">
              Flexible Simulation Runtime: Standalone or Connected.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-4 leading-relaxed font-sans">
              AdverSim is built with zero mandatory external runtime dependencies. Run complete attack-and-defense simulations right in your browser, or optionally connect to external network ranges via WebSocket telemetry.
            </p>

            <div className="mt-8 space-y-4 font-sans">
              <div className="flex items-start space-x-3.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Zero-Install Browser Engine</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Execute full Markov chain forecasts and node state transitions entirely client-side.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-white">WebSocket Telemetry Bridge</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect to external Python backends or hardware ranges via the integrated dual-protocol server bridge.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Cloud Authentication Vault</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sign in securely with Google Account or encrypted operator profiles synced with Firebase.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-6 text-sm text-slate-300 space-y-5">
            <h3 className="text-base font-bold text-white font-heading">Target Use Cases</h3>
            
            <div className="p-4 rounded bg-[#03060c] border border-slate-800/80 space-y-1.5">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide">SOC Analyst Training & Drills</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Familiarize teams with active intrusion detection patterns, multi-node lateral movements, and alert triage.
              </p>
            </div>

            <div className="p-4 rounded bg-[#03060c] border border-slate-800/80 space-y-1.5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Architecture Resilience Audits</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Quantify the defensive value of subnet segmentation and decoy placements prior to production rollout.
              </p>
            </div>

            <div className="p-4 rounded bg-[#03060c] border border-slate-800/80 space-y-1.5">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">Security Research & Benchmarking</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Evaluate multi-agent collaborative algorithms against baseline static threshold detection models.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-slate-800/80 text-center">
        <div className="rounded-2xl p-8 sm:p-12 bg-[#090d16] border border-slate-800 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-heading">
            Experience AdverSim in Action
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-sans">
            Launch the simulation dashboard to configure attack vectors, deploy honeypots, and inspect real-time network defense metrics.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterSimulator}
              className="w-full sm:w-auto px-8 py-3.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.01] cursor-pointer"
            >
              Open Simulation Dashboard
            </button>
            {!currentUser && (
              <button
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-6 py-3.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700/80 transition-colors cursor-pointer"
              >
                Create Operator Profile
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="py-10 px-4 border-t border-slate-800/80 text-center text-xs text-slate-500 font-mono">
        <p>AdverSim Cyber Defense & Resilience Simulation Platform</p>
        <p className="mt-2 text-[11px] text-slate-400">
          MITRE ATT&CK Framework Aligned • Client-Side Simulation & External Range Bridge Support
        </p>
      </footer>
    </div>
  );
};
