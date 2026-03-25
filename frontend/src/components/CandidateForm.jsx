/**
 * CandidateForm component.
 */

import { useState, useRef } from 'react'
import { UserPlus, X, UploadCloud, FileText, CheckCircle2 } from 'lucide-react'
import { candidatesApi } from '../api.js'

export default function CandidateForm({ onCreated }) {
  const [form, setForm] = useState({ full_name: '', cv_text: '', skills: '' })
  const [loading, setLoading] = useState(false)
  const [extractingPdf, setExtractingPdf] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Handle PDF Upload and Extraction
  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setExtractingPdf(true)
    setError(null)
    
    // Auto-fill name if empty
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
    if (!form.full_name) {
      setForm(prev => ({ ...prev, full_name: nameWithoutExt }))
    }

    try {
      const reader = new FileReader()
      reader.onload = async function(event) {
        try {
          const typedarray = new Uint8Array(event.target.result)
          const pdf = await window.pdfjsLib.getDocument(typedarray).promise
          let maxPages = pdf.numPages
          let extractedText = ""

          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map(item => item.str).join(" ")
            extractedText += pageText + "\n\n"
          }

          setForm(prev => ({ ...prev, cv_text: extractedText.trim() }))
        } catch (err) {
          setError("Errore nella lettura del PDF. Assicurati che sia un documento testuale valido.")
          console.error(err)
        } finally {
          setExtractingPdf(false)
          // Reset input so mesma file can be selected again
          if (fileInputRef.current) fileInputRef.current.value = ""
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (err) {
      setError("Errore durante l'apertura del file.")
      setExtractingPdf(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const skills = form.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const candidate = await candidatesApi.create({
        full_name: form.full_name.trim(),
        cv_text: form.cv_text.trim(),
        skills,
      })
      setForm({ full_name: '', cv_text: '', skills: '' })
      onCreated(candidate)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card !p-5 space-y-5">
      <h3 className="heading-font text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <UserPlus size={18} className="text-[var(--primary)]" />
        Registra candidato
      </h3>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
          <X size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="full_name" className="form-label">Nome e cognome</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            minLength={2}
            className="form-input"
            placeholder="Es. Mario Rossi"
            value={form.full_name}
            onChange={handleChange}
          />
        </div>

        {/* PDF Uploader */}
        <div>
          <label className="form-label">Caricamento Rapido PDF (Opzionale)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors ${form.cv_text ? 'border-[var(--primary)] bg-[var(--primary-subtle)]' : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--bg-surface)]'}`}
          >
            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${form.cv_text ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
              {extractingPdf ? <UploadCloud size={20} className="animate-bounce" /> : form.cv_text ? <CheckCircle2 size={20} /> : <FileText size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${form.cv_text ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                {extractingPdf ? 'Estrazione testo in corso...' : form.cv_text ? 'CV Estratto con successo' : 'Carica un CV in PDF'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Estrai il testo automaticamente</p>
            </div>
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handlePdfUpload}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="cv_text" className="form-label">
          Testo curriculum vitae (modificabile)
        </label>
        <textarea
          id="cv_text"
          name="cv_text"
          required
          minLength={10}
          rows={5}
          className="form-input resize-y py-3 text-sm"
          placeholder="Incollare qui il testo completo del CV del candidato, oppure caricarlo usando il tasto PDF qui sopra..."
          value={form.cv_text}
          onChange={handleChange}
        />
      </div>

      <div>
        <label htmlFor="skills" className="form-label">
          Competenze Iniziali (Opzionale) <span className="font-normal text-[var(--text-muted)] lowercase tracking-normal">(L'AI estrapolerà le restanti in automatico)</span>
        </label>
        <input
          id="skills"
          name="skills"
          type="text"
          className="form-input"
          placeholder="Es. python, sql... (Lascia vuoto per far fare all'AI)"
          value={form.skills}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          <UserPlus size={15} />
          {loading ? 'Registrazione...' : 'Registra'}
        </button>
      </div>
    </form>
  )
}
