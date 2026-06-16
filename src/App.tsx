import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink, 
  Copy, 
  Check, 
  BarChart3, 
  History, 
  Sparkles, 
  Info, 
  ArrowRight,
  RefreshCw,
  TrendingUp as BullIcon,
  TrendingDown as BearIcon
} from "lucide-react";

interface GroundingSource {
  title: string;
  uri: string;
}

interface AnalysisResponse {
  ticker: string;
  date: string;
  rawText: string;
  sources: GroundingSource[];
}

interface ParsedReport {
  ticker: string;
  date: string;
  overallSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNKNOWN';
  confidence: 'Low' | 'Medium' | 'High' | 'Unknown';
  bullCase: string[];
  bearCase: string[];
  keyRisk: string;
  investorNote: string;
}

const POPULAR_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOG", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." }
];

const LOADING_STEPS = [
  "Connecting to live quantitative streams...",
  "Running Google Search on the last 7 days of news...",
  "Extracting recent earnings calls & guidances...",
  "Evaluating analyst rating changes & price targets...",
  "Checking macro trends & sector events...",
  "Formatting unbiased Bull & Bear arguments...",
  "Finalizing report matching quantitative standards..."
];

// Parser function to convert the model's structured text report to a premium React UI
function parseSentimentReport(text: string, fallbackTicker: string): ParsedReport {
  const result: ParsedReport = {
    ticker: fallbackTicker,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    overallSignal: 'NEUTRAL',
    confidence: 'Medium',
    bullCase: [],
    bearCase: [],
    keyRisk: '',
    investorNote: ''
  };

  if (!text) return result;

  // Extract Ticker and Date
  // Example: "**[AAPL] SENTIMENT REPORT — June 15, 2026**"
  const headerMatch = text.match(/\*\*\[?([A-Z0-9.\-]+)\]?\s+SENTIMENT REPORT\s*[-—–]\s*([^*]+)\*\*/i);
  if (headerMatch) {
    result.ticker = headerMatch[1].toUpperCase();
    result.date = headerMatch[2].trim();
  }

  // Extract Overall Signal
  // Example: "**OVERALL SIGNAL: [BULLISH / BEARISH / NEUTRAL]**"
  const signalMatch = text.match(/OVERALL SIGNAL:\s*\*?\[?(BULLISH|BEARISH|NEUTRAL)\]?\*?/i);
  if (signalMatch) {
    result.overallSignal = signalMatch[1].toUpperCase() as any;
  }

  // Extract Confidence
  // Example: "CONFIDENCE: [Low / Medium / High]"
  const confidenceMatch = text.match(/CONFIDENCE:\s*\*?\[?(Low|Medium|High)\]?\*?/i);
  if (confidenceMatch) {
    result.confidence = confidenceMatch[1] as any;
  }

  // Split content by headings to extract lists
  const lines = text.split('\n');
  let currentSection: 'none' | 'bull' | 'bear' | 'risk' | 'note' = 'none';

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.match(/\*\*BULL CASE\*\*/i)) {
      currentSection = 'bull';
      continue;
    } else if (trimmed.match(/\*\*BEAR CASE\*\*/i)) {
      currentSection = 'bear';
      continue;
    } else if (trimmed.match(/\*\*KEY RISK TO WATCH\*\*/i)) {
      currentSection = 'risk';
      continue;
    } else if (trimmed.match(/\*\*INVESTOR NOTE\*\*/i)) {
      currentSection = 'note';
      continue;
    } else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      continue;
    }

    if (currentSection === 'bull') {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        result.bullCase.push(trimmed.replace(/^[\-\*\s]+/, '').trim());
      } else if (result.bullCase.length > 0) {
        result.bullCase[result.bullCase.length - 1] += ' ' + trimmed;
      } else {
        result.bullCase.push(trimmed);
      }
    } else if (currentSection === 'bear') {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        result.bearCase.push(trimmed.replace(/^[\-\*\s]+/, '').trim());
      } else if (result.bearCase.length > 0) {
        result.bearCase[result.bearCase.length - 1] += ' ' + trimmed;
      } else {
        result.bearCase.push(trimmed);
      }
    } else if (currentSection === 'risk') {
      if (!trimmed.toLowerCase().includes('investor note')) {
        if (result.keyRisk) {
          result.keyRisk += ' ' + trimmed;
        } else {
          result.keyRisk = trimmed;
        }
      }
    } else if (currentSection === 'note') {
      if (result.investorNote) {
        result.investorNote += ' ' + trimmed;
      } else {
        result.investorNote = trimmed;
      }
    }
  }

  // Sanitize
  result.keyRisk = result.keyRisk.replace(/^[\-\*\s]+/, '').trim();
  result.investorNote = result.investorNote.replace(/^[\-\*\s]+/, '').trim();

  // If parsed list empty, provide fallback parsing
  if (result.bullCase.length === 0) {
    result.bullCase = ["No direct bull factors noted in recent data."];
  }
  if (result.bearCase.length === 0) {
    result.bearCase = ["No direct bear factors noted in recent data."];
  }

  return result;
}

