import { LoginForm } from '@/features/auth/components/login-form'

import styles from './login-page.module.css'

export const LoginPage = () => {
  return (
    <section className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <img src="/logo.png" alt="CRM Meu Nome Ok" className={styles.logo} />
          <h1 className={styles.title}>CRM Meu Nome Ok</h1>
          <p className={styles.subtitle}>Acesse sua conta para continuar.</p>
        </header>

        <div className={styles.formArea}>
          <LoginForm />
        </div>
      </div>
    </section>
  )
}
