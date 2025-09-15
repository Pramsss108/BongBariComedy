import React, { useState, useEffect, useCallback } from "react";

interface ReactionDef {
  id: string;
  emoji: string;
  label: string;
}

interface StoreShape {
  [contentId: string]: {
    counts: { [reactionId: string]: number };
    custom?: { [reactionId: string]: ReactionDef };
  };
}

const LS_KEY = "bbc.reactions.v1";

const DEFAULT_REACTIONS: ReactionDef[] = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "laugh", emoji: "😂", label: "Laugh" },
  { id: "wow", emoji: "😲", label: "Wow" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "love", emoji: "❤️", label: "Love" }
];

function loadStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStore(store: StoreShape) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {}
}

export const ReactionBar: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
  const [store, setStore] = useState<StoreShape>(() => loadStore());
  const [showAdd, setShowAdd] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const thisEntry = store[id] || { counts: {}, custom: {} };
  const customDefs = Object.values(thisEntry.custom || {});
  const merged: ReactionDef[] = [...DEFAULT_REACTIONS, ...customDefs];

  // Initialize missing reaction keys
  useEffect(() => {
    let changed = false;
    const next = { ...store };
    if (!next[id]) {
      next[id] = { counts: {}, custom: {} };
      changed = true;
    }
    merged.forEach(r => {
      if (next[id].counts[r.id] == null) {
        next[id].counts[r.id] = 0;
        changed = true;
      }
    });
    if (changed) {
      setStore(next);
      saveStore(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const update = useCallback((updater: (draft: StoreShape) => void) => {
    setStore(prev => {
      const copy: StoreShape = JSON.parse(JSON.stringify(prev));
      updater(copy);
      saveStore(copy);
      return copy;
    });
  }, []);

  const handleReact = (reactionId: string) => {
    update(d => {
      if (!d[id]) d[id] = { counts: {}, custom: {} };
      if (d[id].counts[reactionId] == null) d[id].counts[reactionId] = 0;
      d[id].counts[reactionId] += 1;
    });
  };

  const filtered = search
    ? merged.filter(r =>
        r.label.toLowerCase().includes(search.toLowerCase()) ||
        r.emoji.includes(search.trim())
      )
    : merged;

  const addCustom = () => {
    const raw = inputValue.trim();
    if (!raw) return;
    // Expect: emoji space label
    const match = raw.match(/^(\p{Extended_Pictographic})(?:\s+(.{1,30}))?$/u);
    if (!match) {
      alert("Format: <emoji> <short label>. Example: 🚀 Boost");
      return;
    }
    const emoji = match[1];
    const label = (match[2] || "Custom").trim();
    const baseId = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 28) || "custom";
    const reactionId = `${baseId}_${Date.now().toString(36)}`;
    update(d => {
      if (!d[id]) d[id] = { counts: {}, custom: {} };
      d[id].custom = d[id].custom || {};
      d[id].custom[reactionId] = { id: reactionId, emoji, label };
      d[id].counts[reactionId] = 0;
    });
    setInputValue("");
    setShowAdd(false);
  };

  const copyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}#react-${id}`;
    try {
      await navigator.clipboard.writeText(link);
      // quick toast imitation
      const el = document.createElement("div");
      el.textContent = "Link copied!";
      el.className = "fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-3 py-2 rounded shadow z-[9999] animate-fade";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    } catch {
      alert(link);
    }
  };

  return (
    <div id={`react-${id}`} className={`mt-3 select-none ${className || ""}`}>
      <div className="flex flex-wrap gap-2 items-center">
        {filtered.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => handleReact(r.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-gray-800 text-xs font-semibold shadow border border-black/10 hover:-translate-y-0.5 hover:shadow-md active:scale-95 transition"
          >
            <span className="text-base leading-none">{r.emoji}</span>
            <span>{thisEntry.counts?.[r.id] ?? 0}</span>
          </button>
        ))}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(s => !s)}
            className="px-2.5 py-1.5 rounded-full bg-brand-blue text-white text-xs font-semibold shadow hover:bg-brand-blue/90 transition"
            aria-label="Add or search reactions"
          >
            {showAdd ? "Close" : "+ React"}
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="px-2.5 py-1.5 rounded-full bg-brand-red text-white text-xs font-semibold shadow hover:bg-brand-red/90 transition"
            aria-label="Copy share link"
          >
            Share
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="mt-2 space-y-2 p-2 rounded-lg bg-white/70 backdrop-blur border border-black/10">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reactions..."
            className="w-full text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Add: 🚀 Boost"
              className="flex-1 text-xs px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-brand-red/40"
            />
            <button
              type="button"
              onClick={addCustom}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-brand-red text-white hover:bg-brand-red/90 transition"
            >
              Add
            </button>
          </div>
          <p className="text-[10px] text-gray-500">
            Format: emoji then label. Stored only in your browser.
          </p>
        </div>
      )}
    </div>
  );
};
