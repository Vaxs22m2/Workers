"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"customer" | "worker">("customer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (storedUser && token) {
      router.replace("/dashboard");
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName, phone, role }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Failed to sign up");
          return;
        }
        if (data?.token && data?.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          router.push("/dashboard");
          return;
        }
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        alert(loginData.error || "Failed to login");
        return;
      }

      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(loginData.user));

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.container}>
      {checkingAuth && (
        <div className={styles.loadingBar}>
          <div className={styles.loadingBarInner} />
        </div>
      )}
      {checkingAuth ? (
        <p>Checking session...</p>
      ) : (
      <>
      {isSubmitting && (
        <div className={styles.loadingBar}>
          <div className={styles.loadingBarInner} />
        </div>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</h1>

        {isSignUp && (
          <>
            <label className={styles.label}>
              Full Name
              <input
                className={styles.input}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
              />
            </label>

            <label className={styles.label}>
              Phone Number
              <input
                className={styles.input}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required={isSignUp}
              />
            </label>

       <label className={styles.label}>I am a</label>

      <select
        value={role}
        onChange={(e) => setRole(e.target.value.toLowerCase() as "customer" | "worker")}
        className={styles.input}
      >
        <option value="customer">Customer</option>
        <option value="worker">Worker</option>
      </select>

          </>
        )}

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className={styles.label}>
          Password
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className={styles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
        </button>

        <button
          type="button"
          className={styles.reg}
          onClick={() => setIsSignUp(!isSignUp)}
          disabled={isSubmitting}
        >
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </button>
      </form>
      </>
      )}
    </main>
  );
}
