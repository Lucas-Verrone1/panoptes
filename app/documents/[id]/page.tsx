import { PortalPage } from '@/components/PortalPage'
import { DocumentDetailClient } from '@/components/DocumentDetailClient'
export default async function DocumentPage({ params }: { params: Promise<{id:string}> }){
  const { id } = await params
  return <PortalPage><div className="page document-page"><DocumentDetailClient id={id}/></div></PortalPage>
}
