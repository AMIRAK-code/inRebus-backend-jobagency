/**
 * SendOfferModal — slide-over panel for sending a job offer to a candidate.
 * Calls POST /matches to compute the real match score before sending.
 */

import { useState } from 'react'
import { X, Mail, Briefcase, Zap, CheckCircle, TrendingUp } from 'lucide-react'
import { matchesApi } from '../api.js'

export default function SendOfferModal({ candidate, jobOffers, onClose, onSuccess }) {
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [matchResult, setMatchResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  const activeOffers = jobOffers.filter(o => o.is_active !== false)

  async function handleComputeMatch() {
    if (!selectedOfferId) return
    setLoading(true)
    setError(null)
    setMatchResult(null)
    try {
      const result = await matchesApi.compute(candidate.id, selectedOfferId)
      setMatchResult(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    setSent(true)
    setTimeout(() => {
      onSuccess?.(`Offerta inviata a ${candidate.full_name}`)
      onClose()
    }, 1200)
  }

  const selectedOffer = activeOffers.find(o => o.id === selectedOfferId)
  const scorePercent = matchResult ? Math.round(matchResult.score * 100) : null

  let scoreColor = 'text-red-400'
  if (scorePercent >= 70) scoreColor = 'text-[#4ade80]'
  else if (scorePercent >= 40) scoreColor = 'text-[#fbbf24]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center text-[var(--primary)]">
              <Mail size={18} />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-base">Invia Offerta</p>
              <p className="text-xs text-[var(--text-muted)]">{candidate.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Candidate skill preview */}
          {candidate.skills.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Skill del candidato</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 8).map(s => (
                  <span key={s} className="badge-skill">{s}</span>
                ))}
                {candidate.skills.length > 8 && <span className="badge-skill">+{candidate.skills.length - 8}</span>}
              </div>
            </div>
          )}

          {/* Offer selector */}
          <div>
            <label className="form-label">Seleziona l'offerta</label>
            <div className="relative">
              <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <select
                className="form-input pl-10 appearance-none"
                style={{ WebkitAppearance: 'none' }}
                value={selectedOfferId}
                onChange={(e) => { setSelectedOfferId(e.target.value); setMatchResult(null); setSent(false) }}
              >
                <option value="">-- Scegli un'offerta attiva --</option>
                {activeOffers.map(o => (
                  <option key={o.id} value={o.id}>{o.title} — {o.company}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Compute match CTA */}
          {selectedOfferId && !matchResult && (
            <button
              onClick={handleComputeMatch}
              disabled={loading}
              className="btn-secondary w-full justify-center gap-2"
            >
              <Zap size={15} className={loading ? 'animate-pulse text-[var(--primary)]' : 'text-[var(--primary)]'} />
              {loading ? 'Calcolo compatibilità...' : 'Calcola compatibilità NLP'}
            </button>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          )}

          {/* Match result panel */}
          {matchResult && selectedOffer && (
            <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                  <TrendingUp size={12} /> Compatibilità
                </p>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor}`}>{scorePercent}%</span>
              </div>

              <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scorePercent >= 70 ? 'bg-[#4ade80]' : scorePercent >= 40 ? 'bg-[#fbbf24]' : 'bg-red-500'}`}
                  style={{ width: `${scorePercent}%` }}
                />
              </div>

              {matchResult.matched_skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4ade80] mb-1.5 flex items-center gap-1">
                    <CheckCircle size={10} /> {matchResult.matched_skills.length} Skill corrispondenti
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {matchResult.matched_skills.map(s => <span key={s} className="badge-matched">{s}</span>)}
                  </div>
                </div>
              )}

              {matchResult.gap_skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#f87171] mb-1.5">
                    {matchResult.gap_skills.length} Skill mancanti
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {matchResult.gap_skills.map(s => <span key={s} className="badge-gap">{s}</span>)}
                  </div>
                </div>
              )}

              {/* Pre-drafted message */}
              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Messaggio pre-compilato</p>
                <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)] leading-relaxed">
                  Gentile <strong className="text-[var(--text-primary)]">{candidate.full_name}</strong>,<br />
                  siamo lieti di presentarLe l'opportunità: <em>{selectedOffer.title}</em> presso <em>{selectedOffer.company}</em>.<br />
                  Il Suo profilo risulta compatibile al <strong className={scoreColor}>{scorePercent}%</strong>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 bg-[var(--bg-surface)]">
          <button onClick={onClose} className="btn-ghost">Annulla</button>
          <button
            onClick={handleSend}
            disabled={!matchResult || sent}
            className="btn-primary"
          >
            {sent ? <><CheckCircle size={15} /> Inviato!</> : <><Mail size={15} /> Conferma e Invia</>}
          </button>
        </div>
      </div>
    </div>
  )
}
