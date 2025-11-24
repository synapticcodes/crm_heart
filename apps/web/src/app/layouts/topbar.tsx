import { useAuth } from '@/features/auth/hooks/use-auth'

import styles from './topbar.module.css'

export const Topbar = () => {
  const { user, profile, signOut, isAuthenticating } = useAuth()

  const handleSignOut = async () => {
    const result = await signOut()

    if (!result.ok && result.message) {
      console.error(result.message)
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase() ?? '?'
  const userDisplayName = profile?.user_name?.trim() || user?.email || 'Usuário'
  const userEmail = user?.email ?? 'Usuário não autenticado'
  const userRole = profile?.role ?? 'Definindo permissões'

  return (
    <header className={styles.topbar}>
      <div className={styles.heading}>
        <h1 className={styles.headingTitle}>
          Bem-vindo(a) {userDisplayName} ao CRM Meu Nome Ok
        </h1>
      </div>

      <div className={styles.userCard}>
        <div className={styles.avatar}>{userInitial}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{userEmail}</span>
          <span className={styles.userRole}>{userRole}</span>
        </div>
        {user ? (
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleSignOut}
            data-activity-ignore="true"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? 'Saindo...' : 'Sair'}
          </button>
        ) : null}
      </div>
    </header>
  )
}
