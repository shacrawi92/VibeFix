import React, { useState } from 'react';
import UploadZone from './components/UploadZone';
import CodeInput from './components/CodeInput';
import AnalysisResult from './components/AnalysisResult';
import { analyzeBug } from './services/geminiService';
import { AnalysisState, BugReport, Step, ChatEntry } from './types';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [codeContext, setCodeContext] = useState<string>('');
  const [step, setStep] = useState<Step>(Step.UPLOAD);
  
  const [state, setState] = useState<AnalysisState>({
    isLoading: false,
    error: null,
    history: [],
    latestReport: null,
  });

  const handleAnalyze = async () => {
    if (!videoFile || !codeContext.trim()) {
      alert("Please provide both a video and code snippet.");
      return;
    }

    setStep(Step.ANALYZING);
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Initial Chat Entry: User Request
      const initialHistory: ChatEntry[] = [
        { role: 'user', content: 'Analyze this bug.', timestamp: Date.now() }
      ];

      const report = await analyzeBug(videoFile, codeContext, []);
      
      const newHistory: ChatEntry[] = [
        ...initialHistory,
        { role: 'model', content: report, timestamp: Date.now() }
      ];

      setState({ 
        isLoading: false, 
        error: null, 
        history: newHistory,
        latestReport: report 
      });
      setStep(Step.RESULTS);

    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev,
        isLoading: false, 
        error: err.message || "Failed to analyze the vibe.", 
      }));
      setStep(Step.UPLOAD);
    }
  };

  const handleRefine = async (feedback: string) => {
    if (!videoFile || !state.latestReport) return;

    // Add user message to history optimistically
    const currentHistory = [...state.history, { role: 'user', content: feedback, timestamp: Date.now() } as ChatEntry];
    setState(prev => ({ ...prev, history: currentHistory, isLoading: true }));

    try {
      const report = await analyzeBug(videoFile, codeContext, currentHistory);
      
      const updatedHistory = [
        ...currentHistory,
        { role: 'model', content: report, timestamp: Date.now() } as ChatEntry
      ];

      setState({
        isLoading: false,
        error: null,
        history: updatedHistory,
        latestReport: report
      });

    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Failed to refine fix: " + err.message 
      }));
    }
  };

  const handleReset = () => {
    setStep(Step.UPLOAD);
    setVideoFile(null);
    setCodeContext('');
    setState({ isLoading: false, error: null, history: [], latestReport: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibe-dark to-slate-900 text-vibe-text selection:bg-vibe-accent/30 selection:text-white pb-10">
      
      {/* Navbar */}
      <nav className="border-b border-vibe-muted/10 bg-vibe-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vibe-accent to-purple-600 flex items-center justify-center shadow-lg shadow-vibe-accent/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Vibe<span className="text-vibe-accent">Fix</span></span>
          </div>
          <div className="text-xs font-medium px-3 py-1 rounded-full bg-vibe-card border border-vibe-muted/20 text-vibe-muted">
            Powered by Gemini 2.5
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {state.error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 flex items-center gap-3 animate-fade-in">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
             {state.error}
          </div>
        )}

        {step === Step.UPLOAD && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)] min-h-[600px]">
            {/* Left Column: Video */}
            <div className="flex flex-col space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex-1 bg-vibe-card rounded-2xl p-6 border border-vibe-muted/10 shadow-xl shadow-black/20 flex flex-col">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-vibe-muted/20 text-xs text-vibe-muted">1</span>
                  The Evidence
                </h2>
                <div className="flex-1 flex flex-col">
                   <UploadZone onFileSelect={setVideoFile} selectedFile={videoFile} />
                </div>
              </div>
            </div>

            {/* Right Column: Code */}
            <div className="flex flex-col space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
               <div className="flex-1 bg-vibe-card rounded-2xl p-6 border border-vibe-muted/10 shadow-xl shadow-black/20 flex flex-col relative overflow-hidden">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-vibe-muted/20 text-xs text-vibe-muted">2</span>
                  The Code
                </h2>
                <div className="flex-1">
                   <CodeInput code={codeContext} setCode={setCodeContext} />
                </div>
                
                {/* Floating Action Button */}
                <div className="absolute bottom-6 right-6 left-6 z-10">
                  <button
                    onClick={handleAnalyze}
                    disabled={!videoFile || !codeContext.trim()}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                      ${(!videoFile || !codeContext.trim()) 
                        ? 'bg-vibe-muted/20 text-vibe-muted cursor-not-allowed' 
                        : 'bg-gradient-to-r from-vibe-accent to-purple-600 text-white hover:shadow-vibe-accent/25'
                      }`}
                  >
                    Analyze Vibe
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === Step.ANALYZING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-vibe-accent blur-3xl opacity-20 rounded-full animate-pulse-fast"></div>
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-vibe-card to-vibe-dark border border-vibe-muted/20 flex items-center justify-center relative z-10 shadow-2xl">
                 <svg className="animate-spin h-10 w-10 text-vibe-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">VibeFix is thinking...</h2>
              <p className="text-vibe-muted max-w-md mx-auto">
                Correlating pixel data with source code structure to identify the root cause of the visual regression.
              </p>
            </div>
          </div>
        )}

        {step === Step.RESULTS && state.latestReport && (
          <AnalysisResult 
            history={state.history} 
            latestReport={state.latestReport}
            onRefine={handleRefine}
            isRefining={state.isLoading}
            onReset={handleReset}
          />
        )}

      </main>
    </div>
  );
};

export default App;