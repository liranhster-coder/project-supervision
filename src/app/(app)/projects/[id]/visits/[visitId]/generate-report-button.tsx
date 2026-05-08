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

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, projectId }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `דוח-ביקור-${new Date().toISOString().split('T')[0]}.docx`
      a.click()
      URL.revokeObjectURL(url)
    }
    setLoading(false)
  }

  return (
    <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      {existingReports.length > 0 ? 'הורד דוח' : 'צור דוח Word'}
    </Button>
  )
}
