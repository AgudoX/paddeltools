import { Injectable, signal, computed } from "@angular/core";

export type NotificationType = "success" | "error" | "system-error";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

@Injectable({ providedIn: "root" })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  public readonly activeNotification = computed(() => this._notifications()[0] ?? null);

  public showSuccess(message: string): void {
    this.add("success", message);
  }

  public showError(message: string): void {
    this.add("error", message);
  }

  public showSystemError(message: string): void {
    this.add("system-error", message);
  }

  private add(type: NotificationType, message: string): void {
    const id = crypto.randomUUID?.() ?? Date.now().toString(36);
    this._notifications.update((list) => [...list, { id, type, message }]);
  }

  public dismiss(id: string): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  public clearAll(): void {
    this._notifications.set([]);
  }
}
