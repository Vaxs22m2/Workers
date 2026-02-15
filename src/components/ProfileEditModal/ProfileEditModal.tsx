"use client";

import { useState, useRef } from "react";
import styles from "./ProfileEditModal.module.css";

interface ProfileEditModalProps {
  user: any;
  onClose: () => void;
  onSave: (profileData: any) => Promise<void>;
}

export default function ProfileEditModal({ user, onClose, onSave }: ProfileEditModalProps) {
  const profile = user.profile || {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workImagesInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: user.fullName || "",
    phone: user.phone || "",
    skills: profile.skills || "",
    location: profile.location || "",
    experience: profile.experience || "",
    description: profile.description || "",
    profilePicture: profile.profilePicture || "",
    workImages: profile.workImages || [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState(profile.profilePicture || "");
  const MAX_IMAGES = 5;

  const compressImage = async (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality = 0.75
  ): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    });

    let width = image.width;
    let height = image.height;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, 1024, 1024, 0.78)
        .then((base64) => {
        setProfileImagePreview(base64);
        setFormData((prev) => ({ ...prev, profilePicture: base64 }));
        })
        .catch(() => setError("Failed to process profile image"));
    }
  };

  const handleWorkImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remaining = MAX_IMAGES - formData.workImages.length;
      const selected = Array.from(files);
      const filesToUse = selected.slice(0, Math.max(0, remaining));

      if (selected.length > remaining) {
        setError(`Maximum ${MAX_IMAGES} images allowed`);
      } else {
        setError("");
      }

      try {
        const compressed = await Promise.all(
          filesToUse.map((file) => compressImage(file, 1280, 1280, 0.75))
        );
        setFormData((prev) => ({
          ...prev,
          workImages: [...prev.workImages, ...compressed],
        }));
      } catch {
        setError("Failed to process one or more work images");
      }
    }
  };

  const handleRemoveWorkImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      workImages: prev.workImages.filter((_: string, i: number) => i !== index),
    }));
  };

  const handleWorkImagesClick = () => {
    workImagesInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      // Separate profile fields from user fields
      const profileUpdate = {
        fullName: formData.fullName,
        phone: formData.phone,
        profile: {
          skills: formData.skills,
          location: formData.location,
          experience: formData.experience,
          description: formData.description,
          profilePicture: formData.profilePicture,
          workImages: formData.workImages,
        },
      };

      console.log("Sending profile update:", profileUpdate);
      await onSave(profileUpdate);
      onClose();
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit Profile</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Profile Picture Section */}
          <div className={styles.section}>
            <h3>Profile Picture</h3>
            <div className={styles.photoUploadArea}>
              {profileImagePreview ? (
                <img src={profileImagePreview} alt="Profile" className={styles.profilePhoto} />
              ) : (
                <div className={styles.photoPlaceholder}>
                  {(formData.fullName || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
                className={styles.hiddenInput}
              />
              <button type="button" className={styles.uploadPhotoBtn} onClick={() => fileInputRef.current?.click()}>
                Upload Photo
              </button>
            </div>
          </div>

          {/* Personal Information */}
          <div className={styles.section}>
            <h3>Personal Information</h3>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className={styles.section}>
            <h3>Professional Information</h3>
            <div className={styles.formGroup}>
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="e.g., Plumbing, Electrical, Carpentry"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Your service area"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Experience Level</label>
              <select name="experience" value={formData.experience} onChange={handleInputChange}>
                <option value="">Select experience level</option>
                <option value="Entry Level">Entry Level (0-1 years)</option>
                <option value="Intermediate">Intermediate (1-3 years)</option>
                <option value="Advanced">Advanced (3-5 years)</option>
                <option value="Expert">Expert (5+ years)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Description/Bio</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell customers about yourself and your services"
                rows={4}
              />
            </div>
          </div>

          {/* Work Images Section */}
          <div className={styles.section}>
            <h3>Work Images ({formData.workImages.length}/{MAX_IMAGES})</h3>
            <div className={styles.workImagesContainer}>
              <div className={styles.workImagesGrid}>
                {formData.workImages.map((image: string, index: number) => (
                  <div key={index} className={styles.workImageItem}>
                    <img src={image} alt={`Work ${index + 1}`} className={styles.workImage} />
                    <button
                      type="button"
                      className={styles.removeImageBtn}
                      onClick={() => handleRemoveWorkImage(index)}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {formData.workImages.length < MAX_IMAGES && (
                <button
                  type="button"
                  className={styles.addWorkImageBtn}
                  onClick={handleWorkImagesClick}
                >
                  + Add Work Images
                </button>
              )}
              <input
                type="file"
                ref={workImagesInputRef}
                accept="image/*"
                multiple
                onChange={handleWorkImageChange}
                className={styles.hiddenInput}
              />
              <p className={styles.imageHelp}>
                Upload up to {MAX_IMAGES} images of your work. Keep images clear and well-lit.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
