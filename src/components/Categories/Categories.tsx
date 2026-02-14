import styles from './Categories.module.css';

export default function Services() {
  return (
    <div className={styles.container}>
      <section>
        <h1 className={styles.title}>Browse by Category</h1>

        <div className={styles['services-grid']}>
          <div className={styles['service-card']}>
            <img
              src="/samtexnik.png"
              alt="Plumber working"
              className={styles['service-image']}
            />
            <h2 className={styles['service-title']}>Plumbers</h2>
            <p className={styles['service-description']}>
              Check plumber profiles and portfolios. Choose a trusted plumber for the job.
            </p>
            <button className={styles['more-btn']}>More</button>
          </div>

          <div className={styles['service-card']}>
            <img
              src="/elxtrik.jpg"
              alt="Electrician working"
              className={styles['service-image']}
            />
            <h2 className={styles['service-title']}>Electrics</h2>
            <p className={styles['service-description']}>
              Check Electrics profiles and portfolios. Choose a trusted Electrics for the job.
            </p>
            <button className={styles['more-btn']}>More</button>
          </div>

          <div className={`${styles['service-card']} ${styles.placeholder}`}>
            <button className={styles['more-btn']}>More</button>
          </div>
        </div>
      </section>
    </div>
  );
}
