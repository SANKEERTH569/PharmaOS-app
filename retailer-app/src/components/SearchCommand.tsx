
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Pill, ClipboardList, Building2, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { cn } from '../utils/cn';

interface SearchResult {
  id: string;
  type: 'medicine' | 'order' | 'agency';
  title: string;
  subtitle?: string;
  path?: string;
}

const RECENT_KEY = 'pharma_recent_searches';

const getRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const saveRecent = (term: string) => {
  const arr = getRecent().filter(s => s !== term);
  arr.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 8)));
};

/** Normalize so "a250" matches "A 250" */
const normalizeSearchQuery = (q: string): string => {
  const t = q.trim();
  if (!t) return t;
  return t.replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2');
};

export const SearchCommand: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(getRecent());
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (!isOpen) onClose(); }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const searchParam = encodeURIComponent(normalizeSearchQuery(q));
      const { data } = await api.get(`/marketplace/medicines?search=${searchParam}&limit=8&offset=0`);
      const list = Array.isArray(data) ? data : data?.medicines || [];
      const meds: SearchResult[] = list.map((m: any) => ({
        id: m.id, type: 'medicine' as const, title: m.name, subtitle: `${m.brand} · ₹${m.price}`,
      }));
      setResults(meds);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    saveRecent(result.title);
    onClose();
    if (result.type === 'medicine') navigate('/shop');
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    doSearch(term);
    saveRecent(term);
  };

  const typeIcon = { medicine: Pill, order: ClipboardList, agency: Building2 };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ duration: 0.2 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[min(90vw,520px)] bg-white rounded-2xl shadow-2xl z-[60] overflow-hidden border border-slate-200">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 border-b border-slate-100">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input ref={inputRef} value={query} onChange={e => handleChange(e.target.value)} placeholder="Search medicines, orders..."
                className="flex-1 py-3.5 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400" />
              {query && <button onClick={() => { setQuery(''); setResults([]); }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-400" /></button>}
              <kbd className="hidden sm:inline text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {loading && <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}

              {!loading && query.length < 2 && recent.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Recent Searches</p>
                  {recent.map((term, i) => (
                    <button key={i} onClick={() => handleRecentClick(term)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-600 flex-1">{term}</span>
                      <ArrowRight size={12} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              {!loading && results.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">Medicines</p>
                  {results.map(r => {
                    const Icon = typeIcon[r.type];
                    return (
                      <button key={r.id} onClick={() => handleSelect(r)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                          <Icon size={14} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                          {r.subtitle && <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {!loading && query.length >= 2 && results.length === 0 && (
                <div className="text-center py-8">
                  <Search size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No results found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try a different search term</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
