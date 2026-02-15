"use client";

import { useState, useEffect } from "react";
import styles from "./Notifications.module.css";

interface CurrentUser {
  id: string;
  fullName?: string;
  role?: string;
}

interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  recipientId: string;
  message: string;
  createdAt: string;
}

interface NotificationsProps {
  user: CurrentUser;
}

interface Thread {
  key: string;
  requestId: string;
  otherUserId: string;
  otherName: string;
  lastMessage: Message;
}

function getThreadKey(message: Message, currentUserId: string) {
  const otherUserId =
    message.senderId === currentUserId ? message.recipientId : message.senderId;
  return `${message.requestId}:${otherUserId}`;
}

export default function Notifications({ user }: NotificationsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadKey, setSelectedThreadKey] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const fetchMessages = async () => {
    try {
      const [messagesRes, usersRes] = await Promise.all([
        fetch("/api/messages"),
        fetch("/api/users"),
      ]);
      let nameMap: Record<string, string> = {};

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = Array.isArray(usersData) ? usersData : usersData.users || [];
        users.forEach((u: any) => {
          nameMap[u.id] = u.fullName || u.email || "User";
        });
        setUsersMap(nameMap);
      }

      if (messagesRes.ok) {
        const data = (await messagesRes.json()) as Message[];
        const myMessages = data.filter(
          (m) => m.senderId === user.id || m.recipientId === user.id
        );
        myMessages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setMessages(myMessages);

        const threadMap = new Map<string, Thread>();
        myMessages.forEach((msg) => {
          const key = getThreadKey(msg, user.id);
          const otherUserId =
            msg.senderId === user.id ? msg.recipientId : msg.senderId;
          const otherName =
            nameMap[otherUserId] || usersMap[otherUserId] || msg.senderName || `User ${otherUserId}`;
          const existing = threadMap.get(key);
          if (
            !existing ||
            new Date(msg.createdAt).getTime() >
              new Date(existing.lastMessage.createdAt).getTime()
          ) {
            threadMap.set(key, {
              key,
              requestId: msg.requestId,
              otherUserId,
              otherName,
              lastMessage: msg,
            });
          }
        });

        const sortedThreads = [...threadMap.values()].sort(
          (a, b) =>
            new Date(b.lastMessage.createdAt).getTime() -
            new Date(a.lastMessage.createdAt).getTime()
        );
        setThreads(sortedThreads);
        if (!selectedThreadKey && sortedThreads.length > 0) {
          setSelectedThreadKey(sortedThreads[0].key);
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeThread = threads.find((thread) => thread.key === selectedThreadKey);
  const activeMessages = activeThread
    ? messages.filter((m) => getThreadKey(m, user.id) === activeThread.key)
    : [];

  const handleSend = async () => {
    if (!activeThread || !draft.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: activeThread.requestId,
          senderId: user.id,
          senderName: user.fullName || "User",
          senderRole: user.role || "user",
          recipientId: activeThread.otherUserId,
          message: draft.trim(),
        }),
      });

      if (response.ok) {
        setDraft("");
        await fetchMessages();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const messageCount = messages.length;

  return (
    <div className={styles.notificationContainer}>
      <button
        className={styles.bellIcon}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        Messenger
        {messageCount > 0 && <span className={styles.badge}>{messageCount}</span>}
      </button>

      {showDropdown && (
        <div className={styles.dropdown}>
          {loading ? (
            <p className={styles.empty}>Loading...</p>
          ) : threads.length === 0 ? (
            <p className={styles.empty}>No chats yet</p>
          ) : (
            <div className={styles.chatLayout}>
              <div className={styles.threadList}>
                {threads.map((thread) => (
                  <button
                    key={thread.key}
                    className={`${styles.threadItem} ${
                      thread.key === selectedThreadKey ? styles.threadItemActive : ""
                    }`}
                    onClick={() => setSelectedThreadKey(thread.key)}
                  >
                    <div className={styles.threadName}>{thread.otherName}</div>
                    <div className={styles.threadPreview}>
                      {thread.lastMessage.message}
                    </div>
                    <div className={styles.time}>
                      {new Date(thread.lastMessage.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>
                ))}
              </div>

              <div className={styles.chatPanel}>
                <div className={styles.header}>
                  <h3>{activeThread?.otherName || "Chat"}</h3>
                  <span className={styles.unreadCount}>
                    {activeMessages.length} messages
                  </span>
                </div>

                <div className={styles.list}>
                  {activeMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.notificationItem} ${
                        msg.senderId === user.id
                          ? styles.ownMessage
                          : styles.otherMessage
                      }`}
                    >
                      <div className={styles.content}>
                        <div className={styles.description}>{msg.message}</div>
                        <div className={styles.time}>
                          {new Date(msg.createdAt).toLocaleDateString()}{" "}
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.composer}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className={styles.input}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSend();
                      }
                    }}
                  />
                  <button
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
