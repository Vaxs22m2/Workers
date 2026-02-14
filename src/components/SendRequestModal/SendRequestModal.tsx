"use client";

import { useState } from "react";
import styles from "./SendRequestModal.module.css";

interface SendRequestModalProps {
  worker: any;
  onClose: () => void;
  onSubmit: (description: string) => Promise<void>;
}

export default function SendRequestModal({ worker, onClose, onSubmit }: SendRequestModalProps) {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError("Please describe what you need");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit(description);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to send request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Send Request to {worker.fullName}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Describe what you need</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell the worker about the job you need done. Include details about what you're looking for..."
              rows={6}
              disabled={isSubmitting}
            />
            <div className={styles.charCount}>
              {description.length} / 1000
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !description.trim()}>
              {isSubmitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
