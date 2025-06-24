import { Notification } from '@/types';

export class NotificationService {
  private listeners: ((notification: Notification) => void)[] = [];

  subscribe(callback: (notification: Notification) => void): () => void {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notify(
    type: Notification['type'], 
    title: string, 
    message: string
  ): void {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: Date.now()
    };

    this.listeners.forEach(listener => listener(notification));
  }

  success(title: string, message: string): void {
    this.notify('success', title, message);
  }

  error(title: string, message: string): void {
    this.notify('error', title, message);
  }

  warning(title: string, message: string): void {
    this.notify('warning', title, message);
  }

  info(title: string, message: string): void {
    this.notify('info', title, message);
  }
}

// Singleton instance
export const notificationService = new NotificationService();