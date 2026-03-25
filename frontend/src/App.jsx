/**
 * inRebus Agency - Main Application Component.
 * Features: Toast notifications, count badges, skill category filters,
 *           Send Offer modal, offer archive/active toggle, search.
 */

import { useEffect, useState, useCallback, useLayoutEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Trash2,
  AlertCircle,
  Building2,
  RefreshCw,
  Sun,
  Moon,
  Search,
  PlusCircle,
  Mail,
  Heart,
  ChevronDown,
  ChevronUp,
  Archive,
  CheckCircle2,
  Filter,
  X,
} from 'lucide-react'

import RecruiterDashboard from './components/RecruiterDashboard.jsx'
import CandidateForm from './components/CandidateForm.jsx'
import JobOfferForm from './components/JobOfferForm.jsx'
import SendOfferModal from './components/SendOfferModal.jsx'
import { useToast, ToastContainer } from './components/Toast.jsx'
import { candidatesApi, jobOffersApi, shortlistApi } from './api.js'

// Skill taxonomy categories for filter chips
const SKILL_CATEGORIES = {
  'ICT': ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'sql', 'react', 'docker', 'kubernetes', 'git', 'machine learning', 'data analysis'],
  'Manifattura': ['tornitura cnc', 'fresatura cnc', 'saldatura', 'montaggio meccanico', 'assembaggio', 'metrologia', 'controllo qualita', 'stampaggio'],
  'Automazione': ['programmazione plc', 'siemens', 'scada', 'hmi', 'robotica industriale', 'industria 4.0', 'fanuc', 'cobot'],
  'Logistica': ['gestione magazzino', 'wms', 'erp', 'sap', 'lean manufacturing', 'kanban', 'supply chain'],
  'Costruzioni': ['autocad', 'revit', 'bim', 'impianti elettrici', 'sicurezza cantiere', 'd.lgs 81/08'],
  'Soft Skills': ['problem solving', 'team working', 'leadership', 'comunicazione'],
}

// ---------------------------------------------------------------------------
// Navigation tabs definition
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'candidates', label: 'Candidati', icon: Users },
  { id: 'job-offers', label: 'Offerte', icon: Briefcase },
]

// ---------------------------------------------------------------------------
// Error banner
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
// Candidate card for the Candidati tab
// ---------------------------------------------------------------------------

