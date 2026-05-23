import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PairCardComponent } from './pair-card.component';

describe('PairCardComponent', () => {
  let component: PairCardComponent;
  let fixture: ComponentFixture<PairCardComponent>;

  const mockPair = {
    id: 1,
    player1: { id: 1, name: 'Luis', position: 'right' as const },
    player2: { id: 2, name: 'Pablo', position: 'backhand' as const },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PairCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PairCardComponent);
    component = fixture.componentRef.instance;
    fixture.componentRef.setInput('pair', mockPair);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  it('renders pair badge', () => {
    const badge = fixture.nativeElement.querySelector('.pair-badge');
    expect(badge.textContent.trim()).toBe('Pareja 1');
  });

  it('renders both player names', () => {
    const inputs: HTMLInputElement[] = fixture.nativeElement.querySelectorAll('input');
    expect(inputs[0].value).toBe('Luis');
    expect(inputs[1].value).toBe('Pablo');
  });

  it('emits pairChange on player 2 name edit', () => {
    const spy = vi.fn();
    component.pairChange.subscribe(spy);

    const inputs: HTMLInputElement[] = fixture.nativeElement.querySelectorAll('input');
    inputs[1].value = 'Marcos';
    inputs[1].dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith({
      pairId: 1,
      playerId: 2,
      name: 'Marcos',
    });
  });

  it('emits pairChange on position change', () => {
    const spy = vi.fn();
    component.pairChange.subscribe(spy);

    const selects: HTMLSelectElement[] = fixture.nativeElement.querySelectorAll('select');
    selects[0].value = 'backhand';
    selects[0].dispatchEvent(new Event('change'));

    expect(spy).toHaveBeenCalledWith({
      pairId: 1,
      playerId: 1,
      position: 'backhand',
    });
  });
});
