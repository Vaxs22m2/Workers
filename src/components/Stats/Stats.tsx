import styles from "./Stats.module.css";

const stats = [
  { icon: "bi-people", value: "10+", label: "Verified Workers" },
  { icon: "bi-geo-alt", value: "54+", label: "Cities Covered" },
  { icon: "bi-search", value: "20+", label: "Jobs Completed" },
];

export default function Stats() {
  return (
    <section className={styles.stats}>
      {stats.map((item) => (
        <div key={item.label} className={styles.card}>
          <div className={styles.icon} aria-hidden="true">
            <i className={`bi ${item.icon}`} />
          </div>
          <h3 className={styles.value}>{item.value}</h3>
          <p className={styles.label}>{item.label}</p>
        </div>
      ))}
    </section>
  );
}
