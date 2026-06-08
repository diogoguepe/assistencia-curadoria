import React, { useState } from 'react';
import { PipelineStep } from '../types';
import { HelpCircle, Search, Cpu, FileText, CheckCircle2, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface CurationPipelineProps {
  steps: PipelineStep[];
  responseTimeMs?: number;
}

export function CurationPipeline({ steps, responseTimeMs }: CurationPipelineProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(2); // Default expand the 'Curadoria' intelligence phase because it is the most interesting one!

  const toggleStep = (idx: number) => {
    if (expandedIndex === idx) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(idx);
    }
  };

  const getIcon = (title: string, status: string) => {
    if (status === 'completed') {
      return (
        <div className="relative flex items-center justify-center w-8 h-8 z-10">
          <div className="w-[15px] h-[15px] rounded-full bg-slate-900 border-2 border-white ring-1 ring-slate-200" />
        </div>
      );
    } else if (status === 'active') {
      return (
        <div className="relative flex items-center justify-center w-8 h-8 z-10">
          <div className="w-[15px] h-[15px] rounded-full bg-blue-500 border-2 border-white ring-1 ring-slate-200 animate-pulse" />
        </div>
      );
    } else if (status === 'error') {
      return (
        <div className="relative flex items-center justify-center w-8 h-8 z-10">
          <div className="w-[15px] h-[15px] rounded-full bg-amber-500 border-2 border-white ring-1 ring-slate-200" />
        </div>
      );
    } else {
      return (
        <div className="relative flex items-center justify-center w-8 h-8 z-10">
          <div className="w-[15px] h-[15px] rounded-full bg-white border-2 border-slate-300 z-10" />
        </div>
      );
    }
  };

  return (
    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 select-none">
            <Cpu className="w-4 h-4 text-slate-400" />
            Rastreabilidade Editorial
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Entenda como o motor de IA curou e recomendou o acervo
          </p>
        </div>
        {responseTimeMs !== undefined && (
          <div className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-100 self-start sm:self-auto">
            <Clock className="w-3 h-3 text-slate-400" />
            Tempo: <span className="font-semibold text-slate-800">{responseTimeMs}ms</span>
          </div>
        )}
      </div>

      {/* Steps vertical list containing connectors */}
      <div className="relative pl-3 space-y-4">
        {/* Longitudinal connector line */}
        <div className="absolute top-4 bottom-4 left-[15px] w-[1px] bg-slate-200 z-0" />

        {steps.map((step, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div key={idx} className="relative flex items-start gap-4 z-10">
              {/* Step indicator circle */}
              <div className="flex-shrink-0 cursor-pointer" onClick={() => toggleStep(idx)}>
                {getIcon(step.title, step.status)}
              </div>

              {/* Step content card */}
              <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-lg shadow-2xs hover:border-slate-200 transition-all duration-200">
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => toggleStep(idx)}
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase font-mono tracking-wider">
                        E-{idx + 1}: {step.title}
                      </h4>
                      {step.status === 'completed' && (
                        <span className="inline-flex text-[8px] font-bold bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">
                          OK
                        </span>
                      )}
                      {step.status === 'active' && (
                        <span className="inline-flex text-[8px] font-bold bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-100 uppercase tracking-widest animate-pulse">
                          PROCESSANDO
                        </span>
                      )}
                      {step.status === 'error' && (
                        <span className="inline-flex text-[8px] font-bold bg-amber-50 text-amber-700 px-1 py-0.5 rounded border border-amber-100 uppercase tracking-widest">
                          ALERTA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate pr-2">
                      {step.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {step.durationMs !== undefined && (
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                        {step.durationMs}ms
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                    )}
                  </div>
                </div>

                {/* Expanded metadata drawer */}
                {isExpanded && step.details && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/20 rounded-b-lg">
                    <div className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap select-text bg-slate-50 text-slate-700 p-2.5 rounded border border-slate-100">
                      {step.details}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connective text at the end of pipeline */}
      <p className="text-[10px] text-center text-slate-400 mt-4 italic font-sans">
        *Rastreabilidade em conformidade com as diretrizes do catálogo da Editora.
      </p>
    </div>
  );
}
