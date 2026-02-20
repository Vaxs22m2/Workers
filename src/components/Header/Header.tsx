"use client";

import { useRouter } from "next/navigation";
import styles from "./Header.module.css";
import { useState } from "react";
import { clearSession, getSession, type SessionUser } from "@/lib/session";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(() => getSession()?.user || null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handlePrimary = () => {
    const session = getSession();
    if (session && !user) setUser(session.user);
    if (!session && user) setUser(null);
    setMenuOpen(false);
    if (session) router.push("/dashboard");
    else router.push("/login");
  };

  const handleLogout = () => {
    clearSession();
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
