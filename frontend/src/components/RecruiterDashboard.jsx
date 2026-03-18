/**
 * RecruiterDashboard component.
 *
 * Displays a ranked list of candidates for a selected job offer,
 * including match scores rendered as progress bars and a gap analysis
 * showing matched versus missing skills.
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
  if (percentage >= 70) barColor = 'bg-green-500'
  else if (percentage >= 40) barColor = 'bg-yellow-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span
        className={`text-sm font-semibold w-12 text-right tabular-nums ${
          percentage >= 70
            ? 'text-green-700'
            : percentage >= 40
            ? 'text-yellow-700'
            : 'text-red-700'
        }`}
      >
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
    <div className="card transition-shadow hover:shadow-md">
      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              rank === 1
                ? 'bg-yellow-500'
                : rank === 2
                ? 'bg-gray-400'
                : rank === 3
                ? 'bg-amber-700'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <User size={16} className="text-gray-400 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {candidate.full_name}
                </h3>
              </div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
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
            <div className="mt-2">
              <ScoreBar score={score} />
            </div>

            {/* Coverage summary */}
            <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle size={12} className="text-green-500" />
                {matched_skills.length} competenze corrispondenti
              </span>
              <span className="flex items-center gap-1">
                <XCircle size={12} className="text-red-400" />
                {gap_skills.length} competenze mancanti
              </span>
            </div>
          </div>
        </div>

        {/* Expanded detail panel */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            {/* Coverage metric */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Copertura requisiti
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-brand-700 w-8 text-right tabular-nums">
                  {coveragePercent}%
                </span>
              </div>
            </div>

            {/* Matched skills */}
            {matched_skills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-500" />
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
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <XCircle size={12} className="text-red-400" />
                  Competenze mancanti (gap)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gap_skills.map((skill) => (
                    <SkillTag key={skill} skill={skill} variant="gap" />
                  ))}
                </div>
              </div>
            )}

            {/* CV preview */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Estratto CV
              </p>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                {candidate.cv_text}
              </p>
            </div>

            {/* Score breakdown */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp size={12} />
                Punteggio composito
              </p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">
                {(score * 100).toFixed(1)} / 100
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                70% Sentence-Transformer semantico + 30% TF-IDF lessicale
              </p>
            </div>
          </div>
        )}
      </div>
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
        <h2 className="text-xl font-semibold text-gray-900">Recruiter Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Seleziona un'offerta di lavoro per visualizzare la classifica dei candidati
          con punteggi di corrispondenza e analisi dei gap di competenze.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Job offer selector */}
          <div className="sm:col-span-2">
            <label htmlFor="job-offer-select" className="form-label">
              Offerta di lavoro
            </label>
            <div className="relative">
              <Briefcase
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <select
                id="job-offer-select"
                className="form-input pl-9 pr-8 appearance-none"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Top N selector */}
          <div>
            <label htmlFor="top-n-select" className="form-label">
              Candidati da visualizzare
            </label>
            <select
              id="top-n-select"
              className="form-input"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Refresh button */}
        {selectedOfferId && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={loadRankings}
              disabled={loading}
              className="btn-secondary"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Calcolo in corso...' : 'Aggiorna classifica'}
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary stats */}
      {rankings && selectedOffer && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Offerta selezionata
            </p>
            <p className="text-base font-semibold text-gray-900 mt-1 truncate">
              {selectedOffer.title}
            </p>
            <p className="text-sm text-gray-500 truncate">{selectedOffer.company}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Candidati analizzati
            </p>
            <p className="text-2xl font-bold text-brand-600 mt-1">
              {rankings.length}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Punteggio medio
            </p>
            <p className="text-2xl font-bold text-brand-600 mt-1 tabular-nums">
              {avgScore !== null ? `${Math.round(avgScore * 100)}%` : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Required skills reference */}
      {selectedOffer && (
        <div className="card p-4 sm:p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Competenze richieste
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedOffer.required_skills.map((skill) => (
              <SkillTag key={skill} skill={skill} variant="default" />
            ))}
          </div>
        </div>
      )}

      {/* Rankings list */}
      {rankings && rankings.length === 0 && (
        <div className="card p-8 text-center">
          <User size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Nessun candidato registrato. Registra candidati nella sezione "Candidati".
          </p>
        </div>
      )}

      {rankings && rankings.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Classifica candidati per punteggio di corrispondenza (decrescente)
          </p>
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
        <div className="card p-12 text-center">
          <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-sm text-gray-400">
            Seleziona un'offerta di lavoro per avviare l'analisi dei candidati.
          </p>
        </div>
      )}
    </div>
  )
}
