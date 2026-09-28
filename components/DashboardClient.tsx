'use client'

import { AIChat } from './AIChat'
import styles from './DashboardClient.module.css'

export function DashboardClient() {
  return (
    <div className={`dashboard-minimal ${styles.home}`}>
      <div className="dashboard-center">
        <AIChat compact />
      </div>
    </div>
  )
}
