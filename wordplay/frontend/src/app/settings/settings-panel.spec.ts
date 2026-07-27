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
    fixture.componentRef.setInput('initialTab', 'game');
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = fixture.componentInstance;
    expect(panel.tab()).toBe('game');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Word length');
    expect(compiled.textContent).toContain('Dictionary');
    expect(compiled.textContent).toContain('Attempts');
    expect(compiled.textContent).toContain('Word language');
    expect(compiled.textContent).not.toContain('App update');
    expect(compiled.textContent).not.toContain('Interface language');

    panel.selectTab('system');
    fixture.detectChanges();

    expect(panel.tab()).toBe('system');
    expect(compiled.textContent).toContain('App update');
    expect(compiled.textContent).toContain('Update now');
    expect(compiled.textContent).toContain('Interface language');
    expect(compiled.textContent).toContain('Theme');
    expect(compiled.textContent).not.toContain('Word length');
    expect(compiled.textContent).not.toContain('Dictionary');
    expect(compiled.textContent).not.toContain('Attempts');
  });

  it('opens on the app tab when requested', async () => {
    const fixture = TestBed.createComponent(SettingsPanel);
    fixture.componentRef.setInput('initialTab', 'system');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.tab()).toBe('system');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('App update');
  });

  it('updates dictionary and attempts from the game tab', async () => {
    const fixture = TestBed.createComponent(SettingsPanel);
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = fixture.componentInstance;
    panel.selectWordTier('hard');
    panel.selectDifficulty('hard');
    expect(panel.wordTier()).toBe('hard');
    expect(panel.difficulty()).toBe('hard');
  });

  it('keeps classic difficulty settings visible after a daily session', async () => {
    localStorage.setItem('word-play-game-mode', 'daily');
    const fixture = TestBed.createComponent(SettingsPanel);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dictionary');
    expect(compiled.textContent).toContain('Attempts');
    expect(compiled.textContent).toContain('Word length, dictionary, difficulty');
  });
});
