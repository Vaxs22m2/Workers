"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import ProfileEditModal from "@/components/ProfileEditModal/ProfileEditModal";
import WorkerProfileModal from "@/components/WorkerProfileModal/WorkerProfileModal";
import SendRequestModal from "@/components/SendRequestModal/SendRequestModal";
import Messenger from "@/components/Notifications/Notifications";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [showWorkerProfile, setShowWorkerProfile] = useState(false);
  const [showSendRequest, setShowSendRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [workers, setWorkers] = useState<any[]>([]);
  const [customerRequests, setCustomerRequests] = useState<any[]>([]);
  const [category, setCategory] = useState<string>("All Categories");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [skillQuery, setSkillQuery] = useState<string>("");
  const [workersLoading, setWorkersLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>("");
  const [workerRequests, setWorkerRequests] = useState<any[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [activeChatRequestId, setActiveChatRequestId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string>("");

  const loadWorkers = useCallback(async () => {
    setWorkersLoading(true);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.users || [];
      setWorkers(list.filter((x: any) => x.role === "worker"));
    } catch (err) {
      console.error(err);
    } finally {
      setWorkersLoading(false);
    }
  }, []);

  const fetchCustomerRequests = useCallback(async (customerId: string) => {
    try {
      const response = await fetch("/api/requests");
      const allRequests = await response.json();
      const myRequests = allRequests.filter((req: any) => req.customerId === customerId);
      setCustomerRequests(myRequests);
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  }, []);

  const fetchWorkerRequests = useCallback(async (workerId: string) => {
    try {
      const response = await fetch("/api/requests");
      const allRequests = await response.json();
      const received = allRequests.filter((req: any) => req.workerId === workerId);
      setWorkerRequests(received);
    } catch (err) {
      console.error("Error fetching worker requests:", err);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        router.push("/login");
        return;
      }
      const u = JSON.parse(stored);
      setUser(u);

      // Set default tab based on user role
      if (u.role === "customer") {
        setActiveTab("browse");
        loadWorkers();
        // Fetch customer's requests
        fetchCustomerRequests(u.id);
      } else {
        setActiveTab("requests");
        // Fetch worker's received requests
        fetchWorkerRequests(u.id);
      }
    } catch (error) {
      console.error(error);
    }
  }, [fetchCustomerRequests, fetchWorkerRequests, loadWorkers, router]);

  const handleSaveProfile = async (profileData: any) => {
    try {
      if (!user) {
        throw new Error("User not loaded");
      }
      
      console.log("Saving profile for user:", user.id);
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response data:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      const updatedUser = result.user;

      // Update local state
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // Refresh workers list if customer
      if (user.role === "customer") {
        loadWorkers();
      }
      
      console.log("Profile saved successfully!");
    } catch (error: any) {
      console.error("Save profile error:", error);
      throw new Error(error.message || "Failed to save profile");
    }
  };

  const handleViewProfile = (worker: any) => {
    setSelectedWorker(worker);
    setShowWorkerProfile(true);
  };

  const handleSendRequest = async (description: string) => {
    try {
      if (!user || !selectedWorker) {
        throw new Error("Missing user or worker information");
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: user.id,
          workerId: selectedWorker.id,
          description,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send request");
      }

      // Close modals
      setShowSendRequest(false);
      setShowWorkerProfile(false);
      setSelectedWorker(null);

      // Refresh requests list
      await fetchCustomerRequests(user.id);

      // Show success message
      alert("Request sent successfully!");
    } catch (error: any) {
      console.error("Send request error:", error);
      throw new Error(error.message || "Failed to send request");
    }
  };

  const handleEditRequest = (request: any) => {
    setEditingRequestId(request.id);
    setEditingDescription(request.description);
  };

  const handleSaveEditRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: editingDescription,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update request");
      }

      // Refresh requests
      await fetchCustomerRequests(user.id);
      setEditingRequestId(null);
      setEditingDescription("");
      alert("Request updated successfully!");
    } catch (error: any) {
      console.error("Error updating request:", error);
      alert(error.message || "Failed to update request");
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this request?")) {
      return;
    }

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete request");
      }

      // Refresh requests
      await fetchCustomerRequests(user.id);
      alert("Request deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting request:", error);
      alert(error.message || "Failed to delete request");
    }
  };

  const handleWorkerDeleteRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this request?")) {
      return;
    }

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete request");
      }

      // Refresh requests
      await fetchWorkerRequests(user.id);
      alert("Request deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting request:", error);
      alert(error.message || "Failed to delete request");
    }
  };

  const handleApplyRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "accepted",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to apply for request");
      }

      // Refresh requests
      await fetchWorkerRequests(user.id);
      alert("Request accepted! Message has been sent to the customer.");
    } catch (error: any) {
      console.error("Error applying for request:", error);
      alert(error.message || "Failed to apply for request");
    }
  };

  const handleOpenMessage = (request: any) => {
    // Fetch customer info
    const customerId = request.customerId;
    fetch(`/api/users/${customerId}`)
      .then((r) => r.json())
      .then((customer) => {
        setSelectedChatUser(customer);
        setActiveChatRequestId(request.id);
        setShowMessageModal(true);
      })
      .catch((err) => console.error(err));
  };

  const handleOpenChatFromProfile = (worker: any) => {
    const existingRequest = customerRequests.find((req: any) => req.workerId === worker.id);
    if (!existingRequest) {
      alert("Send a request to this worker first, then you can chat.");
      return;
    }
    setSelectedChatUser(worker);
    setActiveChatRequestId(existingRequest.id);
    setShowWorkerProfile(false);
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!activeChatRequestId || !selectedChatUser) {
      alert("Chat context is missing");
      return;
    }

    if (!messageText.trim()) {
      alert("Please enter a message");
      return;
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: activeChatRequestId,
          senderId: user.id,
          senderName: user.fullName,
          senderRole: user.role || "user",
          recipientId: selectedChatUser.id,
          message: messageText,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      setMessageText("");
      setShowMessageModal(false);
      setActiveChatRequestId(null);
      alert("Message sent successfully!");
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert(error.message || "Failed to send message");
    }
  };

  const normalizedLocationFilter = locationFilter.toLowerCase();
  const normalizedSkillQuery = skillQuery.toLowerCase();
  const normalizedCategory = category.toLowerCase();
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (
        normalizedLocationFilter &&
        !(w.profile?.location || w.phone || "")
          .toLowerCase()
          .includes(normalizedLocationFilter)
      ) {
        return false;
      }
      const skills = (w.profile?.skills || "").toString().toLowerCase();
      if (normalizedSkillQuery && !skills.includes(normalizedSkillQuery)) {
        return false;
      }
      if (category !== "All Categories" && !skills.includes(normalizedCategory)) {
        return false;
      }
      return true;
    });
  }, [
    workers,
    normalizedLocationFilter,
    normalizedSkillQuery,
    normalizedCategory,
    category,
  ]);
  if (!user) return <p style={{ padding: 24 }}>Loading...</p>;

  const profile = user.profile || {};

  return (
    <main className={styles.wrapper}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Worker Dashboard</h1>
        <div className={styles.headerRight}>
          <div className={styles.accountInfo}>Welcome, {user.fullName || user.email}</div>
          {user && <Messenger user={user} />}
        </div>
      </div>

      <div className={styles.tabs}>
        {user.role === "customer" ? (
          <>
            <button
              className={activeTab === "browse" ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab("browse")}
            >
              Browse Workers
            </button>
            <button
              className={activeTab === "myrequests" ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab("myrequests")}
            >
              My Requests ({customerRequests.length})
            </button>
          </>
        ) : (
          <>
            <button
              className={activeTab === "requests" ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab("requests")}
            >
              Requests ({workerRequests.length})
            </button>
            <button
              className={activeTab === "profile" ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab("profile")}
            >
              My Profile
            </button>
          </>
        )}
      </div>

      {activeTab === "requests" && user?.role === "worker" && (
        <section className={styles.content}>
          {workerRequests.length === 0 ? (
            <p>No requests received yet. Complete your profile to get more requests.</p>
          ) : (
            <div className={styles.requestsList}>
              {workerRequests.map((req: any) => {
                const customer = req.customerInfo;
                return (
                  <div key={req.id} className={styles.requestCard}>
                    <div className={styles.requestHeader}>
                      <div>
                        <div className={styles.requestStatus}>
                          Status: <span className={req.status === "accepted" ? styles.badgeAccepted : styles.badgePending}>{req.status}</span>
                        </div>
                        <div className={styles.requestDate}>{new Date(req.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <div className={styles.requestBody}>
                      <div className={styles.customerInfo}>
                        <strong>Customer Request:</strong>
                      </div>
                      <p className={styles.requestDescription}>{req.description}</p>
                      <div className={styles.workerRequestActions}>
                        {req.status !== "accepted" && (
                          <>
                            <button
                              className={styles.applyBtn}
                              onClick={() => handleApplyRequest(req.id)}
                            >
                              Accept Request
                            </button>
                            <button
                              className={styles.messageBtn}
                              onClick={() => handleOpenMessage(req)}
                            >
                              Message Customer
                            </button>
                          </>
                        )}
                        <button
                          className={styles.deleteWorkerBtn}
                          onClick={() => handleWorkerDeleteRequest(req.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {user.role === "customer" && activeTab === "browse" && (
        <section className={styles.content}>
          {workersLoading && (
            <div className={styles.loadingBarWrap}>
              <div className={styles.loadingBarTrack}>
                <div className={styles.loadingBarFill} />
              </div>
              <div className={styles.loadingText}>Loading workers...</div>
            </div>
          )}
          <div className={styles.filterBar}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.select}>
              <option>All Categories</option>
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>Carpentry</option>
            </select>
            <input className={styles.input} placeholder="Location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
            <input className={styles.input} placeholder="Search skills..." value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} />
            <button className={styles.searchBtn}>Search</button>
          </div>

          <div className={styles.grid}>
            {!workersLoading && filteredWorkers.length === 0 ? (
              <p className={styles.emptyWorkers}>No workers found.</p>
            ) : (
              filteredWorkers.map((w) => (
                <div key={w.id} className={styles.workerCard}>
                  <div className={styles.cardHeader}>
                    {w.profile?.profilePicture ? (
                      <img src={w.profile.profilePicture} alt={w.fullName} className={styles.cardAvatarImage} />
                    ) : (
                      <div className={styles.cardAvatar}>{(w.fullName || "").charAt(0).toUpperCase() || "T"}</div>
                    )}
                    <div>
                      <div className={styles.cardName}>{w.fullName}</div>
                      <div className={styles.cardLocation}>{w.profile?.location || w.phone || ""}</div>
                    </div>
                    <div className={styles.stars}>★ 0.0</div>
                  </div>

                  <div className={styles.cardBio}>{w.profile?.description || ""}</div>

                  <div className={styles.skillList}>
                    {((w.profile?.skills || "") + "").split(",").filter(Boolean).slice(0,3).map((s: string, i: number) => (
                      <span key={i} className={styles.skill}>{s.trim()}</span>
                    ))}
                  </div>

                  <div className={styles.cardActions}>
                    <button className={styles.viewBtn} onClick={() => handleViewProfile(w)}>View Profile</button>
                    <button className={styles.contactBtn} onClick={() => {
                      setSelectedWorker(w);
                      setShowSendRequest(true);
                    }}>Send Request</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {user.role === "customer" && activeTab === "myrequests" && (
        <section className={styles.content}>
          {customerRequests.length === 0 ? (
            <p>No requests sent yet. <a href="#" onClick={() => setActiveTab("browse")} style={{ color: '#0b5cff', textDecoration: 'underline', cursor: 'pointer' }}>Browse workers</a> to send requests.</p>
          ) : (
            <div className={styles.requestsList}>
              {customerRequests.map((req: any) => (
                <div key={req.id} className={styles.requestCard}>
                  <div className={styles.requestHeader}>
                    <div>
                      <div className={styles.requestStatus}>Status: <span className={styles.badgePending}>{req.status}</span></div>
                      <div className={styles.requestDate}>{new Date(req.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  {editingRequestId === req.id ? (
                    <div className={styles.editRequestForm}>
                      <textarea
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        className={styles.editTextarea}
                        rows={3}
                      />
                      <div className={styles.editActions}>
                        <button
                          className={styles.saveBtnSmall}
                          onClick={() => handleSaveEditRequest(req.id)}
                        >
                          Save
                        </button>
                        <button
                          className={styles.cancelBtnSmall}
                          onClick={() => setEditingRequestId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.requestBody}>
                      <p className={styles.requestDescription}>{req.description}</p>
                      <div className={styles.requestActions}>
                        <button
                          className={styles.editRequestBtn}
                          onClick={() => handleEditRequest(req)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteRequestBtn}
                          onClick={() => handleDeleteRequest(req.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "profile" && (
        <section className={styles.content}>
          <div className={styles.card}>
            <button className={styles.editBtn} onClick={() => setIsEditModalOpen(true)}>Edit Profile</button>

            <h2 className={styles.cardTitle}>Your Profile</h2>

            <div className={styles.profileRow}>
              <div className={styles.avatarCol}>
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt="Profile" className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatar}>{(user.fullName || "").charAt(0).toUpperCase() || "V"}</div>
                )}
                <button className={styles.uploadBtn} onClick={() => setIsEditModalOpen(true)}>Upload Photo</button>
              </div>

              <div className={styles.detailsCol}>
                <div className={styles.field}><strong>Name</strong><div>{user.fullName || "—"}</div></div>
                <div className={styles.field}><strong>Phone</strong><div>{user.phone || "—"}</div></div>
                <div className={styles.field}><strong>Skills</strong><div>{profile.skills || "—"}</div></div>
                <div className={styles.field}><strong>Location</strong><div>{profile.location || "—"}</div></div>
                <div className={styles.field}><strong>Experience</strong><div>{profile.experience || "—"}</div></div>
                <div className={styles.field}><strong>Description</strong><div>{profile.description || "—"}</div></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {isEditModalOpen && (
        <ProfileEditModal user={user} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProfile} />
      )}

      {showWorkerProfile && selectedWorker && (
        <WorkerProfileModal 
          worker={selectedWorker} 
          onClose={() => {
            setShowWorkerProfile(false);
            setSelectedWorker(null);
          }} 
          onChat={() => handleOpenChatFromProfile(selectedWorker)}
          onSendRequest={() => {
            setShowWorkerProfile(false);
            setShowSendRequest(true);
          }} 
        />
      )}

      {showSendRequest && selectedWorker && (
        <SendRequestModal 
          worker={selectedWorker} 
          onClose={() => {
            setShowSendRequest(false);
            setSelectedWorker(null);
          }} 
          onSubmit={handleSendRequest} 
        />
      )}

      {showMessageModal && selectedChatUser && (
        <div className={styles.messageOverlay} onClick={() => setShowMessageModal(false)}>
          <div className={styles.messageModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.messageHeader}>
              <h3>Message to {selectedChatUser.fullName}</h3>
              <button className={styles.messageClose} onClick={() => setShowMessageModal(false)}>✕</button>
            </div>
            <div className={styles.messageContent}>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className={styles.messageTextarea}
                placeholder="Type your message here..."
                rows={5}
              />
            </div>
            <div className={styles.messageActions}>
              <button
                className={styles.messageCancelBtn}
                onClick={() => setShowMessageModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.messageSendBtn}
                onClick={handleSendMessage}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
