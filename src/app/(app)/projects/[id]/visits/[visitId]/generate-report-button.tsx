'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'

export default function GenerateReportButton({
  visitId,
  projectId,
  existingReports,
}: {
  visitId: string
  projectId: string
  existingReports: { id: string; storage_path: string; created_at: string }[]
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, projectId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'שגיאה ביצירת הדוח')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `דוח-ביקור-${new Date().toISOString().split('T')[0]}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('שגיאה ביצירת הדוח')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="gap-1.5">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
        {existingReports.length > 0 ? 'הורד דוח' : 'צור דוח Word'}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
