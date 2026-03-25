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
  Search,
  PlusCircle,
  Mail,
  Heart,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

import RecruiterDashboard from './components/RecruiterDashboard.jsx'
import CandidateForm from './components/CandidateForm.jsx'
import JobOfferForm from './components/JobOfferForm.jsx'
import { candidatesApi, jobOffersApi } from './api.js'

// ---------------------------------------------------------------------------
// Navigation tabs definition
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'dashboard', label: 'Dashboard Matching', icon: LayoutDashboard },
  { id: 'candidates', label: 'Candidati', icon: Users },
  { id: 'job-offers', label: 'Gestione Offerte', icon: Briefcase },
]

// ---------------------------------------------------------------------------
// Shared error banner
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
// Candidate list item (Redesigned for Database view)
// ---------------------------------------------------------------------------

function CandidateListItem({ candidate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="card flex flex-col gap-4 !p-5 mb-4 group">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center font-bold text-lg shrink-0">
              {candidate.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)] truncate">{candidate.full_name}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">ID: {candidate.id.substring(0,8).toUpperCase()}</p>
            </div>
          </div>
          
          {candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {candidate.skills.slice(0, 6).map((s) => (
                <span key={s} className="badge-skill">
                  {s}
                </span>
              ))}
              {candidate.skills.length > 6 && (
                <span className="badge-skill">+{candidate.skills.length - 6}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSaved(!saved)}
              className={`p-2 border rounded-md transition-colors ${saved ? 'bg-[var(--primary-subtle)] border-[var(--primary)] text-[var(--primary)]' : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}
              title="Salva nella tua lista"
            >
              <Heart size={16} fill={saved ? "currentColor" : "none"} />
            </button>
            <button
              className="px-3 py-2 bg-[var(--primary)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-1.5 shadow-sm"
              title="Invia Offerta al candidato"
            >
              <Mail size={14} /> Invia Offerta
            </button>
          </div>
          
          <button
            onClick={() => onDelete(candidate.id)}
            className="text-[10px] uppercase text-[var(--text-muted)] hover:text-red-500 font-semibold tracking-wider mt-1 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
            title="Rimuovi dal database"
          >
             Rimuovi <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 mt-1">
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors"
        >
          {expanded ? 'Nascondi CV' : 'Mostra Estratto CV'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {expanded && (
          <div className="mt-3 p-4 bg-[var(--bg-elevated)] rounded-md border border-[var(--border)]">
             <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{candidate.cv_text}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Job offer list item
// ---------------------------------------------------------------------------

function JobOfferListItem({ offer, onDelete }) {
  return (
    <div className="card flex items-start justify-between gap-4 !p-4 mb-3 group border-l-4 border-l-[var(--primary)]">
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
        className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all font-semibold uppercase text-[10px] tracking-wider flex flex-col items-center gap-1"
        title="Elimina offerta"
      >
        <Trash2 size={14} /> Rimuovi
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
  
  // Theme state
  const [isDark, setIsDark] = useState(true)

  // Search and UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

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
    setShowAddForm(false)
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

  // Filter candidates based on search
  const filteredCandidates = candidates.filter(c => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    const matchName = c.full_name.toLowerCase().includes(q)
    const matchSkills = c.skills.some(s => s.toLowerCase().includes(q))
    return matchName || matchSkills
  })

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
            <div className="font-sans text-xl font-bold text-[var(--text-primary)] tracking-tight pl-2.5 flex items-center justify-center gap-1.5 leading-none">
              Rebus <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest border border-[var(--border-hover)] bg-[var(--bg-surface)] rounded-[4px] px-1.5 py-0.5 leading-snug mt-[2px]">Agency</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-1 mt-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] p-3 pb-2">
            Menu Principale
          </div>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-btn ${activeTab === id ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <Icon size={16} />
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
          <div className="flex items-center gap-5 border-l border-[var(--border)] pl-5">
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border)] overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        <main className="content-area">
          <div className="max-w-5xl mx-auto space-y-8 pb-12">
            
            {/* Dashboard tab */}
            {activeTab === 'dashboard' && (
              <RecruiterDashboard jobOffers={jobOffers} />
            )}

            {/* Database Candidati tab */}
            {activeTab === 'candidates' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="heading-font text-3xl font-semibold mb-2">Ricerca Candidati</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Cerca, visualizza le skill e seleziona i talenti dalla rete.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={fetchCandidates}
                      disabled={loadingCandidates}
                      className="btn-ghost"
                      title="Sincronizza Dati"
                    >
                      <RefreshCw size={14} className={loadingCandidates ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="btn-secondary"
                    >
                      {showAddForm ? <ChevronUp size={16} /> : <PlusCircle size={16} />}
                      {showAddForm ? 'Chiudi Modulo' : 'Nuovo Candidato'}
                    </button>
                  </div>
                </div>

                {/* Add standard search bar for candidates */}
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Cerca per nome, competenza (es. React, Python)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
                      {filteredCandidates.length} risultati
                    </div>
                  )}
                </div>

                {/* Add a collapsible candidate form */}
                {showAddForm && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                     <CandidateForm onCreated={handleCandidateCreated} />
                  </div>
                )}

                <ErrorBanner message={errorCandidates} />

                <div className="pt-2">
                  {loadingCandidates && candidates.length === 0 ? (
                    <div className="card text-center !p-12">
                      <RefreshCw size={24} className="mx-auto text-[var(--text-muted)] animate-spin mb-3" />
                      <p className="text-sm text-[var(--text-secondary)]">Sincronizzazione in corso...</p>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="card text-center !p-16 border-dashed">
                      <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        Nessun Candidato Presente
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">
                        La rete è vuota. Usa "Nuovo Candidato" per aggiungere risorse.
                      </p>
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="card text-center !p-16 border-dashed">
                      <Search size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        Nessun risultato trovato
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Nessun candidato corrisponde alla ricerca: <span className="font-semibold">"{searchQuery}"</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredCandidates.map((candidate) => (
                        <CandidateListItem
                          key={candidate.id}
                          candidate={candidate}
                          onDelete={handleDeleteCandidate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Job offers tab */}
            {activeTab === 'job-offers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="heading-font text-3xl font-semibold mb-2">Gestione Offerte</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Pubblica offerte di lavoro e specificane i requisiti tecnici.
                    </p>
                  </div>
                  <button
                    onClick={fetchJobOffers}
                    disabled={loadingOffers}
                    className="btn-ghost"
                    title="Aggiorna lista offerte"
                  >
                    <RefreshCw size={14} className={loadingOffers ? 'animate-spin' : ''} />
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
                    <div className="card text-center !p-16 border-dashed">
                      <Briefcase size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        Nessuna Offerta Attiva
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Pubblica un'offerta per iniziare a matchare i candidati.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobOffers.map((offer) => (
                        <JobOfferListItem
                          key={offer.id}
                          offer={offer}
                          onDelete={handleDeleteJobOffer}
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
    </div>
  )
}