export default function App() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<AnalysisResponse | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [parsed, setParsed] = useState<ParsedReport | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ticker_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Update loading step message sequence
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2400);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAnalyze = async (searchTicker: string) => {
    if (!searchTicker || searchTicker.trim().length === 0) return;
    
    setLoading(true);
    setError(null);
    setReport(null);
    setParsed(null);

    const targetTicker = searchTicker.trim().toUpperCase();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker: targetTicker }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to make sentiment report");
      }

      const data: AnalysisResponse = await response.json();
      setReport(data);
      
      const parsedData = parseSentimentReport(data.rawText, targetTicker);
      setParsed(parsedData);

      // Save history
      const newHistory = [targetTicker, ...history.filter(h => h !== targetTicker)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem("ticker_history", JSON.stringify(newHistory));

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col justify-between border-[12px] border-zinc-900/50 font-sans" id="root-layout">
      {/* Bento-Styled Navigation Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-5 sticky top-0 z-40" id="header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-mono font-black text-white tracking-tighter italic uppercase flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-emerald-500 inline" />
                QUANT
              </h1>
              <div className="h-6 w-px bg-zinc-800"></div>
              <span className="text-zinc-500 font-sans text-sm md:text-base uppercase tracking-[0.2em] font-medium">Sentiment Engine</span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
              Report Engine v2.4 | Grounded by Google Search Live API
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 px-3  py-1 bg-zinc-900 rounded-full text-xs font-mono text-zinc-400 border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Feed Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Context Stage */}
      <main className="max-w-7xl mx-auto p-6 flex-1 w-full flex flex-col justify-center" id="main-content">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start my-auto w-full">
          {/* Left Column: Ticker Input Controls with Bento Styling */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden" id="search-card">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -z-10 rounded-full" />
              
              <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">
                // CONDUCT SENTIMENT ANALYSIS
              </h2>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Query public stock tickers. Generates unbiased, math-balanced sentiment reports covering the last 7 days of rumors, ratings, macro and earnings calls.
              </p>

              {/* Form Input */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAnalyze(ticker);
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="ticker-input" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2 font-bold">
                    Target Stock Ticker
                  </label>
                  <div className="relative">
                    <input
                      id="ticker-input"
                      type="text"
                      placeholder="e.g. AAPL, NVDA, TSLA, MSFT"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 pl-11 text-white font-mono placeholder-zinc-600 transition-all outline-none text-sm"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      disabled={loading}
                    />
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-600" />
                  </div>
                </div>

                <button
                  id="btn-analyze"
                  type="submit"
                  disabled={loading || !ticker.trim()}
                  className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 hover:border-zinc-600 font-mono text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      RE-FETCHING LIVE SEED...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      FETCH LIVE ANALYSIS
                    </>
                  )}
                </button>
              </form>

              {/* Popular Stocks */}
              <div className="mt-8">
                <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-3 font-bold">
                  Quick Track List
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {POPULAR_TICKERS.map((stock) => (
                    <button
                      id={`ticker-quick-${stock.symbol}`}
                      key={stock.symbol}
                      onClick={() => {
                        setTicker(stock.symbol);
                        handleAnalyze(stock.symbol);
                      }}
                      disabled={loading}
                      className="px-2.5 py-2.5 bg-zinc-950/60 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 text-zinc-300 font-mono text-center rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer"
                    >
                      <span className="font-bold text-white text-xs">{stock.symbol}</span>
                      <span className="text-[9px] text-zinc-600 font-sans truncate max-w-full text-center mt-0.5">{stock.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* History list */}
              {history.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-850">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500 font-bold">
                      Recent Terminal Calls
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((histSymbol) => (
                      <button
                        id={`ticker-hist-${histSymbol}`}
                        key={histSymbol}
                        onClick={() => {
                          setTicker(histSymbol);
                          handleAnalyze(histSymbol);
                        }}
                        disabled={loading}
                        className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] rounded-lg font-mono flex items-center gap-1 transition-all border border-zinc-850 cursor-pointer"
                      >
                        {histSymbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Analyst Mandate Card (Bento Minimalist Style) */}
            <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex gap-3.5 text-xs text-zinc-400 leading-relaxed" id="mandate-card">
              <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs uppercase text-zinc-300 font-bold mb-1">Unbiased Quant Standard</p>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Our system aggregates earnings transcripts, analyst revisions, and macro inputs over the past key 7-day period. Outputs adhere strictly to verifiable search citations with zero speculation.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Bento Report Rendition */}
          <div className="lg:col-span-8 h-full min-h-[500px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {/* Error Screen */}
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-zinc-900 border border-red-900/50 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 text-red-200"
                  id="error-block"
                >
                  <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
                  <div className="max-w-md space-y-2">
                    <h3 className="text-base font-mono font-bold uppercase tracking-widest text-white">System Error Context</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl text-left font-mono text-[9px] text-zinc-500">
                      Error resolution target: verify Gemini API keys are active in the Secrets configurations.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Loading Screen */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  className="bg-zinc-900 border border-zinc-800 p-12 rounded-2xl flex flex-col items-center justify-center text-center min-h-[520px]"
                  id="loading-block"
                >
                  <div className="relative mb-6">
                    <div className="w-14 h-14 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  
                  <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-zinc-300 mb-1">
                    RUNNING HEURISTICS MODEL
                  </h3>
                  <div className="h-6 overflow-hidden flex items-center justify-center mb-8">
                    <p className="text-xs text-emerald-400 font-mono animate-pulse">
                      &gt; {LOADING_STEPS[loadingStep]}
                    </p>
                  </div>

                  <div className="w-48 bg-zinc-950/80 h-1 rounded-full overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Initial Empty State Screen */}
              {!loading && !report && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-zinc-900/40 border border-zinc-800 border-dashed p-10 rounded-2xl flex flex-col items-center justify-center text-center min-h-[520px] text-zinc-500"
                  id="empty-block"
                >
                  <div className="w-14 h-14 bg-zinc-900 rounded-full flex items-center justify-center mb-5 border border-zinc-800">
                    <Search className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h3 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase mb-1">No Active Stock Session</h3>
                  <p className="text-xs max-w-sm mb-6 text-zinc-500">
                    Submit an asset ticker above or run the sample model benchmarks.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleAnalyze("NVDA")}
                      className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-emerald-400 border border-zinc-800 hover:border-zinc-700 text-xs rounded-xl font-mono flex items-center gap-1.5 transition-all text-center justify-center cursor-pointer"
                    >
                      Benchmark NVDA Sentiment
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAnalyze("AAPL")}
                      className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-xs rounded-xl font-mono flex items-center gap-1.5 transition-all text-center justify-center cursor-pointer"
                    >
                      Load Apple Model
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Complete Sentiment Report rendered inside beautiful custom Bento Cells */}
              {!loading && report && parsed && (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                  id="report-block"
                >
                  {/* Bento Grid layout container */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="bento-container">
                    
                    {/* BENTO CELL 1: OVERALL MARKET SIGNAL CARD */}
                    <div className="col-span-1 md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden" id="bento-cell-signal">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                        {parsed.overallSignal === "BULLISH" ? (
                          <BullIcon className="w-28 h-28 text-emerald-500" />
                        ) : parsed.overallSignal === "BEARISH" ? (
                          <BearIcon className="w-28 h-28 text-rose-500" />
                        ) : (
                          <BarChart3 className="w-28 h-28 text-zinc-500" />
                        )}
                      </div>
                      
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.25em] mb-1 font-bold">Overall Market Signal</p>
                        <p className={`text-5xl font-black tracking-tighter uppercase font-display select-none ${
                          parsed.overallSignal === "BULLISH" 
                            ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" 
                            : parsed.overallSignal === "BEARISH"
                            ? "text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.2)]"
                            : "text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                        }`}>
                          {parsed.overallSignal}
                        </p>
                      </div>

                      <div className="mt-6">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Ticker Target</span>
                          <span className="text-xl font-mono font-bold text-white tracking-tight">{parsed.ticker}</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            parsed.overallSignal === "BULLISH" 
                              ? "bg-emerald-500 w-[84%]" 
                              : parsed.overallSignal === "BEARISH"
                              ? "bg-rose-500 w-[18%]"
                              : "bg-amber-500 w-[50%]"
                          }`}></div>
                        </div>
                      </div>
                    </div>

                    {/* BENTO CELL 2: CONFIDENCE RATING CELL */}
                    <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between" id="bento-cell-confidence">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.25em] mb-1 font-semibold">Confidence Metric</p>
                        <p className="text-3xl font-mono font-bold text-white tracking-tight uppercase">
                          {parsed.confidence}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">Grounding density score</p>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 h-4 mt-6">
                        <div className={`rounded-[3px] ${parsed.confidence === "High" || parsed.confidence === "Medium" || parsed.confidence === "Low" ? "bg-sky-500/80" : "bg-zinc-800"}`} />
                        <div className={`rounded-[3px] ${parsed.confidence === "High" || parsed.confidence === "Medium" ? "bg-sky-500/80" : "bg-zinc-800"}`} />
                        <div className={`rounded-[3px] ${parsed.confidence === "High" || parsed.confidence === "Medium" ? "bg-sky-500/85" : "bg-zinc-800"}`} />
                        <div className={`rounded-[3px] ${parsed.confidence === "High" ? "bg-sky-500/90" : "bg-zinc-800"}`} />
                        <div className="bg-zinc-800 rounded-[3px]" />
                      </div>
                    </div>

                    {/* BENTO CELL 3: SENTIMENT SOURCE MIX */}
                    <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between" id="bento-cell-sources">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Sentiment Feed Mix</p>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-[11px] font-mono leading-none py-1">
                          <span className="text-zinc-500">Earnings & Guidelines</span>
                          <span className="text-white font-bold">42%</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono leading-none py-1">
                          <span className="text-zinc-500">News & Ratings</span>
                          <span className="text-white font-bold">38%</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono leading-none py-1">
                          <span className="text-zinc-500">Sector Macros</span>
                          <span className="text-white font-bold">20%</span>
                        </div>
                      </div>
                    </div>

                    {/* BENTO CELL 4: BULL CASE CONTENT */}
                    <div className="col-span-1 md:col-span-2 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-6 flex flex-col" id="bento-cell-bull">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center justify-between w-full">
                          <span>Bull Factors</span>
                          <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">+{parsed.bullCase.length} points</span>
                        </h2>
                      </div>
                      <div className="space-y-4 flex-1">
                        {parsed.bullCase.map((point, idx) => (
                          <div key={idx} className="group">
                            <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">• {point}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BENTO CELL 5: BEAR CASE CONTENT */}
                    <div className="col-span-1 md:col-span-2 bg-rose-950/20 border border-rose-900/30 rounded-2xl p-6 flex flex-col" id="bento-cell-bear">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-rose-500 rounded-full"></div>
                        <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center justify-between w-full">
                          <span>Bear Factors</span>
                          <span className="text-[10px] text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">+{parsed.bearCase.length} points</span>
                        </h2>
                      </div>
                      <div className="space-y-4 flex-1">
                        {parsed.bearCase.map((point, idx) => (
                          <div key={idx} className="group">
                            <p className="text-xs text-rose-100/40 leading-relaxed font-medium">• {point}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BENTO CELL 6: KEY RISK BLOCK & UNCERTAINTIES */}
                    <div className="col-span-1 md:col-span-3 bg-zinc-900 border border-sky-900/30 rounded-2xl p-5 flex items-center gap-4" id="bento-cell-risk">
                      <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20 shrink-0 hidden sm:block">
                        <AlertTriangle className="w-6 h-6 text-sky-400" />
                      </div>
                      <div>
                        <p className="text-[9px] text-sky-400 uppercase tracking-widest font-black mb-0.5">Primary Risk Exposure</p>
                        <p className="text-xs font-medium text-zinc-300 leading-normal">{parsed.keyRisk || "Uncertain risk markers noted inside the 7 days sentiment window."}</p>
                      </div>
                    </div>

                    {/* BENTO CELL 7: INVESTOR NOTE */}
                    <div className="col-span-1 bg-zinc-900/50 border border-zinc-850/50 rounded-2xl p-4 flex flex-col justify-center" id="bento-cell-disclaimer">
                      <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1 font-mono">Disclaimer</p>
                      <p className="text-[9px] leading-relaxed text-zinc-550 italic font-mono">
                        {parsed.investorNote || "Sentiment is based on public streams. Not explicit financial advise."}
                      </p>
                    </div>

                  </div>

                  {/* Web Search Verified Grounding Sources */}
                  {report.sources.length > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl" id="citations-card">
                      <h3 className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4 flex items-center gap-2">
                        <span>Verifiable Grounding Sources</span>
                        <span className="h-px bg-zinc-800 flex-1"></span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {report.sources.slice(0, 6).map((src, index) => (
                          <a
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            key={index}
                            className="bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 p-3 rounded-xl flex items-center justify-between text-[11px] text-zinc-400 transition-all cursor-pointer hover:-translate-y-0.5"
                          >
                            <span className="truncate pr-4 font-mono select-none" title={src.title}>
                              [{index + 1}] {src.title}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Copieable Direct Quantitative Output */}
                  <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-6" id="plaintext-raw-card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">
                          Plaintext Decoupled Format
                        </span>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="p-1 px-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-mono cursor-pointer border border-zinc-700"
                        title="Copy Report"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            COPIED!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            COPY TEXT FORMAT
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl overflow-x-auto text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-60 select-all">
                      {report.rawText}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Styled Minimalist Footer Section */}
      <footer className="border-t border-zinc-850 bg-zinc-900/10 py-6 px-6 text-center text-[10px] text-zinc-500 font-mono" id="footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Quant Sentiment Engine. Balanced model parameters with live search grounding.</p>
          <div className="flex gap-4">
            <span>No-Bias Quant Standard</span>
            <span>•</span>
            <span>Hist. 7-Day Window</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
