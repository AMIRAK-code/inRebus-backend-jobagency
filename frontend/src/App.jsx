/**
 * inRebus Agency - Main Application Component.
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
} from 'lucide-react'

import RecruiterDashboard from './components/RecruiterDashboard.jsx'
import CandidateForm from './components/CandidateForm.jsx'
import JobOfferForm from './components/JobOfferForm.jsx'
import { candidatesApi, jobOffersApi } from './api.js'

// ---------------------------------------------------------------------------
// Navigation tabs definition
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'candidates', label: 'Candidati', icon: Users },
  { id: 'job-offers', label: 'Offerte', icon: Briefcase },
]

// ---------------------------------------------------------------------------
// Shared error banner
// ---------------------------------------------------------------------------

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 mb-6">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Candidate list item
// ---------------------------------------------------------------------------

function CandidateListItem({ candidate, onDelete }) {
  return (
    <div className="card flex items-start justify-between gap-4 !p-4 mb-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{candidate.full_name}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{candidate.cv_text}</p>
        {candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {candidate.skills.slice(0, 5).map((s) => (
              <span key={s} className="badge-skill">
                {s}
              </span>
            ))}
            {candidate.skills.length > 5 && (
              <span className="badge-skill">+{candidate.skills.length - 5}</span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(candidate.id)}
        className="shrink-0 p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Elimina candidato"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job offer list item
// ---------------------------------------------------------------------------

function JobOfferListItem({ offer, onDelete }) {
  return (
    <div className="card flex items-start justify-between gap-4 !p-4 mb-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{offer.title}</p>
        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
          <Building2 size={14} />
          {offer.company}
        </p>
        <div className="flex flex-wrap gap-1 mt-3">
          {offer.required_skills.slice(0, 5).map((s) => (
            <span key={s} className="badge-skill">
              {s}
            </span>
          ))}
          {offer.required_skills.length > 5 && (
            <span className="badge-skill">+{offer.required_skills.length - 5}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(offer.id)}
        className="shrink-0 p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
        title="Elimina offerta"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Theme Toggle Button
// ---------------------------------------------------------------------------
function ThemeToggle({ isDark, toggleTheme }) {
  return (
    <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [candidates, setCandidates] = useState([])
  const [jobOffers, setJobOffers] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [errorCandidates, setErrorCandidates] = useState(null)
  const [errorOffers, setErrorOffers] = useState(null)
  
  const [isDark, setIsDark] = useState(true)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

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

  useEffect(() => {
    fetchCandidates()
    fetchJobOffers()
  }, [fetchCandidates, fetchJobOffers])

  // ---------------------------------------------------------------------------
  // Mutation handlers
  // ---------------------------------------------------------------------------

  function handleCandidateCreated(candidate) {
    setCandidates((prev) => [candidate, ...prev])
  }

  async function handleDeleteCandidate(id) {
    try {
      await candidatesApi.delete(id)
      setCandidates((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setErrorCandidates(err.message)
    }
  }

  function handleJobOfferCreated(offer) {
    setJobOffers((prev) => [offer, ...prev])
  }

  async function handleDeleteJobOffer(id) {
    try {
      await jobOffersApi.delete(id)
      setJobOffers((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setErrorOffers(err.message)
    }
  }

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || 'Dashboard'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-0 cursor-pointer select-none">
            <div className="w-9 h-9 bg-[#f16421] rounded flex items-center justify-center text-[13px] font-bold text-white shrink-0 tracking-tighter">
              in
            </div>
            <div className="font-sans text-lg text-[var(--text-primary)] tracking-tight pl-1.5 flex items-center gap-1.5">
              Rebus <span className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest border border-[#f9731680] rounded-[3px] px-1 py-0.5 leading-snug">Agency</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] p-3 pb-2 pt-5">
            Menu Principale
          </div>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-btn ${activeTab === id ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <Icon size={15} />
              </div>
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="top-header">
          <h1 className="heading-font text-xl">{activeTabLabel}</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          </div>
        </header>

        <main className="content-area">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Dashboard tab */}
            {activeTab === 'dashboard' && (
              <RecruiterDashboard jobOffers={jobOffers} />
            )}

            {/* Candidates tab */}
            {activeTab === 'candidates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="heading-font text-2xl mb-2">Candidati</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Gestisci i profili dei candidati registrati nel sistema.
                    </p>
                  </div>
                  <button
                    onClick={fetchCandidates}
                    disabled={loadingCandidates}
                    className="btn-secondary"
                    aria-label="Aggiorna lista candidati"
                  >
                    <RefreshCw size={14} className={loadingCandidates ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Aggiorna</span>
                  </button>
                </div>

                <CandidateForm onCreated={handleCandidateCreated} />

                <ErrorBanner message={errorCandidates} />

                <div className="space-y-0 pt-4">
                  {loadingCandidates && candidates.length === 0 ? (
                    <div className="card text-center !p-12">
                      <RefreshCw size={24} className="mx-auto text-[var(--text-muted)] animate-spin mb-3" />
                      <p className="text-sm text-[var(--text-secondary)]">Caricamento candidati...</p>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="card text-center !p-12 border-dashed">
                      <Users size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                      <p className="text-sm text-[var(--text-secondary)]">
                        Nessun candidato registrato. Utilizza il modulo sopra per aggiungerne uno.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          {candidates.length} candidato{candidates.length !== 1 ? 'i' : ''} registrato{candidates.length !== 1 ? 'i' : ''}
                        </p>
                      </div>
                      {candidates.map((candidate) => (
                        <CandidateListItem
                          key={candidate.id}
                          candidate={candidate}
                          onDelete={handleDeleteCandidate}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Job offers tab */}
            {activeTab === 'job-offers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="heading-font text-2xl mb-2">Offerte di lavoro</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Pubblica e gestisci le offerte di lavoro.
                    </p>
                  </div>
                  <button
                    onClick={fetchJobOffers}
                    disabled={loadingOffers}
                    className="btn-secondary"
                    aria-label="Aggiorna lista offerte"
                  >
                    <RefreshCw size={14} className={loadingOffers ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Aggiorna</span>
                  </button>
                </div>

                <JobOfferForm onCreated={handleJobOfferCreated} />

                <ErrorBanner message={errorOffers} />

                <div className="space-y-0 pt-4">
                  {loadingOffers && jobOffers.length === 0 ? (
                    <div className="card text-center !p-12">
                      <RefreshCw size={24} className="mx-auto text-[var(--text-muted)] animate-spin mb-3" />
                      <p className="text-sm text-[var(--text-secondary)]">Caricamento offerte...</p>
                    </div>
                  ) : jobOffers.length === 0 ? (
                    <div className="card text-center !p-12 border-dashed">
                      <Briefcase size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                      <p className="text-sm text-[var(--text-secondary)]">
                        Nessuna offerta pubblicata. Utilizza il modulo sopra per pubblicarne una.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          {jobOffers.length} offerta{jobOffers.length !== 1 ? 'e' : ''} pubblicata{jobOffers.length !== 1 ? 'e' : ''}
                        </p>
                      </div>
                      {jobOffers.map((offer) => (
                        <JobOfferListItem
                          key={offer.id}
                          offer={offer}
                          onDelete={handleDeleteJobOffer}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  )
}
