import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import GenerateReportButton from './generate-report-button'
import ObservationCard from './observation-card'

export default async function VisitPage({ params }: { params: Promise<{ id: string; visitId: string }> }) {
  const { id, visitId } = await params
  const supabase = await createClient()

  const { data: visit, error: visitError } = await supabase
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

  if (visitError || !visit) notFound()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single()

  const rawObservations = (visit.observations as any[]) ?? []
  const reports = (visit.reports as any[]) ?? []

  // Generate signed URLs for all files
  const observations = await Promise.all(
    rawObservations.map(async (obs: any) => {
      const rawFiles = (obs.observation_files ?? []) as any[]
      const files = await Promise.all(
        rawFiles.map(async (file: any) => {
          const bucket = file.file_type === 'photo' ? 'photos' : 'audio'
          const { data } = await supabase.storage
            .from(bucket)
            .createSignedUrl(file.storage_path, 3600)
          return {
            id: file.id,
            file_type: file.file_type as 'photo' | 'audio',
            signedUrl: data?.signedUrl ?? null,
          }
        })
      )
      return {
        id: obs.id,
        type: obs.type as 'progress' | 'issue',
        text: obs.text as string | null,
        created_at: obs.created_at as string,
        files,
      }
    })
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-xl font-bold">
          {new Date(visit.date).toLocaleDateString('he-IL', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </h1>
      </div>
      <p className="text-sm text-gray-400 mb-5 pe-7">{project?.name}</p>

      {visit.summary_note && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-sm text-gray-700">
          {visit.summary_note}
        </div>
      )}

      {/* Report */}
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
      <h2 className="font-semibold text-sm text-gray-500 mb-3">
        ממצאים ותיעוד ({observations.length})
      </h2>
      {observations.length === 0 ? (
        <p className="text-gray-400 text-sm">אין תיעוד לביקור זה</p>
      ) : (
        <div className="space-y-3">
          {observations.map((obs) => (
            <ObservationCard key={obs.id} obs={obs} />
          ))}
        </div>
      )}
    </div>
  )
}
