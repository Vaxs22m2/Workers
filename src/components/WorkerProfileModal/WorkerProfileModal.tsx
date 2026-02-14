"use client";

import styles from "./WorkerProfileModal.module.css";

interface WorkerProfileModalProps {
  worker: any;
  onClose: () => void;
  onSendRequest: () => void;
}

export default function WorkerProfileModal({ worker, onClose, onSendRequest }: WorkerProfileModalProps) {
  const profile = worker.profile || {};

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Worker Profile</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {/* Profile Picture and Basic Info */}
          <div className={styles.profileSection}>
            <div className={styles.photoArea}>
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt={worker.fullName} className={styles.profilePhoto} />
              ) : (
                <div className={styles.photoPlaceholder}>
                  {(worker.fullName || "").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.basicInfo}>
              <h3>{worker.fullName || "Unknown"}</h3>
              <p className={styles.location}>📍 {profile.location || worker.phone || "Location not specified"}</p>
              <div className={styles.rating}>
                <span className={styles.stars}>★★★★★</span>
                <span className={styles.ratingText}>(0 reviews)</span>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className={styles.detailSection}>
            <div className={styles.detailGroup}>
              <h4>Skills</h4>
              <div className={styles.skillsList}>
                {((profile.skills || "") + "").split(",").filter(Boolean).map((skill: string, i: number) => (
                  <span key={i} className={styles.skillTag}>{skill.trim()}</span>
                ))}
                {!profile.skills && <p className={styles.notSpecified}>Not specified</p>}
              </div>
            </div>

            <div className={styles.detailGroup}>
              <h4>Experience</h4>
              <p>{profile.experience || "Not specified"}</p>
            </div>

            <div className={styles.detailGroup}>
              <h4>About</h4>
              <p>{profile.description || "No description provided"}</p>
            </div>

            {profile.workImages && profile.workImages.length > 0 && (
              <div className={styles.detailGroup}>
                <h4>Work Portfolio</h4>
                <div className={styles.workImagesGallery}>
                  {profile.workImages.map((image: string, index: number) => (
                    <div key={index} className={styles.galleryImage}>
                      <img src={image} alt={`Work ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.detailGroup}>
              <h4>Contact</h4>
              <p>📧 {worker.email}</p>
              <p>📱 {worker.phone || "Not provided"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Close
            </button>
            <button className={styles.sendBtn} onClick={onSendRequest}>
              Send Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
