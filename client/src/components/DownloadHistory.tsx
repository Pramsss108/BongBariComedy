import React, { useState, useEffect, useRef } from "react";
import { DownloadCloud, Clock, MonitorPlay, X, Copy, ExternalLink, Check, FolderSearch, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface HistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  timestamp: number;
  type: "video" | "trim";
}

export function saveToHistory(item: Omit<HistoryItem, "id" | "timestamp">) {
  try {
    const existing = localStorage.getItem("bongbari_dl_history");
    const history: HistoryItem[] = existing ? JSON.parse(existing) : [];
    
    // Check if the URL is already in the history to avoid duplicates
    const index = history.findIndex(h => h.url === item.url && h.type === item.type);
    if (index !== -1) {
      history.splice(index, 1);
    }
    
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };
    
    // Add to top and keep max 20 items
    const newHistory = [newItem, ...history].slice(0, 20);
    localStorage.setItem("bongbari_dl_history", JSON.stringify(newHistory));
    
    // Trigger an event so the UI can update
    window.dispatchEvent(new Event("bongbari_history_updated"));
  } catch (err) {
    console.error("Failed to save history", err);
  }
}

export function deleteFromHistory(id: string) {
  try {
    const existing = localStorage.getItem("bongbari_dl_history");
    const history: HistoryItem[] = existing ? JSON.parse(existing) : [];
    const newHistory = history.filter(h => h.id !== id);
    localStorage.setItem("bongbari_dl_history", JSON.stringify(newHistory));
    window.dispatchEvent(new Event("bongbari_history_updated"));
  } catch (err) {
    console.error("Failed to delete history", err);
  }
}

export function DownloadHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const clickOutsideRef = useRef<HTMLDivElement>(null);

  const loadHistory = () => {
    try {
      const existing = localStorage.getItem("bongbari_dl_history");
      if (existing) {
        setHistory(JSON.parse(existing));
      }
    } catch (err) { }
  };

  useEffect(() => {
    loadHistory();
    window.addEventListener("bongbari_history_updated", loadHistory);
    return () => window.removeEventListener("bongbari_history_updated", loadHistory);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clickOutsideRef.current && !clickOutsideRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (history.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" ref={clickOutsideRef}>
      {/* Floating Pop-up Card */}
      {isOpen && (
        <Card className="mb-4 w-[360px] max-w-[calc(100vw-3rem)] border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-5 rounded-2xl overflow-hidden ring-1 ring-white/5">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/10 bg-white/[0.02]">
            <CardTitle className="text-sm font-semibold flex items-center text-white/90 tracking-wide">
              <Clock className="w-4 h-4 mr-2 text-cyan-400" />
              Recent Downloads
            </CardTitle>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </CardHeader>
          <CardContent className="pt-3 pb-4 px-3">
            <ScrollArea className="h-[320px] rounded-md px-1">
              <div className="space-y-2 pb-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex flex-col p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-300 group border border-white/[0.02] hover:border-white/10 bg-black/20"
                  >
                    {/* Top Row: Thumbnail + Info */}
                    <div className="flex items-center gap-3">
                      <div 
                        className="relative w-[72px] h-[46px] flex-shrink-0 rounded-[8px] overflow-hidden shadow-md ring-1 ring-white/10 group-hover:ring-cyan-500/50 transition-all cursor-pointer"
                        onClick={() => window.open(item.url, "_blank")}
                      >
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <DownloadCloud className="w-4 h-4 text-white drop-shadow-md" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p 
                          className="text-[13px] font-medium text-white/90 truncate group-hover:text-cyan-400 transition-colors cursor-pointer"
                          onClick={() => window.open(item.url, "_blank")}
                          title={item.title}
                        >
                          {item.title}
                        </p>
                        <p className="text-[10px] text-white/40 mt-1 font-mono uppercase tracking-wider">
                          {new Date(item.timestamp).toLocaleDateString()} <span className="text-white/20 mx-1">•</span> {item.type === 'trim' ? 'Trimmed' : 'Full'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Action Tools - ALWAYS VISIBLE without squeezing */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 w-full">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           window.open(item.url, "_blank");
                         }}
                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:text-white hover:bg-cyan-500/30 hover:border-cyan-400 transition-all text-[10px] font-bold tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.1)] active:scale-95"
                         title="Redownload from Source"
                       >
                         <DownloadCloud size={14} /> REDOWNLOAD
                       </button>

                       <div className="flex items-center gap-1.5">
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             navigator.clipboard.writeText(item.url);
                             setCopiedId(item.id);
                             setTimeout(() => setCopiedId(null), 2000);
                           }}
                           className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors transform hover:scale-110 active:scale-95"
                           title="Copy Source Link"
                         >
                           {copiedId === item.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                         </button>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             deleteFromHistory(item.id);
                           }}
                           className="p-1.5 rounded-md text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors transform hover:scale-110 active:scale-95"
                           title="Remove from History"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Modern Bot Chat Head Button */}
      <div className="relative group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative flex items-center h-[52px] rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:-translate-y-1 active:scale-95 transition-all duration-300 outline-none"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-center gap-3 pr-1.5 pl-4 z-10 w-full">
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest leading-none mb-1">Downloads</span>
              <span className="text-[13px] text-white/90 font-medium leading-none">History</span>
            </div>

            <div className="relative w-[40px] h-[40px] rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-inner shrink-0">
              <MonitorPlay className="w-[18px] h-[18px] text-white" />
            </div>
          </div>
        </button>

        {/* Floating Notification Badge - Moved outside to prevent backdrop-blur clipping */}
        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-[2px] border-[#161616] shadow-md z-[60] pointer-events-none group-hover:-translate-y-1 transition-transform duration-300">
          {history.length > 9 ? '9+' : history.length}
        </div>
      </div>
    </div>
  );
}