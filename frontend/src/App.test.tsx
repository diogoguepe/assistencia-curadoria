import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

global.fetch = vi.fn();

window.HTMLElement.prototype.scrollIntoView = vi.fn();

function createMockSSEStream(events: Array<{ type: string; data: unknown }>) {
  const encoder = new TextEncoder();
  const payload = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });
}

function mockAskStreamResponse() {
  return {
    ok: true,
    headers: new Headers({ 'X-Correlation-ID': 'test-corr-id-123' }),
    body: createMockSSEStream([
      {
        type: 'step',
        data: {
          title: 'Pergunta Recebida',
          status: 'completed',
          description: 'Análise linguística e classificação da intenção do usuário.',
          durationMs: 10,
        },
      },
      {
        type: 'result',
        data: {
          answer: 'Resposta de teste da IA.',
          references: [],
          responseTimeMs: 100,
          booksCount: 0,
        },
      },
    ]),
  };
}

describe('App Component - Feedback System', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (global.fetch as any).mockResolvedValueOnce(mockAskStreamResponse());
  });

  it('deve enviar feedback positivo e mostrar mensagem de sucesso', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText(/Ex: Quais são os principais livros/i);
    fireEvent.change(input, { target: { value: 'Teste de pergunta' } });

    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText(/Esta resposta foi útil\?/i)).toBeInTheDocument();
    });

    const positiveBtn = screen.getByTitle('Sim, foi útil');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    fireEvent.click(positiveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        '/api/ask/stream',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ question: 'Teste de pergunta' }),
        })
      );
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ requestId: 'test-corr-id-123', rating: 5, comment: '' }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Obrigado pelo feedback!/i)).toBeInTheDocument();
    });
  });
});
