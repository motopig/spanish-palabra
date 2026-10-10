import { useAtomValue } from 'jotai'

import { Gallery } from '@/pages/Gallery'
import { Result } from '@/pages/Result'
import { Typing } from '@/pages/Typing'
import { pageAtom } from '@/store/session'

export default function App() {
  const page = useAtomValue(pageAtom)

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      {page === 'gallery' && <Gallery />}
      {page === 'typing' && <Typing />}
      {page === 'result' && <Result />}
    </div>
  )
}
