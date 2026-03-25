/**
 * RecruiterDashboard component.
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
} from 'lucide-react'
import { jobOffersApi } from '../api.js'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ score }) {
  const percentage = Math.round(score * 100)

  let barColor = 'bg-red-500'
  let textColor = 'text-red-500'
  if (percentage >= 70) {
    barColor = 'bg-[#4ade80]'
    textColor = 'text-[#4ade80]'
  }
  else if (percentage >= 40) {
    barColor = 'bg-[#fbbf24]'
    textColor = 'text-[#fbbf24]'
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor} shadow-[0_0_10px_currentColor]`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className={`text-sm font-semibold w-12 text-right tabular-nums ${textColor}`}>
        {percentage}%
      </span>
    </div>
  )
}

function SkillTag({ skill, variant }) {
  const cls =
    variant === 'matched'
      ? 'badge-matched'
      : variant === 'gap'
      ? 'badge-gap'
      : 'badge-skill'

  return <span className={cls}>{skill}</span>
}

function CandidateCard({ ranking, rank }) {
  const [expanded, setExpanded] = useState(false)
  const { candidate, score, matched_skills, gap_skills } = ranking
  const percentage = Math.round(score * 100)

  const coveragePercent =
    matched_skills.length + gap_skills.length > 0
      ? Math.round(
          (matched_skills.length / (matched_skills.length + gap_skills.length)) * 100,
        )
      : 0

  return (
    <div className="card !p-5 mb-3 transition-shadow hover:shadow-[0_4px_20px_rgba(249,115,22,0.1)] hover:border-[var(--primary-glow)]">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Rank badge */}
        <div
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold shadow-sm ${
            rank === 1
              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-yellow-500/30'
              : rank === 2
              ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-gray-500/30'
              : rank === 3
              ? 'bg-gradient-to-br from-[#d97706] to-[#b45309] text-white shadow-amber-700/30'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]'
          }`}
        >
          #{rank}
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <User size={18} className="text-[var(--text-muted)] shrink-0" />
              <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                {candidate.full_name}
              </h3>
            </div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-[var(--primary)] hover:text-white font-medium flex items-center gap-1 border border-[var(--primary-subtle)] hover:bg-[var(--primary)] px-2 py-1 rounded transition-colors"
              aria-expanded={expanded}
            >
              {expanded ? 'Comprimi' : 'Dettaglio'}
              <ChevronDown
                size={14}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Score bar */}
          <div className="mt-3">
            <ScoreBar score={score} />
          </div>

          {/* Coverage summary */}
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

      {/* Expanded detail panel */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-5">
          {/* Coverage metric */}
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest">
              Copertura requisiti
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)]"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-[var(--primary)] w-8 text-right tabular-nums">
                {coveragePercent}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Matched skills */}
            {matched_skills.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle size={12} className="text-[#4ade80]" />
                  Competenze presenti
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {matched_skills.map((skill) => (
                    <SkillTag key={skill} skill={skill} variant="matched" />
                  ))}
                </div>
              </div>
            )}

            {/* Gap skills */}
            {gap_skills.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest flex items-center gap-1.5">
                  <XCircle size={12} className="text-[#f87171]" />
                  Competenze mancanti
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gap_skills.map((skill) => (
                    <SkillTag key={skill} skill={skill} variant="gap" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CV preview */}
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest">
              Estratto CV
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
              {candidate.cv_text}
            </p>
          </div>

          {/* Score breakdown */}
          <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={12} className="text-[var(--primary)]" />
              Punteggio composito
            </p>
            <p className="heading-font text-xl font-bold text-[var(--text-primary)] tabular-nums">
              {(score * 100).toFixed(1)} <span className="text-sm font-normal text-[var(--text-muted)]">/ 100</span>
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              70% semantico (Sentence-Transformer) + 30% lessicale (TF-IDF)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main RecruiterDashboard component
// ---------------------------------------------------------------------------

export default function RecruiterDashboard({ jobOffers }) {
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [rankings, setRankings] = useState(null)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [topN, setTopN] = useState(10)

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

  useEffect(() => {
    loadRankings()
  }, [loadRankings])

  const avgScore =
    rankings && rankings.length > 0
      ? rankings.reduce((acc, r) => acc + r.score, 0) / rankings.length
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="heading-font text-2xl mb-2 text-[var(--text-primary)]">Recruiter Dashboard</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Seleziona un'offerta di lavoro per visualizzare la classifica dei candidati
          con punteggi di corrispondenza e analisi dei gap di competenze.
        </p>
      </div>

      {/* Controls */}
      <div className="card !p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Job offer selector */}
          <div className="sm:col-span-2">
            <label htmlFor="job-offer-select" className="form-label">
              Offerta di lavoro
            </label>
            <div className="relative">
              <Briefcase
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <select
                id="job-offer-select"
                className="form-input pl-10 pr-10 appearance-none bg-[var(--bg-elevated)] border-[var(--border)] focus:border-[var(--primary)] text-[var(--text-primary)] w-full block rounded-md py-2"
                style={{ WebkitAppearance: 'none' }}
                value={selectedOfferId}
                onChange={(e) => setSelectedOfferId(e.target.value)}
              >
                <option value="">-- Seleziona un'offerta --</option>
                {jobOffers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.title} — {offer.company}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
            </div>
          </div>

          {/* Top N selector */}
          <div>
            <label htmlFor="top-n-select" className="form-label">
              Candidati visualizzati
            </label>
            <div className="relative">
              <select
                id="top-n-select"
                className="form-input pr-10 appearance-none bg-[var(--bg-elevated)] border-[var(--border)] focus:border-[var(--primary)] text-[var(--text-primary)] w-full block rounded-md py-2 px-3"
                value={topN}
                style={{ WebkitAppearance: 'none' }}
                onChange={(e) => setTopN(Number(e.target.value))}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    Top {n}
                  </option>
                ))}
              </select>
              <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Refresh button */}
        {selectedOfferId && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={loadRankings}
              disabled={loading}
              className="btn-primary"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Calcolo in corso...' : 'Aggiorna classifica'}
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary stats */}
      {rankings && selectedOffer && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="card !p-5 border-l-4 border-l-[var(--primary)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">
              Offerta selezionata
            </p>
            <p className="heading-font text-base font-semibold text-[var(--text-primary)] mt-1 truncate">
              {selectedOffer.title}
            </p>
            <p className="text-sm text-[var(--text-secondary)] truncate flex items-center gap-1.5 mt-1">
               <Briefcase size={12}/> {selectedOffer.company}
            </p>
          </div>
          <div className="card !p-5">
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">
              Candidati analizzati
            </p>
            <p className="heading-font text-3xl font-bold text-[var(--primary)] mt-2">
              {rankings.length}
            </p>
          </div>
          <div className="card !p-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--primary-subtle)] rounded-full blur-xl pointer-events-none text-transparent"></div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest relative z-10">
              Punteggio medio
            </p>
            <p className="heading-font text-3xl font-bold text-[var(--primary)] mt-2 tabular-nums relative z-10 drop-shadow-[0_0_8px_var(--primary-glow)]">
              {avgScore !== null ? `${Math.round(avgScore * 100)}%` : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Required skills reference */}
      {selectedOffer && (
        <div className="card !p-5">
          <p className="text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest">
            Competenze richieste ({selectedOffer.required_skills.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedOffer.required_skills.map((skill) => (
              <SkillTag key={skill} skill={skill} variant="default" />
            ))}
          </div>
        </div>
      )}

      {/* Rankings list */}
      {rankings && rankings.length === 0 && (
        <div className="card text-center !p-12 border-dashed">
          <User size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
          <p className="text-sm text-[var(--text-secondary)]">
            Nessun candidato registrato. Registra candidati nella sezione "Candidati".
          </p>
        </div>
      )}

      {rankings && rankings.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center mb-1">
             <p className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
               Classifica per punteggio descrescente
             </p>
          </div>
          {rankings.map((ranking, index) => (
            <CandidateCard
              key={ranking.candidate.id}
              ranking={ranking}
              rank={index + 1}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!selectedOfferId && !loading && (
        <div className="card text-center !p-16 border-dashed opacity-70">
          <Briefcase size={48} className="mx-auto text-[var(--text-muted)] mb-5 opacity-40" />
          <p className="text-[var(--text-secondary)] font-medium">
            Seleziona un'offerta di lavoro
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            Mappa e analizza i candidati in base alle skill richieste
          </p>
        </div>
      )}
    </div>
  )
}
