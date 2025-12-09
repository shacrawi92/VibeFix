import React from 'react';

interface CodeInputProps {
  code: string;
  setCode: (code: string) => void;
}

const MESSY_SNIPPET = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background-color: #333;
      color: #fff;
      font-family: sans-serif;
    }
    .hero {
      text-align: center;
      padding: 50px;
    }
    .order-btn {
      display: inline-block;
      padding: 15px 30px;
      border: 2px solid #fff;
      color: #fff;
      text-decoration: none;
      font-weight: bold;
      border-radius: 5px;
      margin-top: 20px;
    }
    
    /* MOBILE STYLES */
    @media (max-width: 600px) {
      body {
        background-color: #fff; /* White background on mobile */
        color: #333;
      }
      /* BUG: Forgot to change the button color! 
         It is still white text with white border on white background */
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1>Coffee Vibe</h1>
    <p>Best brew in town.</p>
    <a href="#" class="order-btn">Order Now</a>
  </div>
</body>
</html>`;

const CodeInput: React.FC<CodeInputProps> = ({ code, setCode }) => {
  return (
    <div className="flex flex-col h-full">
      <label className="text-sm font-medium text-vibe-muted mb-2 flex justify-between items-center">
        <span>Relevant Code Snippet</span>
        <button 
          onClick={() => setCode(MESSY_SNIPPET)}
          className="text-xs text-vibe-accent hover:text-white transition-colors bg-vibe-accent/10 px-2 py-1 rounded-md"
        >
          Paste Demo Code
        </button>
      </label>
      <textarea
        className="flex-1 w-full bg-vibe-card border border-vibe-muted/20 rounded-xl p-4 font-mono text-sm text-vibe-text focus:outline-none focus:border-vibe-accent/50 focus:ring-1 focus:ring-vibe-accent/50 resize-none transition-all placeholder-vibe-muted/30"
        placeholder={`// Paste your broken component here...
export const Button = () => {
  return <button className="invisible-on-mobile">Click Me</button>;
}`}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
};

export default CodeInput;