/**
 * inRebus Agency — Main Application
 * Minimal, functional B2B interface for job agencies.
 */

import { useEffect, useState, useCallback, useLayoutEffect } from 'react'
import {
  LayoutDashboard, Users, Briefcase, Trash2, AlertCircle, Building2,
  RefreshCw, Sun, Moon, Search, PlusCircle, Mail, Heart, ChevronDown,
  ChevronUp, Archive, CheckCircle2, Filter, X, Sparkles, Star,
  ArrowRight, TrendingUp,
} from 'lucide-react'

import RecruiterDashboard from './components/RecruiterDashboard.jsx'
import CandidateForm from './components/CandidateForm.jsx'
import JobOfferForm from './components/JobOfferForm.jsx'
import SendOfferModal from './components/SendOfferModal.jsx'
import { useToast, ToastContainer } from './components/Toast.jsx'
import { candidatesApi, jobOffersApi, shortlistApi, demoApi } from './api.js'

// Skill taxonomy categories for filter chips
const SKILL_CATEGORIES = {
  'ICT': ['python', 'java', 'javascript', 'typescript', 'sql', 'react', 'docker', 'machine learning'],
  'Manifattura': ['tornitura cnc', 'fresatura cnc', 'saldatura', 'montaggio meccanico', 'metrologia'],
  'Automazione': ['programmazione plc', 'siemens', 'scada', 'hmi', 'robotica industriale', 'industria 4.0'],
  'Logistica': ['gestione magazzino', 'wms', 'erp', 'sap', 'lean manufacturing', 'supply chain'],
  'Costruzioni': ['autocad', 'revit', 'bim', 'impianti elettrici', 'sicurezza cantiere'],
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'candidates', label: 'Candidati', icon: Users },
  { id: 'job-offers', label: 'Offerte', icon: Briefcase },
  { id: 'shortlist', label: 'Selezione', icon: Star },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500 mb-6">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reverse Match Modal — "Trova Offerta" for a candidate
// ---------------------------------------------------------------------------

function ReverseMatchModal({ candidate, onClose }) {
  const [rankings, setRankings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    candidatesApi.getRankings(candidate.id, 5).then(data => {
      setRankings(data.rankings)
    }).catch(err => {
      setError(err.message)
    }).finally(() => setLoading(false))
  }, [candidate.id])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="heading-font text-lg font-semibold">Offerte compatibili</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{candidate.full_name}</p>
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-3">
          {loading && (
            <div className="text-center py-8">
              <RefreshCw size={20} className="animate-spin mx-auto text-[var(--text-muted)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Analisi in corso...</p>
            </div>
          )}

          {error && <ErrorBanner message={error} />}

          {rankings && rankings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-secondary)]">Nessuna offerta attiva trovata.</p>
            </div>
          )}

          {rankings && rankings.map((r, i) => {
            const pct = Math.round(r.score * 100)
            const color = pct >= 70 ? 'text-[#4ade80]' : pct >= 40 ? 'text-[#fbbf24]' : 'text-[#f87171]'
            const barColor = pct >= 70 ? 'bg-[#4ade80]' : pct >= 40 ? 'bg-[#fbbf24]' : 'bg-[#f87171]'
            return (
              <div key={r.job_offer.id} className="card !p-4 flex items-center gap-4 border-l-4 border-l-[var(--primary)]">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{r.job_offer.title}</p>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                    <Building2 size={11} /> {r.job_offer.company}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.matched_skills.slice(0, 4).map(s => (
                      <span key={s} className="badge-matched">{s}</span>
                    ))}
                    {r.gap_skills.length > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)]">+{r.gap_skills.length} mancanti</span>
                    )}
                  </div>
                </div>
                <div className={`text-2xl font-bold tabular-nums heading-font shrink-0 ${color}`}>{pct}%</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Candidate card
// ---------------------------------------------------------------------------

