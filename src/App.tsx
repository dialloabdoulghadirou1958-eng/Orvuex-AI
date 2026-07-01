import { Menu, SquarePen, Settings, ChevronDown, ArrowUp } from 'lucide-react';

function App() {
  return (
    <div className="flex flex-col h-dvh bg-black text-white font-sans selection:bg-purple-500/30">
      {/* Header */}
      <header className="flex items-center justify-between p-4 pt-6 md:p-6 w-full max-w-3xl mx-auto">
        <button className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800/50">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800/50">
            <SquarePen className="w-6 h-6" />
          </button>
          <button className="p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800/50">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content (Centered) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        <div className="w-32 h-32 md:w-40 md:h-40 mb-6 drop-shadow-2xl">
          <img 
            src="/assets/images/orvuex_logo.png" 
            alt="orvuex logo" 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
          orvuex ai
        </h1>

        {/* Dropdowns */}
        <div className="flex items-center justify-center gap-3">
          <button className="flex items-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors rounded-full px-4 py-2 text-sm text-neutral-200">
            <img src="/assets/icons/gemini.png" alt="Google" className="w-4 h-4 object-contain" />
            <span className="truncate">Google...</span>
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          </button>
          
          <button className="flex items-center gap-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors rounded-full px-4 py-2 text-sm text-neutral-200">
            <span className="truncate">Gemini...</span>
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </main>

      {/* Footer Input Area */}
      <footer className="p-4 md:p-6 w-full max-w-3xl mx-auto mb-2 md:mb-4">
        <div className="bg-[#1C1C1E] rounded-[2rem] p-2 flex items-center shadow-lg">
          {/* Avatar Area */}
          <div className="w-10 h-10 shrink-0 ml-2 mr-3 flex items-center justify-center bg-transparent">
            {/* Using an emoji for the avatar to match the image, alternatively could be an image */}
            <span className="text-2xl">👨🏻‍💻</span>
          </div>
          
          {/* Input field */}
          <input 
            type="text" 
            placeholder="Répondre à Google Gemini" 
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-neutral-500 text-base"
          />
          
          {/* Submit Button */}
          <button className="w-10 h-10 shrink-0 rounded-full bg-[#2C2C2E] hover:bg-[#3C3C3E] flex items-center justify-center text-neutral-400 hover:text-white transition-colors ml-2 mr-1">
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
