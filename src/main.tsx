import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import './global.css'
import Root from './Root.tsx'
import { startPwa } from './pwa'
import { startSync } from './sync'

dayjs.locale('ko')
void startSync()
startPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
