import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Sidebar } from '@/app/layouts/sidebar'
import { Topbar } from '@/app/layouts/topbar'
import { ActivityTracker } from '@/app/components/activity-tracker'

import styles from './app-layout.module.css'

export const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className={styles.layout}>
      <ActivityTracker />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={styles.content}>
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
