'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, TrendingUp, Camera, Mic, ChevronDown, ChevronUp } from 'lucide-react'

type ObsFile = {
  id: string
  file_type: 'photo' | 'audio'
  signedUrl: string | null
  mimeType: string | null
}

type Observation = {
  id: string
  type: 'progress' | 'issue'
  text: string | null
  created_at: string
  files: ObsFile[]
}

export default function ObservationCard({ obs }: { obs: Observation }) {
  const [expanded, setExpanded] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const photos = obs.files.filter(f => f.file_type === 'photo')
  const audios = obs.files.filter(f => f.file_type === 'audio')
  const hasMedia = photos.length > 0 || audios.length > 0
  const hasLongText = (obs.text?.length ?? 0) > 80

  // Always expandable if has media or long text
  const isExpandable = hasMedia || hasLongText

  return (
    <>
      <div className={`bg-white border rounded-xl overflow-hidden transition-colors ${expanded ? 'border-blue-200 shadow-sm' : 'border-gray-200'}`}>
        <button
          className="w-full text-right p-4"
          onClick={() => isExpandable && setExpanded(e => !e)}
          style={{ cursor: isExpandable ? 'pointer' : 'default' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Type badge + time */}
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

              {/* Text */}
              {obs.text ? (
                <p className={`text-sm text-gray-700 text-right ${!expanded && hasLongText ? 'line-clamp-2' : ''}`}>
                  {obs.text}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">ללא הערה טקסטואלית</p>
              )}

              {/* Media summary */}
              {hasMedia && (
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {photos.length > 0 && (
                    <span className="flex items-center gap-1 text-blue-500 font-medium">
                      <Camera size={12} /> {photos.length} תמונות — לחץ לפתיחה
                    </span>
                  )}
                  {audios.length > 0 && (
                    <span className="flex items-center gap-1 text-blue-500 font-medium">
                      <Mic size={12} /> הקלטה — לחץ לניגון
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Chevron */}
            {isExpandable && (
              <div className="text-gray-400 flex-shrink-0 mt-0.5">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            )}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
            {/* Photos */}
            {photos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">תמונות ({photos.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => photo.signedUrl && setLightbox(photo.signedUrl)}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-200 relative hover:opacity-90 transition-opacity"
                    >
                      {photo.signedUrl ? (
                        <Image
                          src={photo.signedUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 150px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Camera size={20} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Audio */}
            {audios.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">הקלטות</p>
                <div className="space-y-2">
                  {audios.map((audio) => (
                    <div key={audio.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      {audio.signedUrl ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <audio controls className="w-full" style={{ direction: 'ltr' }}>
                          <source src={audio.signedUrl} type={audio.mimeType ?? 'audio/webm'} />
                        </audio>
                      ) : (
                        <p className="text-xs text-gray-400">הקלטה לא זמינה</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If no media but long text, just show full text */}
            {!hasMedia && hasLongText && obs.text && (
              <p className="text-sm text-gray-700">{obs.text}</p>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-full max-h-full">
            <Image
              src={lightbox}
              alt=""
              width={1200}
              height={900}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-2 right-2 text-white bg-black/60 rounded-full w-9 h-9 flex items-center justify-center text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
