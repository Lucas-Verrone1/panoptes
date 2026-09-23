import { PortalPage } from '@/components/PortalPage'
import { PageHeader } from '@/components/PageHeader'
import { DocumentsLibrary } from '@/components/DocumentsLibrary'
export default function DocumentsPage(){ return <PortalPage><div className="page"><PageHeader title="Documentações" description="Documentos gerados pela IA e conteúdos indexados disponíveis para consulta."/><DocumentsLibrary /></div></PortalPage> }
