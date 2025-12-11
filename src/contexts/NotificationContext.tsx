
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
      // Prevent duplicate notifications for the same business item if it's an action_required type
      // This allows "frozen" notifications to be persistent but not spammy
      if (notification.type === "action_required") {
        const exists = prev.some(
          (n) =>
            n.businessId === notification.businessId &&
            n.type === "action_required" &&
            !n.read // Only check unread ones, or maybe even read ones if we want it truly unique until resolved? 
          // User said "persistent". Usually means it stays until action taken.
          // For now, let's avoid adding if there's already an unread one.
        );
        if (exists) return prev;
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
        clearAllNotifications,
        clearReadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

