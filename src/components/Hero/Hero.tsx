"use client";

import styles from "./Hero.module.css";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();

  return (
    <section className={styles.hero}>
      <h2>
        Find Trusted <span>Local Workers</span>
      </h2>
      <p>
        Connect with skilled professionals in your area. From plumbers to electricians,
        find the right expert for your needs.
      </p>
      <button onClick={() => router.push("/dashboard")}>Find Workers Now</button>
    </section>
  );
}
