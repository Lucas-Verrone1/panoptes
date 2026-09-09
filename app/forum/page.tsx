import { Suspense } from 'react'
import { PortalPage } from '@/components/PortalPage'
import { ForumClient } from '@/components/ForumClient'
export default function ForumPage(){ return <PortalPage><div className="page"><Suspense fallback={<div className="app-loading">Carregando fórum…</div>}><ForumClient /></Suspense></div></PortalPage> }
