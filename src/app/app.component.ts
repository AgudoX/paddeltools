import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";

import {
  SnackbarComponent,
  SnackbarType,
} from "@shared/components/snackbar/snackbar.component";
import { NotificationService } from "@shared/services/notification.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule, SnackbarComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = "Padeleria";
  readonly notificationService = inject(NotificationService);

  toSnackbarType(type: string): SnackbarType {
    return type as SnackbarType;
  }

  dismissCurrent(): void {
    const active = this.notificationService.activeNotification();
    if (active) {
      this.notificationService.dismiss(active.id);
    }
  }
}
