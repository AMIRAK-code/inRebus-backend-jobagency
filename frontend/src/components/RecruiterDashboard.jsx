/**
 * RecruiterDashboard component — with score breakdown and KPI stats.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Briefcase,
  ChevronDown,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Brain,
  FileText,
  Users,
  BarChart2,
} from 'lucide-react'
import { jobOffersApi } from '../api.js'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ score }) {
  const percentage = Math.round(score * 100)

  let barColor = 'bg-red-500'
  let textColor = 'text-red-400'
  if (percentage >= 70) { barColor = 'bg-[#4ade80]'; textColor = 'text-[#4ade80]' }
  else if (percentage >= 40) { barColor = 'bg-[#fbbf24]'; textColor = 'text-[#fbbf24]' }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className={`text-sm font-bold w-12 text-right tabular-nums ${textColor}`}>
        {percentage}%
      </span>
    </div>
  )
}

function MiniBar({ value, label, color }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <span className="text-[11px] font-bold tabular-nums text-[var(--text-secondary)]">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%`, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  )
}

function SkillTag({ skill, variant }) {
  const cls =
    variant === 'matched' ? 'badge-matched'
    : variant === 'gap' ? 'badge-gap'
    : 'badge-skill'
  return <span className={cls}>{skill}</span>
}

function CandidateCard({ ranking, rank }) {
  const [expanded, setExpanded] = useState(false)
  const { candidate, score, matched_skills, gap_skills, semantic_score, tfidf_score } = ranking

  const coveragePercent =
    matched_skills.length + gap_skills.length > 0
      ? Math.round((matched_skills.length / (matched_skills.length + gap_skills.length)) * 100)
      : 0

  let rankBg = 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]'
  if (rank === 1) rankBg = 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-yellow-500/30 shadow-sm'
  else if (rank === 2) rankBg = 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-500/30 shadow-sm'
  else if (rank === 3) rankBg = 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-amber-700/30 shadow-sm'

  return (
    <div className="card !p-5 mb-3 transition-all hover:border-[var(--border-hover)]">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Rank badge */}
        <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold ${rankBg}`}>
          #{rank}
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <User size={18} className="text-[var(--text-muted)] shrink-0" />
              <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{candidate.full_name}</h3>
            </div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-[var(--primary)] hover:text-white font-semibold flex items-center gap-1 border border-[var(--border)] hover:bg-[var(--primary)] hover:border-[var(--primary)] px-2.5 py-1 rounded-md transition-all"
              aria-expanded={expanded}
            >
              {expanded ? 'Comprimi' : 'Dettaglio'}
              <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="mt-3">
            <ScoreBar score={score} />
          </div>

          <div className="mt-3 flex items-center gap-5 text-sm text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-[#4ade80]" />
              {matched_skills.length} corrispondenti
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle size={14} className="text-[#f87171]" />
              {gap_skills.length} mancanti
            </span>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-5">
          {/* Coverage */}
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest">Copertura requisiti</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-700"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-[var(--primary)] w-8 text-right tabular-nums">{coveragePercent}%</span>
            </div>
          </div>

          {/* Score Breakdown */}
          {(semantic_score !== undefined && tfidf_score !== undefined) && (
            <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)] space-y-3">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                <BarChart2 size={11} /> Dettaglio punteggio
              </p>
              <MiniBar value={semantic_score} label="Semantico (BERT)" color="bg-[var(--primary)]" />
              <MiniBar value={tfidf_score} label="Lessicale (TF-IDF)" color="bg-[#a78bfa]" />
              <p className="text-[10px] text-[var(--text-muted)] pt-1">Formula: 70% semantico + 30% lessicale = {Math.round(score * 100)}%</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {matched_skills.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-[#4ade80]" /> Competenze presenti
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {matched_skills.map(s => <SkillTag key={s} skill={s} variant="matched" />)}
                </div>
              </div>
            )}
            {gap_skills.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest flex items-center gap-1.5">
                  <XCircle size={11} className="text-[#f87171]" /> Competenze mancanti
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gap_skills.map(s => <SkillTag key={s} skill={s} variant="gap" />)}
                </div>
              </div>
            )}
          </div>

          {/* CV preview */}
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={11} /> Estratto CV
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] line-clamp-6">
              {candidate.cv_text}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main RecruiterDashboard
// ---------------------------------------------------------------------------

export default function RecruiterDashboard({ jobOffers, candidatesCount }) {
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [rankings, setRankings] = useState(null)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [topN, setTopN] = useState(10)

  const activeOffers = jobOffers.filter(o => o.is_active !== false)

  const loadRankings = useCallback(async () => {
    if (!selectedOfferId) return
    setLoading(true)
    setError(null)
    try {
      const data = await jobOffersApi.getRankings(selectedOfferId, topN)
      setRankings(data.rankings)
      setSelectedOffer(data.job_offer)
    } catch (err) {
      setError(err.message)
      setRankings(null)
    } finally {
      setLoading(false)
    }
  }, [selectedOfferId, topN])

  useEffect(() => { loadRankings() }, [loadRankings])

  const avgScore = rankings && rankings.length > 0
    ? rankings.reduce((acc, r) => acc + r.score, 0) / rankings.length
    : null

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div>
        <h2 className="heading-font text-3xl font-semibold mb-2">Dashboard Matching</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Seleziona un'offerta per classificare automaticamente i candidati con punteggio NLP.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card !p-5">
          <div className="flex items-center gap-3 mb-1">
            <Users size={18} className="text-[var(--primary)]" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Candidati totali</p>
          </div>
          <p className="heading-font text-3xl font-bold text-[var(--text-primary)] tabular-nums">{candidatesCount ?? '—'}</p>
        </div>
        <div className="card !p-5">
          <div className="flex items-center gap-3 mb-1">
            <Briefcase size={18} className="text-[var(--primary)]" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Offerte attive</p>
          </div>
          <p className="heading-font text-3xl font-bold text-[var(--text-primary)] tabular-nums">{activeOffers.length}</p>
        </div>
        <div className="card !p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3 mb-1">
            <Brain size={18} className="text-[var(--primary)]" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Motore NLP</p>
          </div>
          <p className="heading-font text-base font-semibold text-[#4ade80]">Attivo</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">BERT + TF-IDF</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card !p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label htmlFor="job-offer-select" className="form-label">Offerta di lavoro</label>
            <div className="relative">
              <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <select
                id="job-offer-select"
                className="form-input pl-10 pr-10 appearance-none"
                style={{ WebkitAppearance: 'none' }}
                value={selectedOfferId}
                onChange={(e) => setSelectedOfferId(e.target.value)}
              >
                <option value="">-- Seleziona un'offerta attiva --</option>
                {activeOffers.map(o => (
                  <option key={o.id} value={o.id}>{o.title} — {o.company}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="top-n-select" className="form-label">Candidati da mostrare</label>
            <div className="relative">
              <select
                id="top-n-select"
                className="form-input pr-10 appearance-none"
                value={topN}
                style={{ WebkitAppearance: 'none' }}
                onChange={(e) => setTopN(Number(e.target.value))}
              >
                {[5, 10, 20, 50].map(n => (
                  <option key={n} value={n}>Top {n}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>
        </div>

        {selectedOfferId && (
          <div className="mt-5 flex justify-end">
            <button onClick={loadRankings} disabled={loading} className="btn-primary">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Calcolo in corso...' : 'Aggiorna classifica'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary stats */}
      {rankings && selectedOffer && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card !p-5 border-l-4 border-l-[var(--primary)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Offerta selezionata</p>
            <p className="heading-font text-base font-semibold text-[var(--text-primary)] truncate">{selectedOffer.title}</p>
            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
              <Briefcase size={12} /> {selectedOffer.company}
            </p>
          </div>
          <div className="card !p-5">
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Candidati analizzati</p>
            <p className="heading-font text-3xl font-bold text-[var(--primary)] mt-2 tabular-nums">{rankings.length}</p>
          </div>
          <div className="card !p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--primary-subtle)] rounded-full blur-2xl pointer-events-none opacity-60" />
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest relative z-10">Punteggio medio</p>
            <p className="heading-font text-3xl font-bold text-[var(--primary)] mt-2 tabular-nums relative z-10">
              {avgScore !== null ? `${Math.round(avgScore * 100)}%` : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Required skills */}
      {selectedOffer && (
        <div className="card !p-5">
          <p className="text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest">
            Competenze richieste ({selectedOffer.required_skills.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedOffer.required_skills.map(s => <SkillTag key={s} skill={s} variant="default" />)}
          </div>
        </div>
      )}

      {/* Rankings list */}
      {rankings && rankings.length === 0 && (
        <div className="card text-center !p-12 border-dashed">
          <User size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
          <p className="text-sm text-[var(--text-secondary)]">Nessun candidato registrato.</p>
        </div>
      )}

      {rankings && rankings.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
              <TrendingUp size={15} className="text-[var(--primary)]" />
              Classifica per punteggio decrescente
            </p>
          </div>
          {rankings.map((ranking, index) => (
            <CandidateCard key={ranking.candidate.id} ranking={ranking} rank={index + 1} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!selectedOfferId && !loading && (
        <div className="card text-center !p-16 border-dashed opacity-60">
          <Briefcase size={48} className="mx-auto text-[var(--text-muted)] mb-5 opacity-40" />
          <p className="text-[var(--text-secondary)] font-semibold">Seleziona un'offerta di lavoro</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Analizza e classifica i candidati per le skill richieste</p>
        </div>
      )}
    </div>
  )
}
