import { TestBed } from '@angular/core/testing';
import { provideTaiga } from '@taiga-ui/core';

import { SettingsPanel } from './settings-panel';

describe('SettingsPanel', () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('word-play-locale', 'en');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [SettingsPanel],
      providers: [provideTaiga()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('starts on the game tab and switches to app settings', async () => {
    const fixture = TestBed.createComponent(SettingsPanel);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = fixture.componentInstance;
    expect(panel.tab()).toBe('game');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Difficulty');
    expect(compiled.textContent).toContain('Word language');
    expect(compiled.textContent).not.toContain('Interface language');

    panel.selectTab('system');
    fixture.detectChanges();

    expect(panel.tab()).toBe('system');
    expect(compiled.textContent).toContain('Interface language');
    expect(compiled.textContent).toContain('Theme');
    expect(compiled.textContent).not.toContain('Difficulty');
  });

  it('updates difficulty from the game tab', async () => {
    const fixture = TestBed.createComponent(SettingsPanel);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = fixture.componentInstance;
    panel.selectDifficulty('hard');
    expect(panel.difficulty()).toBe('hard');
  });
});