function CandidateListItem({ candidate, onDelete, onSendOffer, isShortlisted, onToggleShortlist, onFindOffers }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card flex flex-col gap-0 !p-0 mb-3 group overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center font-bold text-base shrink-0 select-none">
              {candidate.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{candidate.full_name}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{candidate.skills.length} competenze</p>
            </div>
          </div>

          {candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {candidate.skills.slice(0, 6).map(s => (
                <span key={s} className="badge-skill">{s}</span>
              ))}
              {candidate.skills.length > 6 && (
                <span className="badge-skill">+{candidate.skills.length - 6}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleShortlist(candidate.id)}
              className={`p-1.5 border rounded-md transition-all ${isShortlisted ? 'bg-[var(--primary-subtle)] border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'}`}
              title={isShortlisted ? 'Rimuovi dalla selezione' : 'Aggiungi alla selezione'}
            >
              <Heart size={14} fill={isShortlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onFindOffers(candidate)}
              className="btn-ghost !py-1.5 !px-2.5 text-xs gap-1.5"
              title="Trova offerte compatibili"
            >
              <TrendingUp size={13} /> Offerte
            </button>
            <button
              onClick={() => onSendOffer(candidate)}
              className="btn-primary !py-1.5 !px-3 text-xs gap-1.5"
            >
              <Mail size={13} /> Invia
            </button>
          </div>
          <button
            onClick={() => onDelete(candidate.id)}
            className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 font-semibold transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={10} /> Rimuovi
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-2 bg-[var(--bg-surface)] flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)] flex items-center gap-1.5 transition-colors"
        >
          {expanded ? 'Nascondi CV' : 'Mostra estratto CV'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      {expanded && (
        <div className="px-5 pb-5 pt-3 bg-[var(--bg-surface)]">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border)]">
            {candidate.cv_text}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job offer card
// ---------------------------------------------------------------------------

function JobOfferListItem({ offer, onDelete, onToggleActive }) {
  return (
    <div className={`card flex items-start justify-between gap-4 !p-5 mb-3 group border-l-4 ${offer.is_active !== false ? 'border-l-[var(--primary)]' : 'border-l-[var(--border)] opacity-55'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{offer.title}</p>
          {offer.is_active === false && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded shrink-0">
              Archiviata
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mb-3">
          <Building2 size={12} /> {offer.company}
        </p>
        <div className="flex flex-wrap gap-1">
          {offer.required_skills.slice(0, 5).map(s => (
            <span key={s} className="badge-skill">{s}</span>
          ))}
          {offer.required_skills.length > 5 && (
            <span className="badge-skill">+{offer.required_skills.length - 5}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 shrink-0 items-end">
        <button
          onClick={() => onToggleActive(offer.id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all ${offer.is_active !== false ? 'border-[var(--border)] text-[var(--text-secondary)] hover:border-amber-500/50 hover:text-amber-400' : 'border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20'}`}
        >
          {offer.is_active !== false ? <><Archive size={12} /> Archivia</> : <><CheckCircle2 size={12} /> Riattiva</>}
        </button>
        <button
          onClick={() => onDelete(offer.id)}
          className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 font-semibold transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={10} /> Elimina
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shortlist tab content
// ---------------------------------------------------------------------------

function ShortlistTab({ candidates, shortlist, onRemove, onSendOffer }) {
  const saved = candidates.filter(c => shortlist.includes(c.id))

  if (saved.length === 0) {
    return (
      <div className="card text-center !p-16 border-dashed opacity-60">
        <Star size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
        <p className="text-base font-semibold text-[var(--text-primary)]">Nessun candidato salvato</p>
        <p className="text-sm text-[var(--text-secondary)] mt-2">Usa il ♥ nelle schede candidato per creare la tua selezione.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-font text-3xl font-semibold mb-1">La Mia Selezione</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{saved.length}</span> candidati selezionati manualmente.
        </p>
      </div>
      <div>
        {saved.map(c => (
          <div key={c.id} className="card !p-4 mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center font-bold text-sm shrink-0">
                {c.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.full_name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.skills.slice(0, 4).map(s => <span key={s} className="badge-skill">{s}</span>)}
                  {c.skills.length > 4 && <span className="badge-skill">+{c.skills.length - 4}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => onSendOffer(c)} className="btn-primary !py-1.5 !px-3 text-xs gap-1.5">
                <Mail size={13} /> Invia Offerta
              </button>
              <button
                onClick={() => onRemove(c.id)}
                className="p-1.5 border border-[var(--border)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-400/40 rounded-md transition-all"
                title="Rimuovi dalla selezione"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Theme Toggle
// ---------------------------------------------------------------------------

function ThemeToggle({ isDark, toggleTheme }) {
  return (
    <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [candidates, setCandidates] = useState([])
  const [jobOffers, setJobOffers] = useState([])
  const [shortlist, setShortlist] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [errorCandidates, setErrorCandidates] = useState(null)
  const [errorOffers, setErrorOffers] = useState(null)

  const [isDark, setIsDark] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [sendOfferTarget, setSendOfferTarget] = useState(null)
  const [reverseMatchTarget, setReverseMatchTarget] = useState(null)

  const { toasts, addToast, removeToast } = useToast()

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    setErrorCandidates(null)
    try {
      setCandidates(await candidatesApi.list())
    } catch (err) {
      setErrorCandidates(err.message)
    } finally {
      setLoadingCandidates(false)
    }
  }, [])

  const fetchJobOffers = useCallback(async () => {
    setLoadingOffers(true)
    setErrorOffers(null)
    try {
      setJobOffers(await jobOffersApi.list())
    } catch (err) {
      setErrorOffers(err.message)
    } finally {
      setLoadingOffers(false)
    }
  }, [])

  const fetchShortlist = useCallback(async () => {
    try { setShortlist(await shortlistApi.get()) } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    fetchCandidates()
    fetchJobOffers()
    fetchShortlist()
  }, [fetchCandidates, fetchJobOffers, fetchShortlist])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCandidateCreated(c) {
    setCandidates(prev => [c, ...prev])
    setShowAddForm(false)
    addToast(`"${c.full_name}" aggiunto con successo.`, 'success')
  }

  async function handleDeleteCandidate(id) {
    try {
      await candidatesApi.delete(id)
      setCandidates(prev => prev.filter(c => c.id !== id))
      setShortlist(prev => prev.filter(s => s !== id))
      addToast('Candidato rimosso.', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  function handleJobOfferCreated(offer) {
    setJobOffers(prev => [offer, ...prev])
    addToast(`Offerta "${offer.title}" pubblicata.`, 'success')
  }

  async function handleDeleteJobOffer(id) {
    try {
      await jobOffersApi.delete(id)
      setJobOffers(prev => prev.filter(o => o.id !== id))
      addToast('Offerta eliminata.', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleToggleOfferActive(id) {
    try {
      const updated = await jobOffersApi.toggleActive(id)
      setJobOffers(prev => prev.map(o => o.id === id ? updated : o))
      addToast(updated.is_active ? 'Offerta riattivata.' : 'Offerta archiviata.', 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleToggleShortlist(id) {
    try {
      const result = await shortlistApi.toggle(id)
      if (result.saved) {
        setShortlist(prev => [...prev, id])
        addToast('Candidato aggiunto alla Selezione.', 'success')
      } else {
        setShortlist(prev => prev.filter(s => s !== id))
        addToast('Candidato rimosso dalla Selezione.', 'info')
      }
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleSeedDemo() {
    setSeedingDemo(true)
    try {
      const result = await demoApi.seed()
      await fetchCandidates()
      await fetchJobOffers()
      addToast(
        `Demo caricato: ${result.candidates_created} candidati, ${result.offers_created} offerte.`,
        'success'
      )
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSeedingDemo(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filteredCandidates = candidates.filter(c => {
    const q = searchQuery.toLowerCase()
    const catSkills = activeCategory ? SKILL_CATEGORIES[activeCategory] : null
    const matchSearch = !q || c.full_name.toLowerCase().includes(q) ||
      c.skills.some(s => s.toLowerCase().includes(q)) ||
      c.cv_text.toLowerCase().includes(q)
    const matchCat = !catSkills || c.skills.some(s =>
      catSkills.some(cat => s.toLowerCase().includes(cat))
    )
    return matchSearch && matchCat
  })

  const activeOffersCount = jobOffers.filter(o => o.is_active !== false).length
  const archivedCount = jobOffers.filter(o => o.is_active === false).length
  const displayedOffers = jobOffers.filter(o => showArchived ? true : o.is_active !== false)
  const shortlistCount = shortlist.length

  const headerTitle = TABS.find(t => t.id === activeTab)?.label || 'Dashboard'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-0 cursor-pointer select-none">
            <div className="w-9 h-9 bg-[var(--primary)] rounded-lg flex items-center justify-center text-[14px] font-bold text-white shrink-0 tracking-tighter">
              in
            </div>
            <div className="font-sans text-lg font-bold text-[var(--text-primary)] tracking-tight pl-2.5 flex items-center gap-1.5">
              Rebus
              <span className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest border border-[var(--border-hover)] bg-[var(--bg-surface)] rounded px-1.5 py-0.5">
                Agency
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-3 pb-2">
            Menu
          </div>
          {TABS.map(({ id, label, icon: Icon }) => {
            const count = id === 'candidates' ? candidates.length
              : id === 'job-offers' ? activeOffersCount
              : id === 'shortlist' ? shortlistCount
              : null
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`nav-btn ${activeTab === id ? 'active' : ''}`}
              >
                <div className="nav-icon"><Icon size={16} /></div>
                <span className="flex-1 text-left">{label}</span>
                {count !== null && count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums ${activeTab === id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Demo seed button */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleSeedDemo}
            disabled={seedingDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-xs font-semibold transition-all"
          >
            <Sparkles size={13} className={seedingDemo ? 'animate-spin' : ''} />
            {seedingDemo ? 'Caricamento...' : 'Carica dati demo'}
          </button>
          <p className="text-[10px] text-[var(--text-muted)] text-center mt-2">inRebus Agency v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="top-header">
          <h1 className="heading-font text-xl font-semibold">{headerTitle}</h1>
          <div className="flex items-center gap-4 border-l border-[var(--border)] pl-4">
            <ThemeToggle isDark={isDark} toggleTheme={() => setIsDark(p => !p)} />
          </div>
        </header>

        <main className="content-area">
          <div className="max-w-5xl mx-auto pb-12 space-y-8">

            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <RecruiterDashboard jobOffers={jobOffers} candidatesCount={candidates.length} />
            )}

            {/* Candidati */}
            {activeTab === 'candidates' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="heading-font text-3xl font-semibold mb-1">Candidati</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {candidates.length > 0 && <span className="font-semibold text-[var(--text-primary)]">{candidates.length} profili</span>} nel sistema.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={fetchCandidates} disabled={loadingCandidates} className="btn-ghost">
                      <RefreshCw size={14} className={loadingCandidates ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="btn-secondary gap-2">
                      {showAddForm ? <><X size={14} /> Chiudi</> : <><PlusCircle size={14} /> Nuovo</>}
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Cerca per nome o competenza..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="block w-full pl-11 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] text-sm transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Filter size={13} className="text-[var(--text-muted)] shrink-0" />
                  {Object.keys(SKILL_CATEGORIES).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${activeCategory === cat ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-hover)]'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  {activeCategory && (
                    <button onClick={() => setActiveCategory(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
                      <X size={11} /> Reset
                    </button>
                  )}
                </div>

                {showAddForm && <CandidateForm onCreated={handleCandidateCreated} />}
                <ErrorBanner message={errorCandidates} />

                {loadingCandidates && candidates.length === 0 ? (
                  <div className="card text-center !p-12">
                    <RefreshCw size={20} className="mx-auto text-[var(--text-muted)] animate-spin mb-3" />
                    <p className="text-sm text-[var(--text-secondary)]">Caricamento in corso...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="card text-center !p-16 border-dashed">
                    <Users size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Nessun candidato presente</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Usa "Nuovo" o "Carica dati demo" nella barra laterale.</p>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="card text-center !p-12 border-dashed">
                    <p className="text-sm text-[var(--text-secondary)]">Nessun risultato per <strong>"{searchQuery || activeCategory}"</strong>.</p>
                  </div>
                ) : (
                  <div>
                    {filteredCandidates.map(c => (
                      <CandidateListItem
                        key={c.id}
                        candidate={c}
                        onDelete={handleDeleteCandidate}
                        onSendOffer={setSendOfferTarget}
                        onFindOffers={setReverseMatchTarget}
                        isShortlisted={shortlist.includes(c.id)}
                        onToggleShortlist={handleToggleShortlist}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Offerte */}
            {activeTab === 'job-offers' && (
              <div className="space-y-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="heading-font text-3xl font-semibold mb-1">Gestione Offerte</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{activeOffersCount}</span> attive
                      {archivedCount > 0 && <> · <span className="text-[var(--text-muted)]">{archivedCount} archiviate</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={fetchJobOffers} disabled={loadingOffers} className="btn-ghost">
                      <RefreshCw size={14} className={loadingOffers ? 'animate-spin' : ''} />
                    </button>
                    {archivedCount > 0 && (
                      <button onClick={() => setShowArchived(!showArchived)} className={`btn-secondary text-xs gap-1.5 ${showArchived ? 'text-[var(--primary)] border-[var(--primary)]' : ''}`}>
                        <Archive size={13} />
                        {showArchived ? 'Nascondi archiviate' : 'Archiviate'}
                      </button>
                    )}
                  </div>
                </div>

                <JobOfferForm onCreated={handleJobOfferCreated} />
                <ErrorBanner message={errorOffers} />

                {loadingOffers && jobOffers.length === 0 ? (
                  <div className="card text-center !p-12">
                    <RefreshCw size={20} className="mx-auto animate-spin text-[var(--text-muted)] mb-3" />
                    <p className="text-sm text-[var(--text-secondary)]">Caricamento offerte...</p>
                  </div>
                ) : jobOffers.length === 0 ? (
                  <div className="card text-center !p-16 border-dashed">
                    <Briefcase size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Nessuna offerta attiva</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Pubblica un'offerta per avviare il matching.</p>
                  </div>
                ) : (
                  displayedOffers.map(offer => (
                    <JobOfferListItem
                      key={offer.id}
                      offer={offer}
                      onDelete={handleDeleteJobOffer}
                      onToggleActive={handleToggleOfferActive}
                    />
                  ))
                )}
              </div>
            )}

            {/* Selezione */}
            {activeTab === 'shortlist' && (
              <ShortlistTab
                candidates={candidates}
                shortlist={shortlist}
                onRemove={handleToggleShortlist}
                onSendOffer={setSendOfferTarget}
              />
            )}

          </div>
        </main>
      </div>

      {/* Modals */}
      {sendOfferTarget && (
        <SendOfferModal
          candidate={sendOfferTarget}
          jobOffers={jobOffers}
          onClose={() => setSendOfferTarget(null)}
          onSuccess={(msg) => addToast(msg, 'success')}
        />
      )}

      {reverseMatchTarget && (
        <ReverseMatchModal
          candidate={reverseMatchTarget}
          onClose={() => setReverseMatchTarget(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
