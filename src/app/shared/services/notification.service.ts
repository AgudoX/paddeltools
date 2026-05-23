import { Injectable, signal, computed } from "@angular/core";

export type NotificationType = "success" | "error" | "system-error";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

@Injectable({ providedIn: "root" })
export class NotificationService {
  private static readonly AUTO_DISMISS_MS = 4000;
  private readonly _notifications = signal<Notification[]>([]);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }

    const id = crypto.randomUUID?.() ?? Date.now().toString(36);
    this._notifications.set([{ id, type, message }]);
    this.dismissTimer = setTimeout(() => {
      this.dismiss(id);
    }, NotificationService.AUTO_DISMISS_MS);
  }

  public dismiss(id: string): void {
    const active = this.activeNotification();
    if (active?.id === id && this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  public clearAll(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this._notifications.set([]);
  }
}
