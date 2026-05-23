import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card.component';
import { Player } from '../../../../shared/models/player.model';

describe('PlayerCardComponent', () => {
  let component: PlayerCardComponent;
  let fixture: ComponentFixture<PlayerCardComponent>;

  const mockPlayer: Player = { id: 1, name: 'Carlos', position: 'right' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCardComponent);
    component = fixture.componentRef.instance;
    fixture.componentRef.setInput('player', mockPlayer);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
  });

  function getNameInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  it('renders the player name in input', () => {
    expect(getNameInput().value).toBe('Carlos');
  });

  it('shows initials', () => {
    const initials = fixture.nativeElement.querySelector('.player-initials');
    expect(initials.textContent.trim()).toBe('C');
  });

  it('shows fallback initials for index-based name', () => {
    fixture.componentRef.setInput('player', {
      id: 5,
      name: 'Jugador 5',
      position: 'either',
    });
    fixture.componentRef.setInput('index', 2);
    fixture.detectChanges();
    const initials = fixture.nativeElement.querySelector('.player-initials');
    expect(initials.textContent.trim()).toBe('J3');
  });

  it('emits playerChange on name input', () => {
    const spy = vi.fn();
    component.playerChange.subscribe(spy);

    getNameInput().value = 'Ana';
    getNameInput().dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith({ id: 1, name: 'Ana' });
  });

  it('emits playerChange on position tab click', () => {
    const spy = vi.fn();
    component.playerChange.subscribe(spy);

    const tabs = fixture.nativeElement.querySelectorAll('.position-tab');
    tabs[2].click();
    expect(spy).toHaveBeenCalledWith({ id: 1, position: 'backhand' });
  });

  it('highlights active position tab', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.position-tab');
    expect(tabs[1].classList.contains('active')).toBe(true);
  });
});
