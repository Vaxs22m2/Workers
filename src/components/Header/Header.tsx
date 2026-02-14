"use client";

import { useRouter } from "next/navigation";
import styles from "./Header.module.css";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {
      // ignore
    }
  }, []);

  const handlePrimary = () => {
    if (user) router.push("/dashboard");
    else router.push("/login");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>Workers</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user && (
            <span style={{ marginRight: 8 }}>Welcome, {user.fullName?.split(" ")[0]}</span>
          )}
          <button className={styles.button} onClick={handlePrimary}>
            {user ? "Dashboard" : "Get Started"}
          </button>
          {user && (
            <button className={styles.button} onClick={handleLogout}>
              Log Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
