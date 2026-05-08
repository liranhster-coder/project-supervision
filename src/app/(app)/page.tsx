import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, Clock } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  completed: 'הושלם',
  on_hold: 'מושהה',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, address, status, created_at,
      visits(date, created_at)
    `)
    .order('created_at', { ascending: false })

  const projectsWithLastVisit = (projects ?? []).map((p) => {
    const visits = (p.visits as { date: string }[]) ?? []
    const lastVisit = visits.sort((a, b) => b.date.localeCompare(a.date))[0]
    return { ...p, lastVisitDate: lastVisit?.date ?? null }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">פרויקטים</h1>
        <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }), 'gap-1')}>
          <Plus size={16} />
          פרויקט חדש
        </Link>
      </div>

      {projectsWithLastVisit.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">אין פרויקטים עדיין</p>
          <p className="text-sm">לחץ על &quot;פרויקט חדש&quot; כדי להתחיל</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projectsWithLastVisit.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-semibold text-gray-900 leading-tight">{project.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[project.status]}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>
                {project.address && (
                  <p className="text-sm text-gray-500 mb-3">{project.address}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {project.lastVisitDate
                    ? <span>ביקור אחרון: {daysSince(project.lastVisitDate)}</span>
                    : <span>טרם בוצע ביקור</span>
                  }
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
