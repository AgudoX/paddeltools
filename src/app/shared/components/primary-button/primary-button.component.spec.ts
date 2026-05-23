import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrimaryButtonComponent } from './primary-button.component';

describe('PrimaryButtonComponent', () => {
  let fixture: ComponentFixture<PrimaryButtonComponent>;
  let component: PrimaryButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimaryButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PrimaryButtonComponent);
    component = fixture.componentRef.instance;
    fixture.detectChanges();
  });

  function getButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('renders default state', () => {
    const btn = getButton();
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('applies variant class', () => {
    fixture.componentRef.setInput('variant', 'danger');
    fixture.detectChanges();
    const btn = getButton();
    expect(btn.classList.contains('btn-danger')).toBe(true);
  });

  it('applies size class', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    const btn = getButton();
    expect(btn.classList.contains('btn-lg')).toBe(true);
  });

  it('disables button when disabled input is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(getButton().disabled).toBe(true);
  });

  it('shows spinner when loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-spinner')).toBeTruthy();
  });

  it('shows spinner and empty content when loading without projected content', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-spinner')).toBeTruthy();
  });

  it('hides content and shows spinner when loading', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-spinner')).toBeFalsy();

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-spinner')).toBeTruthy();
  });

  it('shows icon when icon input is set', () => {
    fixture.componentRef.setInput('icon', 'arrow_back');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon).toBeTruthy();
    expect(icon.textContent.trim()).toBe('arrow_back');
  });

  it('does not show icon when icon is empty', () => {
    fixture.componentRef.setInput('icon', '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-icon')).toBeFalsy();
  });

  it('sets type attribute from input', () => {
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();
    expect(getButton().getAttribute('type')).toBe('submit');
  });

  it('emits clicked on button click', () => {
    const spy = vi.fn();
    component.clicked.subscribe(spy);
    getButton().click();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('does not emit clicked when disabled', () => {
    const spy = vi.fn();
    component.clicked.subscribe(spy);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    getButton().click();
    expect(spy).not.toHaveBeenCalled();
  });
});
