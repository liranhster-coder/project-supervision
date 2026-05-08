import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText, Camera, Mic, AlertTriangle, TrendingUp } from 'lucide-react'
import GenerateReportButton from './generate-report-button'

export default async function VisitPage({ params }: { params: Promise<{ id: string; visitId: string }> }) {
  const { id, visitId } = await params
  const supabase = await createClient()

  const { data: visit } = await supabase
    .from('visits')
    .select(`
      *,
      observations(
        id, type, text, created_at,
        observation_files(id, file_type, storage_path)
      ),
      reports(id, storage_path, created_at)
    `)
    .eq('id', visitId)
    .single()

  if (!visit) notFound()

  const { data: project } = await supabase.from('projects').select('name').eq('id', id).single()

  const observations = (visit.observations as any[]) ?? []
  const reports = (visit.reports as any[]) ?? []

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-xl font-bold">
          {new Date(visit.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h1>
      </div>
      <p className="text-sm text-gray-400 mb-5 pe-7">{project?.name}</p>

      {visit.summary_note && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-sm text-gray-700">
          {visit.summary_note}
        </div>
      )}

      {/* Report section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gray-400" />
            <span className="font-medium text-sm">דוח ביקור</span>
          </div>
          <GenerateReportButton visitId={visitId} projectId={id} existingReports={reports} />
        </div>
      </div>

      {/* Observations */}
      <h2 className="font-semibold text-sm text-gray-500 mb-3">ממצאים ותיעוד ({observations.length})</h2>
      {observations.length === 0 ? (
        <p className="text-gray-400 text-sm">אין תיעוד לביקור זה</p>
      ) : (
        <div className="space-y-3">
          {observations.map((obs: any) => {
            const photos = obs.observation_files?.filter((f: any) => f.file_type === 'photo') ?? []
            const audios = obs.observation_files?.filter((f: any) => f.file_type === 'audio') ?? []
            return (
              <div key={obs.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {obs.type === 'issue' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={11} /> ממצא
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <TrendingUp size={11} /> התקדמות
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(obs.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {obs.text && <p className="text-sm text-gray-700 mb-2">{obs.text}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {photos.length > 0 && <span className="flex items-center gap-1"><Camera size={12} /> {photos.length} תמונות</span>}
                  {audios.length > 0 && <span className="flex items-center gap-1"><Mic size={12} /> הקלטה</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
