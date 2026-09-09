import { notFound } from 'next/navigation'
import { PortalPage } from '@/components/PortalPage'
import { ProjectDetailClient } from '@/components/ProjectDetailClient'
import { projects } from '@/lib/data'
export default async function ProjectPage({params}:{params:Promise<{id:string}>}){ const {id}=await params; const project=projects.find(p=>p.id===id); if(!project)notFound(); return <PortalPage><div className="page"><ProjectDetailClient project={project}/></div></PortalPage> }
