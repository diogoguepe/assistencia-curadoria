import React, { useState, useEffect, useRef } from 'react';
import { CATALOG } from './data/books';
import { Book, AnswerResponse, PipelineStep } from './types';
import { BookCard } from './components/BookCard';
import { CurationPipeline } from './components/CurationPipeline';
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  AlertCircle, 
  Database, 
  RefreshCw, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Search, 
  Bookmark, 
  RotateCcw,
  Copy,
  Info,
  Layers,
  Sliders,
  Filter,
  Check
} from 'lucide-react';
import Markdown from 'react-markdown';

export default function App() {
  // Main state variables
  const [query, setQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [answerResponse, setAnswerResponse] = useState<AnswerResponse | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string>('');
  const [feedbackState, setFeedbackState] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');

  // Browse Catalog Sidebar filters
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGenreFilter, setCatalogGenreFilter] = useState('Todos');
  const [selectedBookDetail, setSelectedBookDetail] = useState<Book | null>(null);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);

  // Helper for scrolling to references smoothly
  const resultsRef = useRef<HTMLDivElement>(null);

  // Trigger list for quick queries
  const suggestions = [
    {
      label: "Livros sobre inteligência artificial",
      query: "Quais são as obras em nosso catálogo que abordam Inteligência Artificial, redes neurais ou desenvolvimento corporativo contemporâneo?"
    },
    {
      label: "Livros infantis recentes",
      query: "Indique livros infantis de ficção ou ecológicos recentes lançados entre 2025 e 2026, com foco em suas abordagens lúdicas."
    },
    {
      label: "Livros de romance literário",
      query: "Quais são os romances contemporâneos e dramas marcantes ambientados no Brasil ou na Europa recomendados para nosso público-alvo adulto?"
    },
    {
      label: "Livros para campanha de lançamento",
      query: "Preciso de um mix de obras de negócios, escrita criativa ou oratória aptas para nossa próxima campanha nacional de lançamentos editoriais."
    }
  ];

  const genres = ['Todos', ...new Set(CATALOG.map(b => b.genre.split(' / ')[0]))];

  // Filter books in sidebar
  const filteredCatalogBooks = CATALOG.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          book.author.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                          book.synopsis.toLowerCase().includes(catalogSearch.toLowerCase());
    
    const matchesGenre = catalogGenreFilter === 'Todos' || book.genre.includes(catalogGenreFilter);
    return matchesSearch && matchesGenre;
  });

  const fetchCuratorResponse = async (userQuery: string) => {
    if (!userQuery.trim()) return;
    
    setIsLoading(true);
    setErrorMsg(null);
    setAnswerResponse(null);

    try {
      const res = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery }),
      });

      if (!res.ok) {
        throw new Error(`Serviço de IA indisponível (HTTP ${res.status}). Verifique a conexão.`);
      }

      const reqId = res.headers.get("X-Correlation-ID") || res.headers.get("X-Request-ID") || `mock-req-${Date.now()}`;
      setCurrentRequestId(reqId);
      setFeedbackState('idle');
      
      // Setup partial state for streaming
      let currentPipeline: PipelineStep[] = [];
      setAnswerResponse({
        answer: "",
        references: [],
        pipeline: currentPipeline,
        responseTimeMs: 0,
        booksCount: 0
      });

      // Keep isLoading true so the left pane shows the big spinner,
      // while the right pane shows the real-time pipeline.

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let buffer = "";

        const processSSEChunk = (chunk: string) => {
          if (!chunk.startsWith("data: ")) return;
          try {
            const event = JSON.parse(chunk.slice(6));

            if (event.type === "step") {
              currentPipeline = [...currentPipeline, event.data];
              setAnswerResponse(prev => prev ? { ...prev, pipeline: currentPipeline } : null);
            } else if (event.type === "result") {
              setAnswerResponse(prev => prev ? {
                ...prev,
                answer: event.data.answer,
                references: event.data.references,
                responseTimeMs: event.data.responseTimeMs,
                booksCount: event.data.booksCount
              } : null);
              setIsLoading(false);
            }
          } catch (e) {
            console.error("Error parsing SSE JSON", e);
          }
        };

        const flushBuffer = () => {
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            processSSEChunk(part.trim());
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }
          flushBuffer();
          if (done) {
            if (buffer.trim()) {
              processSSEChunk(buffer.trim());
              buffer = "";
            }
            break;
          }
        }
      }

      // Ensure loading state is cleared if stream ends without a result
      setIsLoading(false);

      // Auto scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (err: any) {
      console.error("Ask API error:", err);
      setErrorMsg(err.message || "Ocorreu um erro ao processar a curadoria automática.");
      setIsLoading(false);
    }
  };

  // Reset context to empty state
  const handleClear = () => {
    setQuery('');
    setPendingQuery('');
    setAnswerResponse(null);
    setErrorMsg(null);
    setIsLoading(false);
    setSelectedBookDetail(null);
    setSelectedReferenceId(null);
    setCurrentRequestId('');
    setFeedbackState('idle');
  };

  // Direct suggestion submit
  const handleSuggestionClick = (suggestedText: string) => {
    setQuery(suggestedText);
    fetchCuratorResponse(suggestedText);
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    fetchCuratorResponse(query);
  };

  const submitFeedback = async (rating: number) => {
    if (!currentRequestId || feedbackState === 'submitting') return;
    
    setFeedbackState('submitting');
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: currentRequestId, rating, comment: "" }),
      });
      
      if (!res.ok) throw new Error("Erro ao enviar feedback");
      setFeedbackState('submitted');
    } catch (err) {
      console.error("Feedback error:", err);
      setFeedbackState('error');
    }
  };

  // Removes useEffect for simulateState

  // Handle clicking on brackets reference in text
  const handleReferenceClick = (book: Book) => {
    setSelectedReferenceId(book.id);
    setSelectedBookDetail(book);
    
    // Scroll to the book card smoothly
    setTimeout(() => {
      const cardEl = document.getElementById(`book-card-${book.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900 antialiased overflow-x-hidden">
      {/* 1. Header & Sandbox simulation strip */}
      <header className="bg-white border-b border-slate-100 py-3 px-4 sm:px-8 sticky top-0 z-30 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <div>
              <h1 id="app-title-header" className="text-base font-semibold text-slate-900 leading-tight">
                Assistente de Curadoria do Catálogo
              </h1>
              <p className="text-xs text-slate-500">
                Inteligência Editorial Conectada
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main split grids */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1">
        
        {/* Left Side: Editorial Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Central search workspace */}
          <section className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
              Painel de Pesquisa Editorial
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Formule sua pergunta em linguagem natural para nossa Inteligência Curatorial varrer todo o catálogo da editora.
            </p>

            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <textarea
                  id="query-input-textarea"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: Quais são os principais livros de Ficção Científica para o público Jovem Adulto (YA)?..."
                  rows={3}
                  className="w-full pl-5 pr-14 py-4 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-slate-400 transition-colors font-sans leading-relaxed resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      fetchCuratorResponse(query);
                    }
                  }}
                />
                <div className="absolute right-3.5 bottom-3.5 flex gap-2">
                  {query && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-800 font-bold bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-250/40"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    id="submit-query-btn"
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className={`p-2 rounded-xl text-white transition-all ${
                      isLoading || !query.trim()
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Suggestions Chips layout - Clean Minimalism style */}
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(s.query)}
                    className="px-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 text-slate-600 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 1. Loading screen layout */}
          {isLoading && (
            <div className="bg-white border border-slate-100 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[320px] text-center shadow-xs animate-fadeIn">
              <div className="relative flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin" />
                <Database className="w-4 h-4 text-slate-700 absolute" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 font-mono uppercase tracking-wider">
                Consolidando Curadoria Inteligente...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Cruzando busca híbrida (FTS + pgvector) com o modelo GPT-4o-mini via OpenRouter.
              </p>
              
              <div className="w-full max-w-md mt-8 space-y-3 pt-6 border-t border-slate-100 text-left">
                <div className="h-3 bg-slate-50 rounded-full w-2/3 animate-pulse" />
                <div className="h-2 bg-slate-50 rounded-full w-full animate-pulse" />
                <div className="h-2 bg-slate-50 rounded-full w-11/12 animate-pulse" />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="h-14 bg-slate-50/50 rounded-xl border border-slate-100 animate-pulse" />
                  <div className="h-14 bg-slate-50/50 rounded-xl border border-slate-100 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* 2. Empty state layout */}
          {!answerResponse && !isLoading && !errorMsg && (
            <div className="bg-white border border-slate-100 rounded-2xl p-8 py-12 flex flex-col items-center justify-center text-center shadow-2xs animate-fadeIn">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-widest font-mono">
                Agente de Curation em Espera
              </h3>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Nenhuma pergunta está em processamento no momento. Escreva acima para consultar.
              </p>
            </div>
          )}

          {/* 3. Error state layout */}
          {errorMsg && !isLoading && (
            <div className="bg-white border border-red-100 rounded-xl p-6 shadow-sm animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Falha na Operação do Serviço
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {errorMsg}
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 mt-4 text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-slate-400" /> Possíveis correções para analistas:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Verifique as credenciais no painel de Segredos.</li>
                      <li>Alterne o estado utilizando a barra de controle superior para retornar resultados demonstrativos.</li>
                    </ul>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => fetchCuratorResponse(query || "Destaques gerais")}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-black text-white rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" /> Tentar novamente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Resolved Normal Curation Screen */}
          {answerResponse && !isLoading && !errorMsg && (
            <div ref={resultsRef} className="space-y-6 animate-fadeIn">

              {/* Answer block container in Minimalism theme */}
              <section id="results-assistant-section" className="bg-white border border-slate-100 rounded-2xl p-6 relative overflow-hidden">
                
                {/* Meta stats indicator bar */}
                <div className="px-6 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 rounded-t-2xl -mx-6 -mt-6 mb-6">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Livros Recuperados</span>
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{answerResponse.booksCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Tempo de Resposta</span>
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{(answerResponse.responseTimeMs / 1000).toFixed(2)}s</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">API: /api/ask · /api/ask/stream</span>
                  </div>
                </div>

                {/* Speech user question block integrated seamlessly */}
                {query && (
                  <div className="flex flex-col items-end mb-8 border-b border-slate-100/50 pb-6">
                    <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl rounded-tr-none text-xs sm:text-sm max-w-[85%] font-sans shadow-2xs leading-relaxed">
                      {query}
                    </div>
                  </div>
                )}

                <div className="prose max-w-none">
                  {/* Assistant response tag */}
                  <div className="flex items-center gap-2 text-slate-400 mb-4 select-none">
                    <div className="w-5 h-5 bg-blue-50 border border-blue-100 rounded flex items-center justify-center">
                      <span className="text-[10px] font-bold text-blue-600 italic">A</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest">Resposta Gerada</span>
                  </div>
                  
                  {/* Markdown rendered answers */}
                  <div className="markdown-body text-sm text-slate-700 leading-relaxed font-sans select-text">
                    <Markdown
                      components={{
                        text: ({ node, ...props }) => {
                          const textNodeValue = props.children?.toString() || '';
                          const bookRefRegex = /\[(\d+)\]/g;
                          
                          if (bookRefRegex.test(textNodeValue)) {
                            const parts = textNodeValue.split(bookRefRegex);
                            return (
                              <span>
                                {parts.map((p, index) => {
                                  if (index % 2 === 1) {
                                    const matchingBook = CATALOG.find(b => b.id === p);
                                    if (matchingBook) {
                                      return (
                                        <button
                                          key={index}
                                          type="button"
                                          onClick={() => handleReferenceClick(matchingBook)}
                                          className="mx-1 inline-flex items-center justify-center font-mono text-[9px] bg-slate-900 hover:bg-black text-white font-bold px-1.5 py-0.5 rounded transition-colors text-center leading-none"
                                          title={`Ver: ${matchingBook.title}`}
                                        >
                                          {p}
                                        </button>
                                      );
                                    }
                                  }
                                  return p;
                                })}
                              </span>
                            );
                          }
                          return <span>{props.children}</span>;
                        }
                      }}
                    >
                      {answerResponse.answer}
                    </Markdown>
                  </div>
                  
                  {/* Feedback UI */}
                  <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-4">
                    {feedbackState === 'submitted' ? (
                      <span className="text-xs font-semibold text-green-600 flex items-center gap-1.5 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4" /> Obrigado pelo feedback!
                      </span>
                    ) : feedbackState === 'error' ? (
                      <span className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Erro ao enviar feedback.
                      </span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-medium text-slate-400">Esta resposta foi útil?</span>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => submitFeedback(5)}
                            disabled={feedbackState === 'submitting'}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-green-600 transition-colors disabled:opacity-50"
                            title="Sim, foi útil"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.514"></path></svg>
                          </button>
                          <button 
                            onClick={() => submitFeedback(1)}
                            disabled={feedbackState === 'submitting'}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Não, precisa melhorar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.514"></path></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Citations as list of consults */}
                {answerResponse.references.length > 0 && (
                  <div className="mt-8 pt-5 border-t border-slate-100">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 select-none">Fontes Consultadas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {answerResponse.references.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => handleReferenceClick(book)}
                          className={`p-2 rounded border text-left flex items-center justify-between transition-colors ${
                            selectedReferenceId === book.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-100'
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">REF-{book.id} &middot; {book.title}</span>
                          <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Segment 2: Books Utilized Grid */}
              <section className="space-y-3">
                <div className="flex items-center justify-between select-none">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Livros Utilizados ({answerResponse.references.length})
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                    Clique em um card para inspecionar dados estendidos na Ficha
                  </span>
                </div>

                {answerResponse.references.length === 0 ? (
                  <div className="p-6 bg-white border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    Nenhum livro catalogado foi indexado a esta resposta. Tente redefinir sua pesquisa.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {answerResponse.references.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        isHighlighted={selectedReferenceId === book.id}
                        onReferenceClick={(b) => {
                          setSelectedReferenceId(b.id);
                          setSelectedBookDetail(b);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Segment 3 removed from left column and moved to right column */}
            </div>
          )}
        </div>

        {/* Right Side Pane: Browser/Discover catalog drawer (4 Grid slots) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex flex-col max-h-[750px]">
            <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5 select-none">
                <Database className="w-4 h-4 text-slate-400" />
                Catálogo Base da Editora ({CATALOG.length})
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal font-medium">
                Pautas comerciais e dados de todo o portfólio físico e digital de lançamentos sênior.
              </p>
            </div>

            {/* Filter controls */}
            <div className="space-y-2 mb-4 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Pesquisar catálogo por termo..."
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 bg-slate-50/50"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Genre filter buttons */}
              <div className="flex flex-wrap gap-1 pt-1">
                {genres.map(g => (
                  <button
                    key={g}
                    onClick={() => setCatalogGenreFilter(g)}
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                      catalogGenreFilter === g
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Support list */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {filteredCatalogBooks.map(book => {
                const isSelected = selectedBookDetail?.id === book.id;
                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      setSelectedBookDetail(book);
                      setSelectedReferenceId(book.id);
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex gap-3 ${
                      isSelected
                        ? 'bg-slate-900 border-slate-950 text-white shadow-3xs'
                        : 'bg-slate-50/50 hover:bg-slate-100/60 border-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="shrink-0 w-2.5 relative rounded-sm overflow-hidden self-stretch bg-slate-200">
                      <div className={`absolute inset-0 bg-gradient-to-br ${book.coverColor}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-1 select-none">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-semibold truncate leading-tight">
                          {book.title}
                        </h4>
                        <span className={`font-mono text-[9px] border px-1 rounded shrink-0 ${
                          isSelected ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-400 border-slate-100'
                        }`}>
                          #{book.id}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-tight truncate mt-0.5 ${isSelected ? 'text-slate-350' : 'text-slate-500'}`}>
                        {book.author}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono opacity-80 leading-none">
                        <span>{book.genre.split(' / ')[0]}</span>
                        <span className="opacity-45">&middot;</span>
                        <span>R$ {book.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredCatalogBooks.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  Nenhum livro correspondente encontrado.
                </div>
              )}
            </div>
          </section>

          {/* Book detail details workspace picker */}
          {selectedBookDetail && (
            <section className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm animate-fadeIn text-xs space-y-3 relative">
              <button
                onClick={() => setSelectedBookDetail(null)}
                className="absolute top-3.5 right-3.5 text-[10px] text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                Fechar ×
              </button>
              
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 pr-8">
                <span className="inline-flex items-center justify-center font-mono text-[9px] bg-slate-950 text-white font-bold px-1.5 py-0.5 rounded">
                  FICH-{selectedBookDetail.id}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Ficha Bibliográfica
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {selectedBookDetail.title}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  por {selectedBookDetail.author}
                </p>
              </div>

              {/* Data values */}
              <div className="grid grid-cols-2 gap-2 text-[10px] leading-tight bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 font-mono text-slate-600">
                <div>
                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Ano:</span>
                  <span className="font-semibold text-slate-800">{selectedBookDetail.publicationYear}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Páginas:</span>
                  <span className="font-semibold text-slate-800">{selectedBookDetail.pages}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Preço:</span>
                  <span className="font-semibold text-slate-800">R$ {selectedBookDetail.price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">Gênero:</span>
                  <span className="font-semibold text-slate-800 text-[9px] truncate block">{selectedBookDetail.genre.split(' / ')[0]}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-100">
                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-0.5">ISBN:</span>
                  <span className="font-semibold text-slate-800 text-[9px]">{selectedBookDetail.isbn}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px] select-none">
                  Consultar sobre esta obra:
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      const newQ = `Indique argumentos de vendas fortes e faça uma sinopse estendida para o livro "${selectedBookDetail.title}" do autor ${selectedBookDetail.author}`;
                      setQuery(newQ);
                    }}
                    className="w-full text-left p-2 rounded bg-slate-50/50 hover:bg-slate-100 text-[11px] text-slate-700 hover:text-slate-900 border border-slate-100 transition-all flex items-center justify-between"
                  >
                    <span>Argumentos comerciais de venda</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => {
                      const newQ = `Escreva 5 ideias originais de postagens no Instagram e ideias para Booktokers divulgarem o livro "${selectedBookDetail.title}" (${selectedBookDetail.genre})`;
                      setQuery(newQ);
                    }}
                    className="w-full text-left p-2 rounded bg-slate-50/50 hover:bg-slate-100 text-[11px] text-slate-700 hover:text-slate-900 border border-slate-100 transition-all flex items-center justify-between"
                  >
                    <span>Ideias de Marketing / BookTok</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Segment 3: Pipeline Tracker moved to Right Pane */}
          {answerResponse?.pipeline && answerResponse.pipeline.length > 0 ? (
            <section className="animate-fadeIn">
              <CurationPipeline 
                steps={answerResponse.pipeline} 
                responseTimeMs={answerResponse.responseTimeMs || 0} 
              />
            </section>
          ) : (
            <section className="bg-slate-50/50 border border-slate-100 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center opacity-70 animate-fadeIn min-h-[150px]">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3">
                <Search className="w-4 h-4 text-slate-300" />
              </div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Rastreabilidade Editorial
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                Aguardando nova pesquisa para monitorar os vetores da IA...
              </p>
            </section>
          )}
        </div>

      </main>

      {/* Footer credits system */}
      <footer className="bg-white border-t border-slate-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400 select-none">
          <p>© 2026 Editora Nacional - Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-[10px] font-mono pb-2 sm:pb-0">
            <span>Ambiente: Produção</span>
            <span className="text-slate-200">|</span>
            <span>Versão: v3.12</span>
            <span className="text-slate-200">|</span>
            <span>Segurança: Ativa TLS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
