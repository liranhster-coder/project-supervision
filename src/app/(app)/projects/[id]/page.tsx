import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRight, Camera, Clock, AlertTriangle, FileText } from 'lucide-react'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: visits } = await supabase
    .from('visits')
    .select('id, date, summary_note')
    .eq('project_id', id)
    .order('date', { ascending: false })
    .limit(5)

  const { data: issues } = await supabase
    .from('issues')
    .select('id, status')
    .eq('project_id', id)
    .in('status', ['open', 'in_progress', 'recheck'])

  const lastVisit = visits?.[0]
  const openIssues = issues?.length ?? 0

  const daysSince = lastVisit
    ? Math.floor((Date.now() - new Date(lastVisit.date).getTime()) / 86400000)
    : null

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/" className="text-gray-400 hover:text-gray-600">
          <ArrowRight size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
      </div>
      {project.address && <p className="text-sm text-gray-500 mb-5 pe-7">{project.address}</p>}

      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <Clock size={12} />
            ביקור אחרון
          </div>
          <p className="font-semibold text-gray-900 text-sm">
            {daysSince === null ? 'טרם בוצע' :
              daysSince === 0 ? 'היום' :
              daysSince === 1 ? 'אתמול' :
              `לפני ${daysSince} ימים`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
            <AlertTriangle size={12} />
            ממצאים פתוחים
          </div>
          <p className={`font-semibold text-sm ${openIssues > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {openIssues === 0 ? 'אין' : openIssues}
          </p>
        </div>
      </div>

      {/* Main action */}
      <Link href={`/projects/${id}/documentation`} className={cn(buttonVariants({ size: 'lg' }), 'w-full mb-6 text-base h-14 gap-2 justify-center')}>
        <Camera size={20} />
        תיעוד שטח
      </Link>

      {/* Recent visits */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 text-sm">ביקורים אחרונים</h2>
        </div>
        {!visits?.length ? (
          <p className="text-gray-400 text-sm">טרם בוצעו ביקורים בפרויקט זה</p>
        ) : (
          <div className="space-y-2">
            {visits.map((visit) => (
              <Link key={visit.id} href={`/projects/${id}/visits/${visit.id}`}>
                <div className="bg-white rounded-xl border border-gray-200 p-3 hover:border-blue-300 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {new Date(visit.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {visit.summary_note && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{visit.summary_note}</p>
                    )}
                  </div>
                  <FileText size={16} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
