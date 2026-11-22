import { AlertCircle, Eye, EyeOff, Fingerprint, Loader2, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ANGLE_LABELS, ID_CARD_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import { useSessionResults } from '@/hooks/useSessionResults'
import type { UUID } from '@/types'

/**
 * "Ảnh CCCD người thuê": sensitive personal data, so the check-in session (which holds the ID card photos) is only
 * fetched after the staff clicks "Hiện ảnh CCCD".
 */
export function IdCardPhotosCard({ checkInSessionId }: { checkInSessionId: UUID | null }) {
  const [isShown, setIsShown] = useState(false)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Fingerprint className="h-5 w-5" />
        </span>
        <h2 className="flex-1 font-semibold text-foreground">Ảnh CCCD người thuê</h2>
        {checkInSessionId && (
          <Button variant="secondary" size="sm" onClick={() => setIsShown((shown) => !shown)}>
            {isShown ? <EyeOff /> : <Eye />}
            {isShown ? 'Ẩn ảnh CCCD' : 'Hiện ảnh CCCD'}
          </Button>
        )}
      </div>
      <div className="p-5">
        {!checkInSessionId ? (
          <p className="text-sm text-muted-foreground">Lượt thuê này không có phiên check-in nên không có ảnh CCCD.</p>
        ) : isShown ? (
          <IdCardPhotos checkInSessionId={checkInSessionId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Ảnh CCCD là dữ liệu cá nhân nhạy cảm, chỉ hiện khi bấm “Hiện ảnh CCCD”.
          </p>
        )}
      </div>
    </Card>
  )
}

function IdCardPhotos({ checkInSessionId }: { checkInSessionId: UUID }) {
  const { data, isLoading, error, refetch } = useSessionResults(checkInSessionId)

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải ảnh CCCD…
      </p>
    )
  }
  if (!data) {
    return (
      <div className="flex items-center gap-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1">{error ?? 'Không tải được ảnh CCCD.'}</span>
        <Button variant="secondary" size="sm" onClick={refetch}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const photos = ID_CARD_PHOTO_KEYS.map((code) => ({
    code,
    url: data.images.find((image) => image.angleCode === code)?.imageUrl ?? null,
  }))

  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map(({ code, url }) => (
        <figure key={code} className="space-y-1.5">
          <div className="aspect-[1.586] overflow-hidden rounded-lg border bg-slate-100">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" title="Mở ảnh gốc">
                <img src={url} alt={ANGLE_LABELS[code]} className="h-full w-full object-cover" />
              </a>
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Không có ảnh</span>
            )}
          </div>
          <figcaption className="text-xs text-muted-foreground">{ANGLE_LABELS[code]}</figcaption>
        </figure>
      ))}
    </div>
  )
}
