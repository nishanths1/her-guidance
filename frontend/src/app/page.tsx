import Link from "next/link";
import { ShieldAlert, ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
      {/* Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2.5 rounded-2xl shadow-lg shadow-purple-500/25">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">HER GUARDIAN</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-2.5 rounded-xl font-medium hover:bg-white/5 transition-colors">
            Login
          </Link>
          <Link href="/register" className="px-6 py-2.5 bg-white text-slate-950 rounded-xl font-semibold shadow-lg hover:shadow-white/20 transition-all">
            Get Protected
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-purple-300 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          AI-Powered Security System Active
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-tight">
          Never walk <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400">
            alone again.
          </span>
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
          Advanced emergency response system that instantly connects you with authorities, 
          shares live location, and captures crucial evidence with a single tap.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/25 hover:scale-105 transition-all flex items-center justify-center gap-2">
            Start Free Protection <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-2xl font-bold text-lg transition-all">
            Access Dashboard
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 text-left">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl">
            <div className="bg-red-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant SOS</h3>
            <p className="text-slate-400">Trigger alerts that immediately notify emergency services and your trusted contacts.</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl">
            <div className="bg-blue-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Evidence Capture</h3>
            <p className="text-slate-400">Automatically records audio and captures photos using your device camera.</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl">
            <div className="bg-green-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
              <Lock className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Secure Tracking</h3>
            <p className="text-slate-400">Real-time GPS tracking transmitted securely to authorized personnel.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
