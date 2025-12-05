import { Menu, LogOut } from 'lucide-react'

import { useAuth } from '@/features/auth/hooks/use-auth'

import styles from './topbar.module.css'

interface TopbarProps {
  onMenuClick: () => void
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, profile, signOut, isAuthenticating } = useAuth()

  const handleSignOut = async () => {
    const result = await signOut()

    if (!result.ok && result.message) {
      console.error(result.message)
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? '?'
  const userDisplayName = profile?.user_name?.trim() || user?.email || 'Usuário'
  const userRole = profile?.role ?? 'Visitante'

  return (
    <header className={styles.topbar}>
      <div className={styles.leftSection}>
        <button 
          className={styles.menuButton} 
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>

        <div className={styles.heading}>
          <h1 className={styles.headingTitle}>
            Olá, {userDisplayName.split(' ')[0]}
          </h1>
          <span className={styles.headingSubtitle}>
            Bem-vindo de volta ao CRM Meu Nome Ok
          </span>
        </div>
      </div>

      <div className={styles.userSection}>
        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {userInitial}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userDisplayName}</span>
            <span className={styles.userRole}>{userRole}</span>
          </div>
        </div>

        <div className={styles.separator} />

        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleSignOut}
          disabled={isAuthenticating}
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