function CandidateListItem({ candidate, onDelete, onSendOffer, isShortlisted, onToggleShortlist }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card flex flex-col gap-0 !p-0 mb-4 group overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center font-bold text-base shrink-0 select-none">
              {candidate.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)] truncate">{candidate.full_name}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">ID {candidate.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {candidate.skills.slice(0, 7).map(s => (
                <span key={s} className="badge-skill">{s}</span>
              ))}
              {candidate.skills.length > 7 && (
                <span className="badge-skill">+{candidate.skills.length - 7}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleShortlist(candidate.id)}
              className={`p-2 border rounded-md transition-all duration-200 ${isShortlisted ? 'bg-[var(--primary-subtle)] border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'}`}
              title={isShortlisted ? 'Rimuovi dalla lista' : 'Salva nella tua lista'}
            >
              <Heart size={15} fill={isShortlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => onSendOffer(candidate)}
              className="px-3 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-md hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Mail size={13} /> Invia Offerta
            </button>
          </div>

          <button
            onClick={() => onDelete(candidate.id)}
            className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 font-semibold mt-1 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={11} /> Rimuovi
          </button>
        </div>
      </div>

      {/* CV toggle footer */}
      <div className="border-t border-[var(--border)] px-5 py-2.5 bg-[var(--bg-surface)] flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] flex items-center gap-1.5 transition-colors"
        >
          {expanded ? 'Nascondi CV' : 'Mostra estratto CV'}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {candidate.skills.length > 0 && (
          <span className="text-[10px] text-[var(--text-muted)]">{candidate.skills.length} competenze</span>
        )}
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
    <div className={`card flex items-start justify-between gap-4 !p-5 mb-3 group transition-all border-l-4 ${offer.is_active !== false ? 'border-l-[var(--primary)]' : 'border-l-[var(--border)] opacity-60'}`}>
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
          <Building2 size={13} /> {offer.company}
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
          title={offer.is_active !== false ? 'Archivia offerta' : 'Riattiva offerta'}
        >
          {offer.is_active !== false ? <><Archive size={13} /> Archivia</> : <><CheckCircle2 size={13} /> Riattiva</>}
        </button>
        <button
          onClick={() => onDelete(offer.id)}
          className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] hover:text-red-500 font-semibold transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={11} /> Elimina
        </button>
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
  const [errorCandidates, setErrorCandidates] = useState(null)
  const [errorOffers, setErrorOffers] = useState(null)

  const [isDark, setIsDark] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [sendOfferTarget, setSendOfferTarget] = useState(null) // candidate to send offer to

  const { toasts, addToast, removeToast } = useToast()

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    setErrorCandidates(null)
    try {
      const data = await candidatesApi.list()
      setCandidates(data)
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
      const data = await jobOffersApi.list()
      setJobOffers(data)
    } catch (err) {
      setErrorOffers(err.message)
    } finally {
      setLoadingOffers(false)
    }
  }, [])

  const fetchShortlist = useCallback(async () => {
    try {
      const data = await shortlistApi.get()
      setShortlist(data)
    } catch (err) {
      console.error('Failed to load shortlist', err)
    }
  }, [])

  useEffect(() => {
    fetchCandidates()
    fetchJobOffers()
    fetchShortlist()
  }, [fetchCandidates, fetchJobOffers, fetchShortlist])

  // ---------------------------------------------------------------------------
  // Mutation handlers
  // ---------------------------------------------------------------------------

  function handleCandidateCreated(candidate) {
    setCandidates(prev => [candidate, ...prev])
    setShowAddForm(false)
    addToast(`Candidato "${candidate.full_name}" registrato con successo.`, 'success')
  }

  async function handleDeleteCandidate(id) {
    const candidate = candidates.find(c => c.id === id)
    try {
      await candidatesApi.delete(id)
      setCandidates(prev => prev.filter(c => c.id !== id))
      addToast(`Candidato rimosso.`, 'info')
    } catch (err) {
      setErrorCandidates(err.message)
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
      setErrorOffers(err.message)
      addToast(err.message, 'error')
    }
  }

  async function handleToggleOfferActive(id) {
    try {
      const updated = await jobOffersApi.toggleActive(id)
      setJobOffers(prev => prev.map(o => o.id === id ? updated : o))
      addToast(updated.is_active ? `Offerta "${updated.title}" riattivata.` : `Offerta "${updated.title}" archiviata.`, 'info')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleToggleShortlist(id) {
    try {
      const result = await shortlistApi.toggle(id)
      if (result.saved) {
        setShortlist(prev => [...prev, id])
        addToast('Candidato salvato nella tua lista.', 'success')
      } else {
        setShortlist(prev => prev.filter(candId => candId !== id))
        addToast('Candidato rimosso dalla tua lista.', 'info')
      }
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // ---------------------------------------------------------------------------
  // Filtering logic
  // ---------------------------------------------------------------------------

  const filteredCandidates = candidates.filter(c => {
    const q = searchQuery.toLowerCase()
    const catSkills = activeCategory ? SKILL_CATEGORIES[activeCategory] : null

    const matchName = c.full_name.toLowerCase().includes(q)
    const matchSkill = c.skills.some(s => s.toLowerCase().includes(q)) || c.cv_text.toLowerCase().includes(q)

    const matchCat = !catSkills || c.skills.some(s =>
      catSkills.some(catS => s.toLowerCase().includes(catS))
    )

    const matchSearch = !q || matchName || matchSkill
    return matchSearch && matchCat
  })

  const activeCount = jobOffers.filter(o => o.is_active !== false).length
  const archivedCount = jobOffers.filter(o => o.is_active === false).length
  const displayedOffers = jobOffers.filter(o => showArchived ? true : o.is_active !== false)

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Dashboard'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-0 cursor-pointer select-none">
            <div className="w-10 h-10 bg-[var(--primary)] shadow-sm rounded-lg flex items-center justify-center text-[15px] font-bold text-white shrink-0 tracking-tighter">
              in
            </div>
            <div className="font-sans text-xl font-bold text-[var(--text-primary)] tracking-tight pl-2.5 flex items-center gap-1.5 leading-none">
              Rebus
              <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest border border-[var(--border-hover)] bg-[var(--bg-surface)] rounded-[4px] px-1.5 py-0.5 mt-[2px]">
                Agency
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-3 pb-2">
            Navigazione
          </div>
          {TABS.map(({ id, label, icon: Icon }) => {
            const count = id === 'candidates' ? candidates.length : id === 'job-offers' ? activeCount : null
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`nav-btn ${activeTab === id ? 'active' : ''}`}
              >
                <div className="nav-icon">
                  <Icon size={16} />
                </div>
                <span className="flex-1 text-left">{label}</span>
                {count !== null && count > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-sm tabular-nums ${activeTab === id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] text-center">inRebus Agency v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <header className="top-header">
          <h1 className="heading-font text-xl font-semibold">{activeTabLabel}</h1>
          <div className="flex items-center gap-4 border-l border-[var(--border)] pl-4">
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          </div>
        </header>

        <main className="content-area">
          <div className="max-w-5xl mx-auto pb-12 space-y-8">

            {/* ── Dashboard ─────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <RecruiterDashboard
                jobOffers={jobOffers}
                candidatesCount={candidates.length}
              />
            )}

            {/* ── Candidati ─────────────────────────────────────────── */}
            {activeTab === 'candidates' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="heading-font text-3xl font-semibold mb-1">Candidati</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Cerca e seleziona talenti dalla rete. {candidates.length > 0 && <span className="font-semibold text-[var(--text-primary)]">{candidates.length} profili</span>} disponibili.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={fetchCandidates} disabled={loadingCandidates} className="btn-ghost" title="Aggiorna">
                      <RefreshCw size={14} className={loadingCandidates ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="btn-secondary gap-2">
                      {showAddForm ? <><X size={15} /> Chiudi</> : <><PlusCircle size={15} /> Nuovo candidato</>}
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Cerca per nome o competenza..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Category filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter size={14} className="text-[var(--text-muted)] shrink-0" />
                  {Object.keys(SKILL_CATEGORIES).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${activeCategory === cat ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-hover)]'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  {activeCategory && (
                    <button onClick={() => setActiveCategory(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
                      <X size={12} /> Reset filtro
                    </button>
                  )}
                </div>

                {showAddForm && (
                  <div>
                    <CandidateForm onCreated={handleCandidateCreated} />
                  </div>
                )}

                <ErrorBanner message={errorCandidates} />

                {/* Candidate list */}
                <div>
                  {loadingCandidates && candidates.length === 0 ? (
                    <div className="card text-center !p-12">
                      <RefreshCw size={22} className="mx-auto text-[var(--text-muted)] animate-spin mb-3" />
                      <p className="text-sm text-[var(--text-secondary)]">Sincronizzazione in corso...</p>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="card text-center !p-16 border-dashed">
                      <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
                      <p className="text-base font-semibold text-[var(--text-primary)]">Nessun Candidato Presente</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">Usa "Nuovo candidato" per aggiungere risorse.</p>
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="card text-center !p-12 border-dashed">
                      <Search size={36} className="mx-auto text-[var(--text-muted)] mb-3 opacity-40" />
                      <p className="text-base font-semibold text-[var(--text-primary)]">Nessun risultato</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">Nessun profilo corrisponde a <strong>"{searchQuery || activeCategory}"</strong>.</p>
                    </div>
                  ) : (
                    <div>
                      {filteredCandidates.map(c => (
                        <CandidateListItem
                          key={c.id}
                          candidate={c}
                          onDelete={handleDeleteCandidate}
                          onSendOffer={setSendOfferTarget}
                          isShortlisted={shortlist.includes(c.id)}
                          onToggleShortlist={handleToggleShortlist}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Offerte ───────────────────────────────────────────── */}
            {activeTab === 'job-offers' && (
              <div className="space-y-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="heading-font text-3xl font-semibold mb-1">Gestione Offerte</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{activeCount}</span> attive
                      {archivedCount > 0 && <> · <span className="text-[var(--text-muted)]">{archivedCount} archiviate</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={fetchJobOffers} disabled={loadingOffers} className="btn-ghost">
                      <RefreshCw size={14} className={loadingOffers ? 'animate-spin' : ''} />
                    </button>
                    {archivedCount > 0 && (
                      <button onClick={() => setShowArchived(!showArchived)} className={`btn-secondary gap-2 text-xs ${showArchived ? 'text-[var(--primary)] border-[var(--primary)]' : ''}`}>
                        <Archive size={14} />
                        {showArchived ? 'Nascondi archiviate' : 'Mostra archiviate'}
                      </button>
                    )}
                  </div>
                </div>

                <JobOfferForm onCreated={handleJobOfferCreated} />

                <ErrorBanner message={errorOffers} />

                <div>
                  {loadingOffers && jobOffers.length === 0 ? (
                    <div className="card text-center !p-12">
                      <RefreshCw size={22} className="mx-auto text-[var(--text-muted)] animate-spin mb-3" />
                      <p className="text-sm text-[var(--text-secondary)]">Caricamento offerte...</p>
                    </div>
                  ) : jobOffers.length === 0 ? (
                    <div className="card text-center !p-16 border-dashed">
                      <Briefcase size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
                      <p className="text-base font-semibold text-[var(--text-primary)]">Nessuna Offerta Attiva</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">Pubblica un'offerta per iniziare il matching.</p>
                    </div>
                  ) : (
                    <div>
                      {displayedOffers.map(offer => (
                        <JobOfferListItem
                          key={offer.id}
                          offer={offer}
                          onDelete={handleDeleteJobOffer}
                          onToggleActive={handleToggleOfferActive}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Send Offer Modal */}
      {sendOfferTarget && (
        <SendOfferModal
          candidate={sendOfferTarget}
          jobOffers={jobOffers}
          onClose={() => setSendOfferTarget(null)}
          onSuccess={(msg) => addToast(msg, 'success')}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
