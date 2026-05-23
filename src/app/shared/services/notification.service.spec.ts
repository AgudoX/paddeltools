import { TestBed } from "@angular/core/testing";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
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

   it("activeNotification returns first notification in queue", () => {
     service.showSuccess("Primero");
     service.showError("Segundo");
     expect(service.activeNotification()!.message).toBe("Primero");
   });

   it("uses Date.now() fallback when crypto.randomUUID is unavailable", () => {
     const originalRandomUUID = crypto.randomUUID;
     (crypto as Record<string, unknown>).randomUUID = undefined;

     service.showSuccess("Test with fallback");

     expect(service.activeNotification()).not.toBeNull();

     (crypto as Record<string, unknown>).randomUUID = originalRandomUUID;
   });
 });
