import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Keyboard } from './keyboard';

describe('Keyboard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function createKeyboard(): { keyboard: Keyboard; host: HTMLElement } {
    TestBed.configureTestingModule({ imports: [Keyboard] });
    const fixture = TestBed.createComponent(Keyboard);
    fixture.componentRef.setInput('locale', 'en');
    fixture.componentRef.setInput('gameLanguage', 'en');
    fixture.componentRef.setInput('keyStatuses', {});
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    host.setPointerCapture = () => {
      /* jsdom stub */
    };
    host.releasePointerCapture = () => {
      /* jsdom stub */
    };
    return { keyboard: fixture.componentInstance, host };
  }

  it('emits the letter under the finger on pointer up', () => {
    const { keyboard, host } = createKeyboard();
    const emitted: string[] = [];
    keyboard.letter.subscribe((value) => {
      emitted.push(value);
    });

    const startTarget = document.createElement('button');
    startTarget.dataset['key'] = 'a';
    host.appendChild(startTarget);
    const liftTarget = document.createElement('button');
    liftTarget.dataset['key'] = 's';
    host.appendChild(liftTarget);

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValueOnce(startTarget).mockReturnValue(liftTarget),
    });
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });

    keyboard.onPointerDown(
      new PointerEvent('pointerdown', {
        pointerId: 7,
        pointerType: 'touch',
        clientX: 10,
        clientY: 10,
        bubbles: true,
      }),
    );

    keyboard.onPointerUp(
      new PointerEvent('pointerup', {
        pointerId: 7,
        pointerType: 'touch',
        clientX: 20,
        clientY: 10,
        bubbles: true,
      }),
    );

    expect(emitted).toEqual(['s']);
    expect(vibrate).toHaveBeenCalled();
  });

  it('ignores mouse pointer tracking and keeps click path', () => {
    const { keyboard } = createKeyboard();
    const emitted: string[] = [];
    keyboard.letter.subscribe((value) => {
      emitted.push(value);
    });

    keyboard.onPointerDown(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 1,
        clientY: 1,
        bubbles: true,
      }),
    );
    expect(keyboard.isPressed('q')).toBe(false);

    keyboard.onLetterClick('q', new Event('click'));
    expect(emitted).toEqual(['q']);
  });
});
