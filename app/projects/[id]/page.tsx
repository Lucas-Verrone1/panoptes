import { PortalPage } from '@/components/PortalPage'
import { ProjectDetailClient } from '@/components/ProjectDetailClient'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <PortalPage>
      <div className="page">
        <ProjectDetailClient projectId={id} />
      </div>
    </PortalPage>
  )
}
