'use client'

import { Icon, type IconName } from './Icon'

export function GamificationEmblem({ tier = 3, icon = 'award', label, locked = false }: { tier?: number; icon?: IconName; label: string; locked?: boolean }) {
  return (
    <span className={`rank-emblem tier-${tier} ${locked ? 'locked' : ''}`} aria-label={locked ? `${label}, bloqueado` : label}>
      <span className="rank-wing left" aria-hidden="true" />
      <span className="rank-core" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <span className="rank-wing right" aria-hidden="true" />
      <span className="rank-bar" aria-hidden="true" />
    </span>
  )
}
