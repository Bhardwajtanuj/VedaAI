'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Sparkles, RefreshCw, Download, Printer,
  CheckCircle, AlertCircle, Loader2, Clock, BookOpen
} from 'lucide-react';
import { useAppStore } from '@/store';
import { getAssignment, createWebSocket, regenerateAssignment } from '@/lib/api';
import { Assignment, WsMessage } from '@/types';
import QuestionPaper from '@/components/QuestionPaper';

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { currentAssignment, setCurrentAssignment, generationState, setGenerationState, handleWsMessage } =
    useAppStore();

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectWs = useCallback((assignmentId: string) => {
    if (wsRef.current) wsRef.current.close();
    const ws = createWebSocket(assignmentId);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: WsMessage = JSON.parse(event.data);
      handleWsMessage(msg, assignmentId);
      if (msg.type === 'completed' || msg.type === 'failed') {
        ws.close();
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };
    ws.onerror = () => ws.close();
  }, [handleWsMessage]);

  const pollStatus = useCallback(
    async (assignmentId: string) => {
      try {
        const data = await getAssignment(assignmentId);
        setCurrentAssignment(data);
        if (data.status === 'completed' || data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    },
    [setCurrentAssignment]
  );

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const data = await getAssignment(id);
        setCurrentAssignment(data);
        if (data.status === 'pending' || data.status === 'processing') {
          connectWs(id);
          pollRef.current = setInterval(() => pollStatus(id), 4000);
        }
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    init();
    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, connectWs, pollStatus, router, setCurrentAssignment]);

  async function handleRegenerate() {
    if (!currentAssignment || regenerating) return;
    setRegenerating(true);
    setGenerationState({ progress: 0, message: 'Queued...', wsConnected: false });
    setCurrentAssignment({ ...currentAssignment, status: 'pending', result: undefined });
    try {
      await regenerateAssignment(id);
      connectWs(id);
      pollRef.current = setInterval(() => pollStatus(id), 4000);
    } catch {}
    setRegenerating(false);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--gold)' }} />
          <p className="text-ink-muted text-sm">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!currentAssignment) return null;

  return (
    <div className="min-h-screen bg-parchment">
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto no-print">
        <div className="flex items-center gap-3">
          <Link href="/create" className="btn-ghost text-sm">
            <ArrowLeft size={14} /> New
          </Link>
          <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--ink)' }}>
              <Sparkles size={12} style={{ color: 'var(--gold-light)' }} />
            </div>
            <span className="font-semibold text-ink text-sm serif">VedaAI</span>
          </div>
        </div>

        {currentAssignment.status === 'completed' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-ghost text-sm"
            >
              <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
              Regenerate
            </button>
            <button onClick={handlePrint} className="btn-ghost text-sm">
              <Printer size={14} /> Print
            </button>
            <button onClick={handlePrint} className="btn-primary text-sm">
              <Download size={14} /> Export PDF
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        {(currentAssignment.status === 'pending' || currentAssignment.status === 'processing') && (
          <GeneratingView progress={generationState.progress} message={generationState.message} assignment={currentAssignment} />
        )}

        {currentAssignment.status === 'failed' && (
          <FailedView error={currentAssignment.error} onRetry={handleRegenerate} />
        )}

        {currentAssignment.status === 'completed' && currentAssignment.result && (
          <QuestionPaper assignment={currentAssignment} />
        )}
      </main>
    </div>
  );
}

function GeneratingView({ progress, message, assignment }: { progress: number; message: string; assignment: Assignment }) {
  const steps = [
    { label: 'Request queued', done: progress >= 10 },
    { label: 'Building prompt', done: progress >= 30 },
    { label: 'AI generating questions', done: progress >= 70 },
    { label: 'Structuring output', done: progress >= 90 },
    { label: 'Complete', done: progress >= 100 },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-up">
      <div className="card p-10 w-full max-w-md text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--parchment-dark)' }}
        >
          <Sparkles size={28} style={{ color: 'var(--gold)' }} className="animate-pulse-slow" />
        </div>
        <h2 className="serif text-ink text-xl mb-1">Generating Paper</h2>
        <p className="text-xs mb-6" style={{ color: 'var(--ink-light)' }}>
          {assignment.title} · {assignment.subject}
        </p>

        <div className="progress-bar mb-2">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs mb-8" style={{ color: 'var(--ink-light)' }}>
          {message || 'Processing...'} — {progress}%
        </p>

        <div className="space-y-3 text-left">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  s.done ? 'opacity-100' : 'opacity-30'
                }`}
                style={{ background: s.done ? 'var(--emerald-pale)' : 'var(--parchment-dark)' }}
              >
                {s.done ? (
                  <CheckCircle size={12} style={{ color: 'var(--emerald)' }} />
                ) : (
                  <Clock size={10} style={{ color: 'var(--ink-light)' }} />
                )}
              </div>
              <span
                className={`text-xs transition-colors duration-300 ${s.done ? 'text-ink' : ''}`}
                style={{ color: s.done ? 'var(--ink)' : 'var(--ink-light)' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FailedView({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="card p-10 w-full max-w-md text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--crimson-pale)' }}
        >
          <AlertCircle size={28} style={{ color: 'var(--crimson)' }} />
        </div>
        <h2 className="serif text-ink text-xl mb-2">Generation Failed</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
          {error || 'Something went wrong. Please try again.'}
        </p>
        <button onClick={onRetry} className="btn-primary w-full justify-center">
          <RefreshCw size={15} /> Try Again
        </button>
      </div>
    </div>
  );
}
