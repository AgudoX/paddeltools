import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SnackbarComponent, SnackbarType } from './snackbar.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SnackbarComponent', () => {
  let fixture: ComponentFixture<SnackbarComponent>;
  let component: SnackbarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnackbarComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SnackbarComponent);
    component = fixture.componentRef.instance;
  });

  it('renders message text', () => {
    fixture.componentRef.setInput('message', 'Torneo guardado');
    fixture.detectChanges();
    const msg = fixture.nativeElement.querySelector('.snackbar-message');
    expect(msg.textContent.trim()).toBe('Torneo guardado');
  });

  it('applies success type class by default', () => {
    fixture.componentRef.setInput('message', 'OK');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.snackbar');
    expect(el.classList.contains('snackbar--success')).toBe(true);
  });

  it.each<SnackbarType>(['success', 'error', 'system-error'])('applies %s type class', (type) => {
    fixture.componentRef.setInput('message', 'Test');
    fixture.componentRef.setInput('type', type);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.snackbar');
    expect(el.classList.contains(`snackbar--${type}`)).toBe(true);
  });

  it('shows check_circle icon for success', () => {
    fixture.componentRef.setInput('message', 'OK');
    fixture.componentRef.setInput('type', 'success');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.snackbar-icon');
    expect(icon.textContent.trim()).toBe('check_circle');
  });

  it('shows error icon for error types', () => {
    fixture.componentRef.setInput('message', 'Fail');
    fixture.componentRef.setInput('type', 'error');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.snackbar-icon');
    expect(icon.textContent.trim()).toBe('error');
  });

  it('shows error icon for system-error', () => {
    fixture.componentRef.setInput('message', 'Sys fail');
    fixture.componentRef.setInput('type', 'system-error');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.snackbar-icon');
    expect(icon.textContent.trim()).toBe('error');
  });

  it('emits dismissed when close button is clicked', () => {
    const spy = vi.fn();
    component.dismissed.subscribe(spy);
    fixture.componentRef.setInput('message', 'Test');
    fixture.detectChanges();
    const closeBtn = fixture.nativeElement.querySelector('.snackbar-close');
    closeBtn.click();
    expect(spy).toHaveBeenCalledOnce();
  });
});
