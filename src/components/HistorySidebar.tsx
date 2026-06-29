import { Search, MoreHorizontal, Trash2, Cloud, ArrowRight, Sparkles, LogIn } from 'lucide-react';
import { Conversation } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  userEmail?: string;
  onSignUpClick?: () => void;
}

export function HistorySidebar({ 
  isOpen, 
  onClose, 
  conversations, 
  currentConversationId, 
  onSelectConversation, 
  onDeleteConversation,
  userEmail,
  onSignUpClick
}: HistorySidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800/50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Rechercher dans le contenu..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-all"
            />
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center px-4 py-8 text-zinc-500 text-sm">
              Aucune conversation
            </div>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id} 
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id ? 'bg-zinc-800/80 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="truncate text-sm font-medium">
                  {conv.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all shrink-0"
                  title="Supprimer la discussion"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-zinc-800/50">
          {!userEmail ? (
            <button 
              onClick={onSignUpClick}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <LogIn className="w-3.5 h-3.5" />
                </div>
                <div className="text-left truncate">
                  <span className="block text-xs font-semibold text-zinc-100 truncate">
                    Se connecter / S'inscrire
                  </span>
                  <span className="block text-[10px] text-zinc-400 truncate flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" /> Cloud Sync
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>
          ) : (
            <button className="w-full flex items-center justify-between px-2 py-2 hover:bg-zinc-800/50 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-300 flex items-center justify-center shrink-0">
                  <span className="text-zinc-900 font-medium text-sm">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {userEmail}
                </span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
