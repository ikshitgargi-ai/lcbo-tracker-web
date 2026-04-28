'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SAMPLE_QUESTIONS = [
  'Which tracked SKU has the most stores listing it right now?',
  'Show me Red Admiral stores in Toronto sorted by on-hand.',
  'How many Fratelli wines are delisting this week?',
  'List the 5 LCBO stores with the most of our tracked SKUs on shelf.',
  'Which stores in the GTA West territory carry Chak De?',
];

interface Turn {
  question: string;
  sql?: string;
  answer?: string;
  rows?: Array<Record<string, unknown>>;
  columns?: string[];
  error?: string;
}

export default function AskPage() {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);

  const ask = useMutation({
    mutationFn: (q: string) => api.aiAsk(q),
    onSuccess: (res) =>
      setTurns((t) => [
        { question: res.question, sql: res.sql, answer: res.answer, rows: res.rows, columns: res.columns },
        ...t,
      ]),
    onError: (err: unknown, q) =>
      setTurns((t) => [{ question: q, error: (err as Error).message }, ...t]),
  });

  const aiNotConfigured = ask.error
    ? String((ask.error as Error).message || '').includes('ANTHROPIC_API_KEY')
    : false;

  function submit(q?: string) {
    const question = (q ?? input).trim();
    if (!question) return;
    setInput('');
    ask.mutate(question);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
          <Sparkles size={24} className="text-[var(--color-accent)]" />
          AI Assistant
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Ask anything about the LCBO data — I translate to SQL, run it read-only, and
          summarize. Powered by Claude.
        </p>
      </header>

      {aiNotConfigured && (
        <div className="m-card flex items-start gap-3 border-[var(--color-warning)]/50 bg-[rgba(253,203,110,0.06)]">
          <Sparkles size={18} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-xs">
            <div className="font-semibold text-[var(--color-foreground)] mb-1">
              Claude API key not configured
            </div>
            <div className="text-muted">
              The backend is missing <code>ANTHROPIC_API_KEY</code>. Set it on Render:
            </div>
            <ol className="list-decimal ml-4 mt-2 space-y-1 text-muted">
              <li>Go to Render dashboard → lcbo-tracker service → Environment</li>
              <li>Add new env var: <code>ANTHROPIC_API_KEY</code> = your key</li>
              <li>Render will auto-redeploy in ~60s. Refresh and ask again.</li>
            </ol>
            <div className="text-muted mt-2">
              Get a key at{' '}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] underline"
              >
                console.anthropic.com
              </a>
              . ~$5/mo at expected volume.
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How many stores are delisting Red Admiral?"
              className="select flex-1"
              maxLength={500}
              disabled={ask.isPending}
            />
            <Button type="submit" disabled={ask.isPending || !input.trim()}>
              {ask.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {ask.isPending ? 'Thinking…' : 'Ask'}
            </Button>
          </form>
          {turns.length === 0 && !ask.isPending && (
            <div className="mt-4">
              <p className="text-xs text-[var(--color-muted)] mb-2">Try:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => submit(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-card)] border border-[var(--color-card-border)] hover:border-[var(--color-accent)] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {turns.map((t, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-sm">You asked</CardTitle>
              <CardDescription>{t.question}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.error && (
                <div className="text-sm text-[var(--color-danger)]">⚠ {t.error}</div>
              )}
              {t.answer && (
                <div className="p-3 rounded-lg bg-[rgba(212,165,116,0.08)] border border-[rgba(212,165,116,0.3)] text-sm leading-relaxed">
                  {t.answer}
                </div>
              )}
              {t.sql && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-accent)]">
                    Show SQL
                  </summary>
                  <pre className="mt-2 p-3 rounded-lg bg-[#0a0c10] border border-[var(--color-card-border)] overflow-x-auto font-mono text-[11px]">
                    {t.sql}
                  </pre>
                </details>
              )}
              {t.rows && t.rows.length > 0 && t.columns && (
                <details open className="text-xs">
                  <summary className="cursor-pointer text-[var(--color-muted)]">
                    {t.rows.length} rows
                  </summary>
                  <div className="mt-2 overflow-x-auto -mx-4 sm:mx-0">
                    <table className="data-table min-w-full">
                      <thead>
                        <tr>
                          {t.columns.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.rows.slice(0, 20).map((row, j) => (
                          <tr key={j}>
                            {t.columns!.map((c) => (
                              <td key={c} className="text-xs tabular-nums">
                                {String(row[c] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
