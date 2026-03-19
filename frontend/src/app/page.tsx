'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, FileText, Zap, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-parchment">
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--ink)' }}>
            <Sparkles size={16} style={{ color: 'var(--gold-light)' }} />
          </div>
          <span className="font-semibold text-ink text-lg tracking-tight serif">VedaAI</span>
        </div>
        <Link href="/create" className="btn-primary text-sm">
          Create Assessment <ArrowRight size={15} />
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-8 pt-20 pb-32">
        <div className="animate-fade-up text-center mb-6">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mono"
            style={{ background: 'var(--gold-pale)', color: 'var(--gold)' }}
          >
            <Sparkles size={12} /> AI-Powered Exam Generator
          </span>
        </div>

        <h1
          className="animate-fade-up animate-delay-100 text-center text-5xl md:text-7xl leading-none mb-6 serif"
          style={{ color: 'var(--ink)' }}
        >
          Craft Perfect <br />
          <em>Question Papers</em>
          <br /> in Seconds
        </h1>

        <p
          className="animate-fade-up animate-delay-200 text-center text-lg mb-12 max-w-xl mx-auto"
          style={{ color: 'var(--ink-muted)' }}
        >
          Define your parameters. Our AI structures a complete, section-wise assessment — instantly, intelligently.
        </p>

        <div className="animate-fade-up animate-delay-300 flex flex-col sm:flex-row gap-3 justify-center mb-24">
          <Link href="/create" className="btn-primary px-8 py-4 text-base">
            Start Creating <ArrowRight size={17} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-up animate-delay-400">
          {[
            {
              icon: <Zap size={20} />,
              title: 'Real-time Generation',
              desc: 'WebSocket-powered live updates as your paper is built question by question.',
            },
            {
              icon: <FileText size={20} />,
              title: 'Structured Sections',
              desc: 'Questions organized into sections A, B, C with proper instructions and difficulty tags.',
            },
            {
              icon: <Shield size={20} />,
              title: 'Smart Validation',
              desc: 'Marks balance automatically. No empty fields, no negative values, no surprises.',
            },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--parchment-dark)', color: 'var(--gold)' }}
              >
                {f.icon}
              </div>
              <h3 className="font-semibold text-ink mb-2 text-sm">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-light)' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
