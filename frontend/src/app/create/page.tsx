'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, X, Sparkles, Calendar, BookOpen,
  FileText, Hash, Star, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { useAppStore } from '@/store';
import { validateForm } from '@/lib/validate';
import { createAssignment, createWebSocket } from '@/lib/api';
import { WsMessage } from '@/types';

const QUESTION_TYPES = [
  { id: 'mcq', label: 'MCQ' },
  { id: 'short-answer', label: 'Short Answer' },
  { id: 'long-answer', label: 'Long Answer' },
  { id: 'true-false', label: 'True / False' },
  { id: 'fill-blank', label: 'Fill in the Blank' },
  { id: 'match', label: 'Match the Following' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Easy', color: 'var(--emerald)' },
  { id: 'medium', label: 'Medium', color: 'var(--gold)' },
  { id: 'hard', label: 'Hard', color: 'var(--crimson)' },
];

export default function CreatePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { form, errors, setFormField, setErrors, clearError, resetForm, setGenerationState, handleWsMessage } =
    useAppStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function toggleType(id: string) {
    const current = form.questionTypes;
    const next = current.includes(id) ? current.filter((t) => t !== id) : [...current, id];
    setFormField('questionTypes', next);
    clearError('questionTypes');
  }

  function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) return;
    setFormField('file', file);
  }

  function removeFile() {
    setFormField('file', null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const { assignmentId } = await createAssignment(form);

      setGenerationState({ progress: 5, message: 'Queued...', wsConnected: false });

      const ws = createWebSocket(assignmentId);

      ws.onmessage = (event) => {
        const msg: WsMessage = JSON.parse(event.data);
        handleWsMessage(msg, assignmentId);
        if (msg.type === 'completed' || msg.type === 'failed') {
          ws.close();
        }
      };

      ws.onerror = () => ws.close();

      resetForm();
      router.push(`/result/${assignmentId}`);
    } catch {
      setErrors({ title: 'Failed to submit. Please check your API connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-parchment">
      <nav className="flex items-center justify-between px-8 py-5 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-ghost">
            <ArrowLeft size={15} /> Back
          </Link>
          <div className="h-5 w-px" style={{ background: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--ink)' }}>
              <Sparkles size={14} style={{ color: 'var(--gold-light)' }} />
            </div>
            <span className="font-semibold text-ink serif">VedaAI</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-8 pb-20">
        <div className="mb-10 animate-fade-up">
          <h1 className="text-3xl md:text-4xl serif text-ink mb-2">New Assessment</h1>
          <p style={{ color: 'var(--ink-muted)' }} className="text-sm">
            Fill in the details and our AI will craft a structured question paper.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-8 animate-fade-up animate-delay-100">
            <h2 className="serif text-ink text-lg mb-6 flex items-center gap-2">
              <BookOpen size={18} style={{ color: 'var(--gold)' }} /> Basic Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="label">Assignment Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => { setFormField('title', e.target.value); clearError('title'); }}
                  placeholder="e.g. Chapter 5 — Thermodynamics Quiz"
                  className={`input-field ${errors.title ? 'input-error' : ''}`}
                />
                {errors.title && (
                  <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: 'var(--crimson)' }}>
                    <AlertCircle size={12} /> {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => { setFormField('subject', e.target.value); clearError('subject'); }}
                  placeholder="e.g. Physics, Mathematics"
                  className={`input-field ${errors.subject ? 'input-error' : ''}`}
                />
                {errors.subject && (
                  <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: 'var(--crimson)' }}>
                    <AlertCircle size={12} /> {errors.subject}
                  </p>
                )}
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Calendar size={13} /> Due Date *
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => { setFormField('dueDate', e.target.value); clearError('dueDate'); }}
                  min={new Date().toISOString().split('T')[0]}
                  className={`input-field ${errors.dueDate ? 'input-error' : ''}`}
                />
                {errors.dueDate && (
                  <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: 'var(--crimson)' }}>
                    <AlertCircle size={12} /> {errors.dueDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card p-8 animate-fade-up animate-delay-200">
            <h2 className="serif text-ink text-lg mb-6 flex items-center gap-2">
              <FileText size={18} style={{ color: 'var(--gold)' }} /> Question Configuration
            </h2>

            <div className="mb-6">
              <label className="label">Question Types *</label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((qt) => (
                  <button
                    key={qt.id}
                    type="button"
                    onClick={() => toggleType(qt.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                      form.questionTypes.includes(qt.id) ? 'tag-selected' : 'tag-unselected'
                    }`}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
              {errors.questionTypes && (
                <p className="flex items-center gap-1.5 text-xs mt-2" style={{ color: 'var(--crimson)' }}>
                  <AlertCircle size={12} /> {errors.questionTypes}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="label flex items-center gap-1.5">
                  <Hash size={13} /> Number of Questions *
                </label>
                <input
                  type="number"
                  value={form.totalQuestions}
                  onChange={(e) => {
                    setFormField('totalQuestions', e.target.value === '' ? '' : Number(e.target.value));
                    clearError('totalQuestions');
                  }}
                  placeholder="e.g. 20"
                  min={1}
                  max={100}
                  className={`input-field ${errors.totalQuestions ? 'input-error' : ''}`}
                />
                {errors.totalQuestions && (
                  <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: 'var(--crimson)' }}>
                    <AlertCircle size={12} /> {errors.totalQuestions}
                  </p>
                )}
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Star size={13} /> Total Marks *
                </label>
                <input
                  type="number"
                  value={form.totalMarks}
                  onChange={(e) => {
                    setFormField('totalMarks', e.target.value === '' ? '' : Number(e.target.value));
                    clearError('totalMarks');
                  }}
                  placeholder="e.g. 100"
                  min={1}
                  className={`input-field ${errors.totalMarks ? 'input-error' : ''}`}
                />
                {errors.totalMarks && (
                  <p className="flex items-center gap-1.5 text-xs mt-1.5" style={{ color: 'var(--crimson)' }}>
                    <AlertCircle size={12} /> {errors.totalMarks}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Overall Difficulty</label>
              <div className="flex gap-3">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setFormField('difficulty', d.id)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                      form.difficulty === d.id ? 'border-current' : 'border-transparent'
                    }`}
                    style={{
                      background: form.difficulty === d.id ? d.color + '18' : 'var(--parchment)',
                      color: form.difficulty === d.id ? d.color : 'var(--ink-light)',
                      borderColor: form.difficulty === d.id ? d.color : 'var(--border)',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-8 animate-fade-up animate-delay-300">
            <h2 className="serif text-ink text-lg mb-6 flex items-center gap-2">
              <Upload size={18} style={{ color: 'var(--gold)' }} /> Reference Material
              <span
                className="text-xs font-normal px-2 py-0.5 rounded-full"
                style={{ background: 'var(--parchment-dark)', color: 'var(--ink-light)' }}
              >
                Optional
              </span>
            </h2>

            {!form.file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
                style={{
                  borderColor: dragOver ? 'var(--gold)' : 'var(--border)',
                  background: dragOver ? 'var(--gold-pale)' : 'var(--parchment)',
                }}
              >
                <Upload size={24} className="mx-auto mb-3" style={{ color: 'var(--ink-light)' }} />
                <p className="text-sm font-medium text-ink mb-1">Drop a PDF or text file here</p>
                <p className="text-xs" style={{ color: 'var(--ink-light)' }}>
                  Max 10MB · PDF, TXT
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'var(--parchment-dark)' }}
              >
                <FileText size={20} style={{ color: 'var(--gold)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{form.file.name}</p>
                  <p className="text-xs" style={{ color: 'var(--ink-light)' }}>
                    {(form.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 rounded-lg hover:bg-white transition-colors"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <div className="mt-5">
              <label className="label">Additional Instructions</label>
              <textarea
                value={form.additionalInstructions}
                onChange={(e) => setFormField('additionalInstructions', e.target.value)}
                placeholder="e.g. Focus on numerical problems, include diagrams, use NCERT terminology..."
                rows={3}
                className="input-field resize-none"
              />
            </div>
          </div>

          <div className="animate-fade-up animate-delay-400">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-4 text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  Generate Question Paper <ChevronRight size={17} />
                </>
              )}
            </button>
            <p className="text-center text-xs mt-3" style={{ color: 'var(--ink-light)' }}>
              AI generation typically takes 15–30 seconds
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
