import { TestBed } from "@angular/core/testing";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should have no active notifications initially", () => {
    expect(service.activeNotification()).toBeNull();
  });

  it("showSuccess adds success notification", () => {
    service.showSuccess("Torneo guardado");
    expect(service.activeNotification()).not.toBeNull();
    expect(service.activeNotification()!.type).toBe("success");
    expect(service.activeNotification()!.message).toBe("Torneo guardado");
  });

  it("showError adds error notification", () => {
    service.showError("No se pudo generar");
    expect(service.activeNotification()!.type).toBe("error");
    expect(service.activeNotification()!.message).toBe("No se pudo generar");
  });

  it("showSystemError adds system-error notification", () => {
    service.showSystemError("Error de almacenamiento");
    expect(service.activeNotification()!.type).toBe("system-error");
    expect(service.activeNotification()!.message).toBe("Error de almacenamiento");
  });

  it("dismiss removes notification by id", () => {
    service.showSuccess("A");
    const idA = service.activeNotification()!.id;
    service.dismiss(idA);
    expect(service.activeNotification()).toBeNull();
  });

  it("clearAll removes all notifications", () => {
    service.showSuccess("Uno");
    service.showError("Dos");
    service.clearAll();
    expect(service.activeNotification()).toBeNull();
  });

  it("replaces the current notification with the latest one", () => {
    service.showSuccess("Primero");
    service.showError("Segundo");
    expect(service.activeNotification()!.message).toBe("Segundo");
  });

  it("auto dismisses notifications after the timeout", () => {
    service.showSuccess("Temporal");
    expect(service.activeNotification()!.message).toBe("Temporal");

    vi.advanceTimersByTime(4000);

    expect(service.activeNotification()).toBeNull();
  });

  it("uses Date.now() fallback when crypto.randomUUID is unavailable", () => {
    const originalRandomUUID = (crypto as unknown as { randomUUID: unknown }).randomUUID;
    (crypto as unknown as { randomUUID: undefined }).randomUUID = undefined;

    service.showSuccess("Test with fallback");

    expect(service.activeNotification()).not.toBeNull();

    (crypto as unknown as { randomUUID: unknown }).randomUUID = originalRandomUUID;
  });

  it("dismiss with wrong id does not clear timer", () => {
    service.showSuccess("A");
    const idA = service.activeNotification()!.id;
    service.dismiss("wrong-id");
    expect(service.activeNotification()).not.toBeNull();
    expect(service.activeNotification()!.id).toBe(idA);
  });

  it("clearAll clears timer when set", () => {
    service.showSuccess("A");
    service.clearAll();
    expect(service.activeNotification()).toBeNull();
  });

  it("clearAll works when no timer is active", () => {
    service.clearAll();
    expect(service.activeNotification()).toBeNull();
  });
});
