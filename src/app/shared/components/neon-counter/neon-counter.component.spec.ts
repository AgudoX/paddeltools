import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NeonCounterComponent } from './neon-counter.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NeonCounterComponent', () => {
  let fixture: ComponentFixture<NeonCounterComponent>;
  let component: NeonCounterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeonCounterComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(NeonCounterComponent);
    component = fixture.componentRef.instance;
  });

  function getButtons(): NodeListOf<HTMLButtonElement> {
    return fixture.nativeElement.querySelectorAll('.neon-btn');
  }

  function getDisplay(): string {
    return fixture.nativeElement.querySelector('.neon-digit').textContent.trim();
  }

  it('renders initial value from input', () => {
    fixture.componentRef.setInput('value', 8);
    fixture.detectChanges();
    expect(getDisplay()).toBe('8');
  });

  it('emits decremented value on minus click', () => {
    const spy = vi.fn();
    component.changed.subscribe(spy);
    fixture.componentRef.setInput('value', 8);
    fixture.detectChanges();

    getButtons()[0].click();
    expect(spy).toHaveBeenCalledWith(7);
  });

  it('emits incremented value on plus click', () => {
    const spy = vi.fn();
    component.changed.subscribe(spy);
    fixture.componentRef.setInput('value', 8);
    fixture.detectChanges();

    getButtons()[1].click();
    expect(spy).toHaveBeenCalledWith(9);
  });

  it('disables minus button when value equals min', () => {
    fixture.componentRef.setInput('value', 0);
    fixture.componentRef.setInput('min', 0);
    fixture.detectChanges();

    expect(getButtons()[0].disabled).toBe(true);
    expect(getButtons()[1].disabled).toBe(false);
  });

  it('disables plus button when value equals max', () => {
    fixture.componentRef.setInput('value', 10);
    fixture.componentRef.setInput('max', 10);
    fixture.detectChanges();

    expect(getButtons()[0].disabled).toBe(false);
    expect(getButtons()[1].disabled).toBe(true);
  });

  it('uses default step of 1', () => {
    const spy = vi.fn();
    component.changed.subscribe(spy);
    fixture.componentRef.setInput('value', 5);
    fixture.detectChanges();

    getButtons()[0].click();
    expect(spy).toHaveBeenCalledWith(4);

    getButtons()[1].click();
    expect(spy).toHaveBeenCalledWith(6);
  });

  it('emits value with custom step', () => {
    const spy = vi.fn();
    component.changed.subscribe(spy);
    fixture.componentRef.setInput('value', 8);
    fixture.componentRef.setInput('step', 4);
    fixture.detectChanges();

    getButtons()[0].click();
    expect(spy).toHaveBeenCalledWith(4);

    getButtons()[1].click();
    expect(spy).toHaveBeenCalledWith(12);
  });

   it('updates display when value input changes', () => {
     fixture.componentRef.setInput('value', 4);
     fixture.detectChanges();
     expect(getDisplay()).toBe('4');

     fixture.componentRef.setInput('value', 12);
     fixture.detectChanges();
     expect(getDisplay()).toBe('12');
   });

   it('hides leaving digit after animation timeout (200ms)', () => {
     vi.useFakeTimers();

     fixture.componentRef.setInput('value', 4);
     fixture.detectChanges();
     expect(component['showLeaving']()).toBe(false);

     fixture.componentRef.setInput('value', 8);
     fixture.detectChanges();
     expect(component['showLeaving']()).toBe(true);

     vi.advanceTimersByTime(200);
     expect(component['showLeaving']()).toBe(false);

     vi.useRealTimers();
   });

   it('clears previous timeout when value changes quickly', () => {
     vi.useFakeTimers();

     fixture.componentRef.setInput('value', 4);
     fixture.detectChanges();

     fixture.componentRef.setInput('value', 8);
     fixture.detectChanges();
     expect(component['showLeaving']()).toBe(true);

     vi.advanceTimersByTime(100);

     fixture.componentRef.setInput('value', 12);
     fixture.detectChanges();

     vi.advanceTimersByTime(100);
     expect(component['showLeaving']()).toBe(true);

     vi.advanceTimersByTime(100);
     expect(component['showLeaving']()).toBe(false);

     vi.useRealTimers();
   });
 });
