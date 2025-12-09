import React, { useState, useRef, useEffect } from 'react';
import { BugReport, ChatEntry } from '../types';

interface AnalysisResultProps {
  history: ChatEntry[];
  latestReport: BugReport;
  onRefine: (feedback: string) => void;
  isRefining: boolean;
  onReset: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ history, latestReport, onRefine, isRefining, onReset }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Shipping Simulation State
  const [shippingStatus, setShippingStatus] = useState<'idle' | 'shipping' | 'shipped'>('idle');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [extraMessages, setExtraMessages] = useState<ChatEntry[]>([]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isRefining, extraMessages]);

  const triggerShippingSequence = () => {
    setShippingStatus('shipping');
    
    // Add local chat messages
    setExtraMessages([
      { role: 'user', content: 'Ship it.', timestamp: Date.now() },
      { role: 'model', content: { explanation: 'On it! 👨‍💻 Initiating deployment sequence...' } as any, timestamp: Date.now() + 100 }
    ]);

    // Simulate Terminal Logs
    const steps = [
      { msg: '> git checkout -b vibefix/mobile-red-button', delay: 800 },
      { msg: '> git add .', delay: 1500 },
      { msg: '> git commit -m "fix: mobile button visibility and color"', delay: 2200 },
      { msg: '> git push origin vibefix/mobile-red-button', delay: 3000 },
      { msg: '> gh pr create --title "Fix: Mobile Button Visibility" --body "Analyzed by VibeFix"', delay: 4200 },
    ];

    let currentDelay = 0;
    steps.forEach(({ msg, delay }) => {
      setTimeout(() => {
        setTerminalLogs(prev => [...prev, msg]);
      }, delay);
      currentDelay = delay;
    });

    setTimeout(() => {
      setShippingStatus('shipped');
      setExtraMessages(prev => [
        ...prev,
        { role: 'model', content: { explanation: 'Pull Request Open! View on GitHub.' } as any, timestamp: Date.now() }
      ]);
    }, currentDelay + 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRefining || shippingStatus !== 'idle') return;

    // Check for "Ship it" intent
    if (input.toLowerCase().includes('ship it') || input.toLowerCase().includes('shipit')) {
      setInput('');
      triggerShippingSequence();
      return;
    }

    onRefine(input);
    setInput('');
  };

  // Merge history with local extra messages for display
  const displayHistory = [...history, ...extraMessages];

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] flex gap-6 animate-fade-in">
      
      {/* Left Panel: Chat Interface */}
      <div className="w-1/3 flex flex-col bg-vibe-card rounded-2xl border border-vibe-muted/20 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-vibe-muted/10 bg-vibe-dark/30">
          <h2 className="font-bold text-white flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${shippingStatus === 'shipped' ? 'bg-vibe-success' : 'bg-green-500 animate-pulse'}`}></span>
            VibeFix Chat
          </h2>
        </div>
        
        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
          {displayHistory.filter(h => h.role !== 'user' || typeof h.content === 'string').map((entry, idx) => {
            const isUser = entry.role === 'user';
            
            // For the first model message, or any model message, we extract the explanation.
            let messageText = '';
            if (typeof entry.content === 'string') {
              messageText = entry.content;
            } else if (entry.content && (entry.content as any).explanation) {
              messageText = (entry.content as any).explanation;
            }

            // Skip the very first "user" message which is just the file upload log contextually
            // But don't skip if it is a local "Ship it" message
            if (idx === 0 && isUser && !messageText.toLowerCase().includes('ship it')) return null;

            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[90%] rounded-2xl p-3 text-sm leading-relaxed
                  ${isUser 
                    ? 'bg-vibe-accent text-white rounded-tr-sm' 
                    : 'bg-vibe-dark border border-vibe-muted/20 text-vibe-text rounded-tl-sm'
                  }`}
                >
                  <p>{messageText}</p>
                </div>
              </div>
            );
          })}
          
          {isRefining && (
            <div className="flex justify-start">
              <div className="bg-vibe-dark border border-vibe-muted/20 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                 <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-vibe-muted/50 rounded-full animate-bounce delay-0"></div>
                    <div className="w-2 h-2 bg-vibe-muted/50 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-vibe-muted/50 rounded-full animate-bounce delay-300"></div>
                 </div>
                 <span className="text-xs text-vibe-muted">Refining fix...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-vibe-muted/10 bg-vibe-dark/30">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={shippingStatus === 'idle' ? "Ask for changes or say 'Ship it'..." : "Deployment in progress..."}
              disabled={isRefining || shippingStatus !== 'idle'}
              className="w-full bg-vibe-dark/50 border border-vibe-muted/20 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-vibe-accent/50 transition-all placeholder-vibe-muted/40 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isRefining || shippingStatus !== 'idle'}
              className="absolute right-2 top-2 p-1.5 rounded-lg bg-vibe-accent text-white disabled:opacity-50 disabled:bg-transparent disabled:text-vibe-muted hover:bg-vibe-accent/80 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel: Logic for Code/Terminal/Success */}
      <div className="w-2/3 flex flex-col space-y-4">
        
        {/* State 1: Code View (Normal) */}
        {shippingStatus === 'idle' && (
          <>
            <div className="flex justify-between items-center bg-vibe-card p-4 rounded-xl border border-vibe-muted/20">
              <div>
                <h3 className="font-bold text-lg text-white">Current Patch</h3>
                <p className="text-xs text-vibe-muted font-mono">{latestReport.file_to_edit}</p>
              </div>
              <div className="flex items-center gap-3">
                 <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border
                  ${latestReport.user_sentiment.toLowerCase().includes('frustrated') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                    'bg-vibe-success/10 text-vibe-success border-vibe-success/20'
                  }`}>
                  Mood: {latestReport.user_sentiment}
                </div>
                <button onClick={onReset} className="text-xs text-vibe-muted hover:text-white underline">
                  New Bug
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#0d1117] rounded-xl border border-vibe-muted/20 overflow-hidden flex flex-col relative group">
               <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-vibe-muted/10">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                  </div>
                  <span className="text-xs text-vibe-muted font-mono">vibe_fix.diff</span>
                  <div className="w-10"></div> 
               </div>
               
               <div className="relative flex-1 overflow-auto">
                 <pre className="p-6 text-sm font-mono leading-relaxed">
                   <code className="language-css text-gray-300">
                     {latestReport.code_patch}
                   </code>
                 </pre>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-vibe-accent/5 rounded-full blur-3xl pointer-events-none"></div>
               </div>

               <div className="p-4 bg-[#161b22] border-t border-vibe-muted/10 flex justify-between items-center">
                 <div className="text-xs text-vibe-muted">
                   Generated by Gemini 2.5 Flash
                 </div>
                 <button 
                  onClick={() => triggerShippingSequence()}
                  className="px-4 py-2 bg-vibe-success text-vibe-dark font-bold text-sm rounded-lg hover:bg-vibe-success/90 transition-colors shadow-lg shadow-vibe-success/20"
                 >
                   Apply Fix
                 </button>
               </div>
            </div>
          </>
        )}

        {/* State 2: Shipping (Terminal) */}
        {shippingStatus === 'shipping' && (
          <div className="flex-1 bg-[#0d1117] rounded-xl border border-vibe-muted/20 overflow-hidden flex flex-col p-6 font-mono text-sm shadow-2xl">
             <div className="flex space-x-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
             </div>
             <div className="flex-1 space-y-2">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="text-green-400 animate-fade-in">
                    <span className="text-blue-400 mr-2">➜</span>
                    {log}
                  </div>
                ))}
                <div className="animate-pulse text-green-400">_</div>
             </div>
          </div>
        )}

        {/* State 3: Shipped (Success) */}
        {shippingStatus === 'shipped' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-fade-in bg-vibe-card rounded-xl border border-vibe-muted/20 relative overflow-hidden">
             
             {/* Background Effects */}
             <div className="absolute inset-0 bg-gradient-to-br from-vibe-success/5 to-transparent"></div>
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vibe-success to-vibe-accent"></div>

             <div className="relative z-10 w-24 h-24 bg-vibe-success/20 rounded-full flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-vibe-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
             </div>

             <div className="text-center relative z-10 space-y-2">
                <h2 className="text-3xl font-bold text-white">Pull Request Open!</h2>
                <p className="text-vibe-muted">Branch <span className="font-mono text-vibe-accent bg-vibe-accent/10 px-2 py-0.5 rounded">vibefix/mobile-red-button</span> created.</p>
             </div>

             <div className="flex gap-4 relative z-10 mt-8">
                <a 
                  href="#" 
                  onClick={(e) => e.preventDefault()}
                  className="px-6 py-3 bg-vibe-card border border-vibe-muted/30 rounded-xl text-white font-semibold hover:bg-vibe-dark transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  View on GitHub
                </a>
                <button 
                  onClick={onReset}
                  className="px-6 py-3 bg-vibe-success text-vibe-dark rounded-xl font-bold hover:bg-vibe-success/90 transition-colors shadow-lg shadow-vibe-success/20"
                >
                  Fix Another Bug
                </button>
             </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default AnalysisResult;