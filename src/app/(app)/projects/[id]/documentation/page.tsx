'use client'

import { useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Mic, MicOff, CheckCircle, Plus, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type Mode = 'choose' | 'capture' | 'note' | 'done'
type DocType = 'progress' | 'issue'

export default function DocumentationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choose')
  const [docType, setDocType] = useState<DocType>('progress')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPhotos((prev) => [...prev, ...files])
    files.forEach((f) => {
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoPreviews((p) => [...p, ev.target!.result as string])
      reader.readAsDataURL(f)
    })
    setMode('capture')
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunks.current = []
      mr.ondataavailable = (e) => audioChunks.current.push(e.data)
      mr.onstop = () => {
        setAudioBlob(new Blob(audioChunks.current, { type: 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      mediaRecorder.current = mr
      setRecording(true)
    } catch {
      setSaveError('לא ניתן לגשת למיקרופון')
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop()
    setRecording(false)
  }

  function reset() {
    setMode('choose')
    setPhotos([])
    setPhotoPreviews([])
    setNote('')
    setAudioBlob(null)
    setSaveError(null)
  }

  async function save(addIssue = false) {
    setSaving(true)
    setSaveError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get or create today's visit
      const today = new Date().toISOString().split('T')[0]
      let visitId: string

      const { data: existing } = await supabase
        .from('visits')
        .select('id')
        .eq('project_id', id)
        .eq('date', today)
        .single()

      if (existing) {
        visitId = existing.id
      } else {
        const { data: newVisit, error: visitError } = await supabase
          .from('visits')
          .insert({ project_id: id, date: today, created_by: user.id })
          .select('id')
          .single()
        if (visitError || !newVisit) throw new Error('יצירת הביקור נכשלה')
        visitId = newVisit.id
      }

      // Create observation
      const { data: obs, error: obsError } = await supabase
        .from('observations')
        .insert({ visit_id: visitId, project_id: id, type: docType, text: note || null, created_by: user.id })
        .select('id')
        .single()

      if (obsError || !obs) throw new Error('שמירת התיעוד נכשלה')

      // Upload photos
      for (const photo of photos) {
        const ext = photo.name.split('.').pop() ?? 'jpg'
        const path = `${id}/${visitId}/${obs.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('photos').upload(path, photo)
        if (!uploadError) {
          await supabase.from('observation_files').insert({ observation_id: obs.id, file_type: 'photo', storage_path: path })
        }
      }

      // Upload audio
      if (audioBlob) {
        const path = `${id}/${visitId}/${obs.id}/recording-${Date.now()}.webm`
        const { error: audioError } = await supabase.storage.from('audio').upload(path, audioBlob)
        if (!audioError) {
          await supabase.from('observation_files').insert({ observation_id: obs.id, file_type: 'audio', storage_path: path })
        }
      }

      // Create issue if requested
      if (addIssue) {
        await supabase.from('issues').insert({
          observation_id: obs.id,
          project_id: id,
          description: note || 'ממצא מהשטח',
        })
      }

      setMode('done')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'שגיאה בשמירת התיעוד')
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="bg-green-100 text-green-600 rounded-full p-4">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-xl font-bold">התיעוד נשמר</h2>
        <p className="text-gray-500 text-sm">הממצא נוסף לביקור היום</p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <Button onClick={reset}>
            <Plus size={16} className="me-1" />
            תעד עוד
          </Button>
          <Link href={`/projects/${id}`} className="inline-flex items-center justify-center w-full rounded-lg border border-gray-200 bg-white px-3 h-8 text-sm font-medium hover:bg-gray-50 transition-colors">
            חזרה לפרויקט
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-xl font-bold">תיעוד שטח</h1>
      </div>

      {mode === 'choose' && (
        <div className="space-y-3">
          <p className="text-gray-500 text-sm mb-4">בחר סוג תיעוד:</p>
          <button
            onClick={() => { setDocType('progress'); fileInput.current?.click() }}
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-5 text-right hover:border-blue-300 transition-colors flex items-center gap-4"
          >
            <div className="bg-blue-100 text-blue-600 rounded-lg p-2.5 flex-shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">תיעוד התקדמות</p>
              <p className="text-sm text-gray-400">מצב הביצוע, עבודות שבוצעו, מצב כללי</p>
            </div>
          </button>
          <button
            onClick={() => { setDocType('issue'); fileInput.current?.click() }}
            className="w-full bg-white border-2 border-gray-200 rounded-xl p-5 text-right hover:border-orange-300 transition-colors flex items-center gap-4"
          >
            <div className="bg-orange-100 text-orange-600 rounded-lg p-2.5 flex-shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">תיעוד ממצא</p>
              <p className="text-sm text-gray-400">בעיה, ליקוי, פריט לטיפול ומעקב</p>
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>
      )}

      {mode === 'capture' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {photoPreviews.map((src, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                <Image src={src} alt="" fill className="object-cover" />
              </div>
            ))}
            <button
              onClick={() => fileInput.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-300 transition-colors"
            >
              <Plus size={24} className="text-gray-400" />
            </button>
          </div>
          <input ref={fileInput} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoSelect} />
          <Button className="w-full" onClick={() => setMode('note')}>
            המשך להוספת הערה
          </Button>
          <button onClick={reset} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
            ביטול
          </button>
        </div>
      )}

      {mode === 'note' && (
        <div className="space-y-4">
          {photoPreviews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photoPreviews.map((src, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image src={src} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={docType === 'progress' ? 'תאר את מצב ההתקדמות...' : 'תאר את הממצא...'}
            rows={4}
          />
          <Button
            variant={recording ? 'destructive' : 'outline'}
            onClick={recording ? stopRecording : startRecording}
            className="w-full gap-2"
          >
            {recording ? <><MicOff size={16} /> עצור הקלטה</> : <><Mic size={16} /> הקלט הערה קולית</>}
          </Button>
          {audioBlob && <p className="text-xs text-green-600">✓ הקלטה נשמרה</p>}
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <div className="space-y-2 pt-2">
            {docType === 'issue' ? (
              <>
                <Button className="w-full" onClick={() => save(true)} disabled={saving}>
                  {saving ? 'שומר...' : 'שמור וצור ממצא במעקב'}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => save(false)} disabled={saving}>
                  שמור תיעוד בלבד
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={() => save(false)} disabled={saving}>
                {saving ? 'שומר...' : 'שמור תיעוד'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
