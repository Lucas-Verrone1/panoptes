import { Suspense } from 'react'
import { PortalPage } from '@/components/PortalPage'
import { AIChat } from '@/components/AIChat'
export default function AIPage(){ return <PortalPage><Suspense fallback={<div className="app-loading">Carregando assistente…</div>}><AIChat /></Suspense></PortalPage> }
