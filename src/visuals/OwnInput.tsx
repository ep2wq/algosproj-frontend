import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { shakeElement } from '../lib/normalize'
import { buttonClass } from './PlaybackControls'

// "Try your own": a visualization's own-input form, closed behind one button until asked for, so the
// drawing and its transport are the only choices at first. A native disclosure (no state; find in
// page opens it). When a submit leaves a field invalid (aria-invalid), that field shakes once.
export default function OwnInput({ children }: { children: ReactNode }) {
  const { t } = useTranslation('visuals')
  return (
    <details
      className="group min-w-0 flex-1 basis-56"
      onSubmit={(event) => {
        const form = event.target as HTMLElement
        // After the form's own handler has drawn the error.
        requestAnimationFrame(() => shakeElement(form.querySelector<HTMLElement>('[aria-invalid="true"]')))
      }}
    >
      <summary className={`${buttonClass} w-fit cursor-pointer list-none gap-1.5 [&::-webkit-details-marker]:hidden`}>
        {t('common.tryYourOwn')}
        <ChevronDown aria-hidden="true" className="size-4 text-muted group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-(--dur-ui) motion-safe:ease-out" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}
