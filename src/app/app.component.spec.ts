import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { AppComponent } from "./app.component";
import { NotificationService } from "@shared/services/notification.service";

describe("AppComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it("creates the app shell", () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.title).toBe("Padeleria");
  });

  it("renders the active notification message", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const notifications = TestBed.inject(NotificationService);

    notifications.showSuccess("Todo bien");
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain("Todo bien");
  });

  it("dismissCurrent removes the active notification", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    const notifications = TestBed.inject(NotificationService);

    notifications.showError("Algo fallo");
    expect(notifications.activeNotification()?.message).toBe("Algo fallo");

    component.dismissCurrent();

    expect(notifications.activeNotification()).toBeNull();
  });

  it("dismissCurrent is a no-op when there is no active notification", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    const notifications = TestBed.inject(NotificationService);

    component.dismissCurrent();

    expect(notifications.activeNotification()).toBeNull();
  });

  it("toSnackbarType returns the snackbar-compatible type", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;

    expect(component.toSnackbarType("success")).toBe("success");
    expect(component.toSnackbarType("error")).toBe("error");
    expect(component.toSnackbarType("system-error")).toBe("system-error");
  });
});
