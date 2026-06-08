import React, { useState } from 'react';
import { Book } from '../types';
import { BookOpen, Copy, Check, Sparkles, User, Tag, HelpCircle, ArrowRight } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onReferenceClick?: (book: Book) => void;
  isHighlighted?: boolean;
}

export function BookCard({ book, onReferenceClick, isHighlighted = false }: BookCardProps) {
  const [copied, setCopied] = useState(false);
  const [showHooks, setShowHooks] = useState(false);

  const copyToClipboard = () => {
    const text = `"${book.title}" - ${book.author} (${book.genre})\nPúblico-alvo: ${book.targetAudience}\nISBN: ${book.isbn} | R$ ${book.price.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`book-card-${book.id}`}
      className={`group relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all duration-300 ${
        isHighlighted
          ? 'bg-slate-50 border-slate-400 shadow-sm outline-[1.5px] outline-slate-200/50'
          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/30'
      }`}
    >
      {/* Visual Book Cover Mockup */}
      <div 
        className="flex-shrink-0 flex items-center justify-center sm:justify-start"
        onClick={() => onReferenceClick?.(book)}
      >
        <div className="relative cursor-pointer transition-transform duration-300 group-hover:scale-102 active:scale-95 border-b border-r border-slate-100/50 rounded-r-md overflow-hidden w-[76px] h-[110px] flex flex-col justify-between p-2.5 bg-gradient-to-br select-none">
          {/* Cover gradient helper */}
          <div className={`absolute inset-0 bg-gradient-to-br ${book.coverColor || 'from-slate-800 to-slate-900 text-white'}`} />
          
          {/* Embossed content over cover */}
          <div className="relative z-10 flex flex-col justify-between h-full text-[10px] leading-tight font-sans">
            <span className="font-mono text-[8px] tracking-widest opacity-80 uppercase font-bold text-white/90">
              {book.id.padStart(2, '0')} · CAT
            </span>
            <div className="my-1">
              <p className="font-bold tracking-tight text-white line-clamp-3 leading-[1.15]">
                {book.title}
              </p>
              <p className="text-[8px] opacity-75 mt-0.5 text-white/80 italic font-medium truncate">
                {book.author}
              </p>
            </div>
            <p className="text-[7px] text-yellow-300 tracking-wider font-semibold uppercase font-mono mt-auto border-t border-white/10 pt-1">
              {book.genre.split(' ')[0]}
            </p>
          </div>

          {/* Book Spine Overlay Edge Effect */}
          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-black/15 shadow-[inset_-1px_0_0_rgba(255,255,255,0.1)] z-20" />
          <div className="absolute top-0 bottom-0 left-1.5 w-0.5 bg-white/10 z-20" />
        </div>
      </div>

      {/* Book Metadata & Body */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Header row */}
          <div className="flex items-start justify-between gap-1.5">
            <h4 
              className="text-xs sm:text-sm font-bold text-slate-900 hover:text-black cursor-pointer truncate"
              onClick={() => onReferenceClick?.(book)}
            >
              <span className="inline-flex items-center justify-center font-mono text-[9px] bg-slate-150/50 text-slate-500 px-1.5 py-0.5 rounded mr-1.5 align-middle border border-slate-100">
                REF-{book.id}
              </span>
              {book.title}
            </h4>

            {/* Quick Actions */}
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={copyToClipboard}
                title="Copiar dados bibliográficos"
                className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-755 hover:text-slate-900 transition-colors border border-slate-100"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Author */}
          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" /> {book.author}
          </p>

          {/* Technical badges schema */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center text-[10px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100">
              <Tag className="w-2.5 h-2.5 mr-1 text-slate-400" />
              {book.genre}
            </span>
            <span className="inline-flex items-center text-[10px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100">
              <HelpCircle className="w-2.5 h-2.5 mr-1 text-slate-400" />
              Para: {book.targetAudience}
            </span>
          </div>

          {/* Synopsis */}
          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {book.synopsis}
          </p>
        </div>

        {/* Footer info row */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
            <span>Ano: {book.publicationYear}</span>
            <span className="text-slate-200">•</span>
            <span>{book.pages} págs</span>
            <span className="text-slate-200">•</span>
            <span className="font-sans text-slate-700 font-semibold">R$ {book.price.toFixed(2)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowHooks(!showHooks)}
              className="text-[10px] font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-100 transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5 text-blue-600" />
              Ganchos Promocionais
            </button>
            <button
              onClick={() => onReferenceClick?.(book)}
              className="text-[10px] font-semibold text-slate-400 hover:text-slate-800 flex items-center gap-0.5 hover:bg-slate-50 px-1 py-1 rounded"
            >
              Ver ficha
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Floating Hooks Panel */}
        {showHooks && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg animate-fadeIn text-xs text-slate-700">
            <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1 select-none">
              <Sparkles className="w-3 h-3 text-blue-600" /> Ganchos de Venda & Redes Sociais:
            </p>
            <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600 leading-relaxed font-sans">
              {book.marketingHooks.map((hook, idx) => (
                <li key={idx}>{hook}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
