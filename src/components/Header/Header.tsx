"use client";

import { useRouter } from "next/navigation";
import styles from "./Header.module.css";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const handlePrimary = () => {
    setMenuOpen(false);
    if (user) router.push("/dashboard");
    else router.push("/login");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>Workers</div>

        {/* Desktop Navigation */}
        <div className={styles.desktopNav}>
          {user && (
            <span className={styles.welcome}>
              Welcome, {user.fullName?.split(" ")[0]}
            </span>
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

        {/* Hamburger */}
        <div
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {user && (
            <span className={styles.mobileWelcome}>
              Welcome, {user.fullName?.split(" ")[0]}
            </span>
          )}
          <button className={styles.mobileButton} onClick={handlePrimary}>
            {user ? "Dashboard" : "Get Started"}
          </button>
          {user && (
            <button className={styles.mobileButton} onClick={handleLogout}>
              Log Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
