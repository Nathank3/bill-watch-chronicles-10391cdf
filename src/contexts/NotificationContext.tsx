
import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

export type NotificationType = "business_created" | "action_required";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  businessId: string;
  businessType: "bill" | "document";
  businessTitle: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => void;
  clearNotification: (id: string) => void;
  clearBusinessNotifications: (businessId: string) => void;
  clearAllNotifications: () => void;
  clearReadNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => { },
  markAllAsRead: () => { },
  addNotification: () => { },
  clearNotification: () => { },
  clearBusinessNotifications: () => { },
  clearAllNotifications: () => { },
  clearReadNotifications: () => { },
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      try {
        const parsed = (JSON.parse(stored) as Array<Omit<Notification, "createdAt"> & { createdAt: string }>).map((n) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        }));
        setNotifications(parsed);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "createdAt" | "read">) => {
    setNotifications((prev) => {
      // For action_required (Frozen) notifications, we want them to be extremely persistent
      if (notification.type === "action_required") {
        const existingIndex = prev.findIndex(
          (n) => n.businessId === notification.businessId && n.type === "action_required"
        );

        if (existingIndex !== -1) {
          // If it exists, even if read, we make it unread and bring it to top with new timestamp
          const existing = prev[existingIndex];
          const updated: Notification = {
            ...existing,
            ...notification,
            read: false, // Reset to unread
            createdAt: new Date(), // Update timestamp
          };
          const next = [...prev];
          next.splice(existingIndex, 1);
          return [updated, ...next];
        }
      }

      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        read: false,
      };

      return [newNotification, ...prev];
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearBusinessNotifications = useCallback((businessId: string) => {
    setNotifications((prev) => prev.filter((n) => n.businessId !== businessId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearReadNotifications = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => !n.read));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        clearNotification,
        clearBusinessNotifications,
        clearAllNotifications,
        clearReadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

