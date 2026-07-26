import { TestBed } from '@angular/core/testing';
import { provideTaiga } from '@taiga-ui/core';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
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
      imports: [App],
      providers: [provideTaiga()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the home screen with Word Play branding', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Word Play');
    expect(compiled.textContent).toContain('Classic');
    expect(compiled.textContent).toContain('Daily word');
    expect(compiled.textContent).toContain('Statistics');
  });
});
