import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock the global fetch
global.fetch = vi.fn();

// Mock scrollIntoView which is not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('App Component - Feedback System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the initial fetch for "/api/ask"
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'X-Correlation-ID': 'test-corr-id-123' }),
      json: async () => ({
        answer: 'Resposta de teste da IA.',
        references: [],
        pipeline: [],
        responseTimeMs: 100,
        booksCount: 0
      })
    });
  });

  it('deve enviar feedback positivo e mostrar mensagem de sucesso', async () => {
    render(<App />);
    
    // 1. Simular uma pergunta para ativar a tela de resultados
    const input = screen.getByPlaceholderText(/Ex: Quais são os principais livros/i);
    fireEvent.change(input, { target: { value: 'Teste de pergunta' } });
    
    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    
    // Aguardar a tela de resposta aparecer (onde tem o texto "Esta resposta foi útil?")
    await waitFor(() => {
      expect(screen.getByText(/Esta resposta foi útil\?/i)).toBeInTheDocument();
    });

    // 2. Localizar o botão de Thumbs Up
    const positiveBtn = screen.getByTitle('Sim, foi útil');
    
    // Preparar o mock do fetch para a chamada de feedback
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    // 3. Clicar no feedback
    fireEvent.click(positiveBtn);

    // 4. Validar se a API de feedback foi chamada com os dados corretos
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2); // 1 para /ask, 1 para /feedback
      expect(global.fetch).toHaveBeenLastCalledWith("/api/feedback", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ requestId: 'test-corr-id-123', rating: 5, comment: "" })
      }));
    });

    // 5. Validar mudança na Interface Visual
    await waitFor(() => {
      expect(screen.getByText(/Obrigado pelo feedback!/i)).toBeInTheDocument();
    });
  });
});
