import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>© {new Date().getFullYear()} Workers — Vaxo's Webstudio</p>
      </div>
    </footer>
  )
}
