import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ShieldX } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 text-red-600 rounded-xl p-3">
            <ShieldX size={32} />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">אין גישה</h1>
        <p className="text-gray-500 text-sm mb-6">
          כתובת האימייל שלך אינה מאושרת למערכת.<br />
          פנה למנהל המערכת לקבלת גישה.
        </p>
        <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-center')}>
          חזרה להתחברות
        </Link>
      </div>
    </div>
  )
}
