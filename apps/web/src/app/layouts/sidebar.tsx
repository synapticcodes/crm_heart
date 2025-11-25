import { NavLink } from 'react-router-dom'
import { 
  Users, 
  Briefcase, 
  Search, 
  FileText, 
  Files, 
  Layers, 
  BarChart3, 
  X,
  Building2
} from 'lucide-react'
import clsx from 'clsx'

import { useAuth } from '@/features/auth/hooks/use-auth'
import { METRICS_ROLES } from '@/features/auth/constants'
import type { UserRole } from '@/features/auth/types'

import styles from './sidebar.module.css'

type NavigationItem = {
  path: string
  label: string
  icon: React.ElementType
  roles?: UserRole[]
}

const baseNavigationItems: NavigationItem[] = [
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/deals', label: 'Negócios', icon: Briefcase },
  { path: '/cpf', label: 'Consultar CPF', icon: Search },
]

const adminNavigationItems: NavigationItem[] = [
  { path: '/contracts/tracking', label: 'Contratos', icon: FileText, roles: ['admin'] },
  { path: '/contracts/templates', label: 'Templates', icon: Files, roles: ['admin'] },
  { path: '/services', label: 'Serviços', icon: Layers, roles: ['admin'] },
  { path: '/team', label: 'Equipe', icon: Building2, roles: ['admin'] },
  { path: '/metrics', label: 'Métricas', icon: BarChart3, roles: METRICS_ROLES },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { profile } = useAuth()
  const userRole = profile?.role

  const combinedItems = [...baseNavigationItems, ...adminNavigationItems]

  const filteredItems = combinedItems.filter((item) => {
    if (!item.roles) return true
    if (!userRole) return false
    return item.roles.includes(userRole)
  })

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={clsx(styles.backdrop, isOpen && styles.backdropVisible)} 
        onClick={onClose}
      />

      <aside className={clsx(styles.sidebar, isOpen && styles.sidebarOpen)}>
        <div className={styles.header}>
          <div className={styles.brandRow}>
            <img src="/logo.png" alt="CRM" className={styles.brandLogo} />
            <div className={styles.brandInfo}>
              <span className={styles.brand}>CRM Meu Nome Ok</span>
              <span className={styles.version}>v1.0.0</span>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {filteredItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    clsx(styles.navLink, isActive && styles.navLinkActive)
                  }
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onClose()
                    }
                  }}
                >
                  <Icon size={20} strokeWidth={2} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
