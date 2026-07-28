import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Keyboard } from './keyboard';

describe('Keyboard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  function createKeyboard(): {
    keyboard: Keyboard;
    host: HTMLElement;
    fixture: ReturnType<typeof TestBed.createComponent<Keyboard>>;
  } {
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
    return { keyboard: fixture.componentInstance, host, fixture };
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

  it('updates the floating letter while sliding across keys', () => {
    const { keyboard, host, fixture } = createKeyboard();
    const board = host.querySelector('.keyboard')!;
    const startTarget = board.querySelector('[data-key="a"]')!;
    const midTarget = board.querySelector('[data-key="s"]')!;
    const liftTarget = board.querySelector('[data-key="d"]')!;
    const emitted: string[] = [];
    keyboard.letter.subscribe((value) => {
      emitted.push(value);
    });

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      writable: true,
      value: vi
        .fn()
        .mockReturnValueOnce(startTarget)
        .mockReturnValueOnce(midTarget)
        .mockReturnValueOnce(null)
        .mockReturnValue(liftTarget),
    });

    const keyRect: DOMRect = {
      left: 40,
      top: 20,
      right: 70,
      bottom: 70,
      width: 30,
      height: 50,
      x: 40,
      y: 20,
      toJSON: () => ({}),
    };

    const boardRect: DOMRect = {
      left: 0,
      top: 0,
      right: 300,
      bottom: 200,
      width: 300,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };

    for (const el of [startTarget, midTarget, liftTarget]) {
      (el as HTMLElement).getBoundingClientRect = () => keyRect;
    }
    (board as HTMLElement).getBoundingClientRect = () => boardRect;

    keyboard.onPointerDown(
      new PointerEvent('pointerdown', {
        pointerId: 3,
        pointerType: 'touch',
        clientX: 10,
        clientY: 10,
        bubbles: true,
      }),
    );
    fixture.detectChanges();
    expect(keyboard.popup()?.key).toBe('a');
    expect(keyboard.isPressed('a')).toBe(true);

    keyboard.onPointerMove(
      new PointerEvent('pointermove', {
        pointerId: 3,
        pointerType: 'touch',
        clientX: 40,
        clientY: 10,
        bubbles: true,
      }),
    );
    fixture.detectChanges();
    expect(keyboard.popup()?.key).toBe('s');
    expect(keyboard.isPressed('s')).toBe(true);

    // Gap between keys keeps the previous floating letter.
    keyboard.onPointerMove(
      new PointerEvent('pointermove', {
        pointerId: 3,
        pointerType: 'touch',
        clientX: 55,
        clientY: 10,
        bubbles: true,
      }),
    );
    fixture.detectChanges();
    expect(keyboard.popup()?.key).toBe('s');

    keyboard.onPointerUp(
      new PointerEvent('pointerup', {
        pointerId: 3,
        pointerType: 'touch',
        clientX: 70,
        clientY: 10,
        bubbles: true,
      }),
    );
    fixture.detectChanges();
    expect(emitted).toEqual(['d']);
    expect(keyboard.popup()).toBeNull();
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
