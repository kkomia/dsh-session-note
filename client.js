/**
 * Session note (browser half).
 *
 * A small note card floats over the app frame beside the current conversation.
 * It stays put while the transcript scrolls, can be dragged anywhere inside the
 * window, and stores its text per Session in browser storage. The card is
 * registered into the documented root `shell.overlay` list slot, so plugin
 * unload removes exactly this card and its styles.
 */
window.__ModuleLoader__.load({
  id: 'dsh-session-note',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState, useSyncExternalStore } = React;

    const PKG = 'dsh-session-note';
    const NS = 'sessionNote';
    const SLOT_ID = PKG + ':session-note';
    const CSS_ID = PKG + '/session-note.css';
    const POSITION_KEY = 'dsh.session-note.v1.position';
    const TEXT_KEY_PREFIX = 'dsh.session-note.v1.text.';
    const CARD_WIDTH = 288;
    const CARD_HEIGHT = 300;
    const EDGE = 8;
    const RIGHT_GAP = 24;
    /** Clear the conversation header (76px) below the frame's reserved top strip. */
    const TOP_GAP = 88;

    const zh = {
      title: '会话便签',
      move: '拖动便签',
      label: '会话便签内容',
      placeholder: '可粘贴或输入多行便签，内容随当前会话保存。',
    };
    const en = {
      title: 'Session note',
      move: 'Move note',
      label: 'Session note text',
      placeholder: 'Paste or type a note here. It is saved with this session.',
    };

    const css = `
.dsh-session-note {
  position: fixed;
  z-index: 22;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: min(${CARD_WIDTH}px, calc(100vw - 32px));
  height: min(${CARD_HEIGHT}px, calc(100vh - 48px));
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.24));
  border-radius: var(--dsw-radius-lg, 12px);
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  box-shadow: var(--dsw-shadow-lv2, 0 8px 24px rgba(0, 0, 0, 0.16));
  color: var(--dsw-alias-label-primary, #1f1f1f);
  font-family: var(--dsw-font-family, inherit);
  font-size: var(--dsh-content-font-size, 14px);
  line-height: 1.6;
}
.dsh-session-note[data-dragging] {
  box-shadow: var(--dsw-shadow-lv3, 0 12px 32px rgba(0, 0, 0, 0.22));
}
.dsh-session-note__handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  padding: 8px 12px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1, rgba(127, 127, 127, 0.16));
  color: var(--dsw-alias-label-tertiary, #8a8a8a);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.dsh-session-note[data-dragging] .dsh-session-note__handle {
  cursor: grabbing;
}
.dsh-session-note__handle:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #4176e6));
  outline-offset: -2px;
}
.dsh-session-note__title {
  overflow: hidden;
  color: var(--dsw-alias-label-secondary, #5c5c5c);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-session-note__grip {
  flex-shrink: 0;
  color: var(--dsw-alias-label-tertiary, #8a8a8a);
}
.dsh-session-note__input {
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 10px 12px 14px;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: inherit;
  resize: none;
  overflow-y: auto;
}
.dsh-session-note__input::placeholder {
  color: var(--dsw-alias-label-tertiary, #8a8a8a);
}
.dsh-session-note__input:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #4176e6));
  outline-offset: -2px;
}
`;

    /** Read a JSON value from browser storage, tolerating disabled storage. */
    function readJson(key) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return null;
        const value = JSON.parse(raw);
        return value !== null && typeof value === 'object' ? value : null;
      } catch {
        return null;
      }
    }

    /** Write a JSON value to browser storage, tolerating disabled storage. */
    function writeJson(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* Storage is unavailable; the note still works for this page view. */
      }
    }

    /** Session-scoped note text. */
    function readText(sessionId) {
      try {
        return window.localStorage.getItem(TEXT_KEY_PREFIX + encodeURIComponent(sessionId)) ?? '';
      } catch {
        return '';
      }
    }

    function writeText(sessionId, text) {
      try {
        const key = TEXT_KEY_PREFIX + encodeURIComponent(sessionId);
        if (text === '') window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, text);
      } catch {
        /* Storage is unavailable; keep the in-memory value. */
      }
    }

    /** The window's reserved top strip, published by the frame as a CSS variable. */
    function topClearance() {
      try {
        const raw = window.getComputedStyle(document.documentElement).getPropertyValue('--dsh-frame-top-clearance');
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) && value > 0 ? value : 0;
      } catch {
        return 0;
      }
    }

    function viewportSize() {
      const root = document.documentElement;
      return {
        width: root.clientWidth || window.innerWidth || 0,
        height: root.clientHeight || window.innerHeight || 0,
      };
    }

    /** Keep the whole card inside the window, below the frame's top strip. */
    function clampPosition(x, y, width, height) {
      const viewport = viewportSize();
      const minY = Math.max(EDGE, topClearance() + EDGE);
      const maxX = Math.max(EDGE, viewport.width - width - EDGE);
      const maxY = Math.max(minY, viewport.height - height - EDGE);
      return {
        x: Math.min(Math.max(EDGE, Math.round(x)), maxX),
        y: Math.min(Math.max(minY, Math.round(y)), maxY),
      };
    }

    function defaultCardSize() {
      const viewport = viewportSize();
      return {
        width: Math.min(CARD_WIDTH, Math.max(160, viewport.width - 32)),
        height: Math.min(CARD_HEIGHT, Math.max(160, viewport.height - 48)),
      };
    }

    /** Restore the last dragged position, or open at the right edge of the window. */
    function initialPosition() {
      const size = defaultCardSize();
      const saved = readJson(POSITION_KEY);
      if (saved !== null && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        return clampPosition(saved.x, saved.y, size.width, size.height);
      }
      const viewport = viewportSize();
      return clampPosition(
        viewport.width - size.width - RIGHT_GAP,
        topClearance() + TOP_GAP,
        size.width,
        size.height,
      );
    }

    function GripIcon() {
      return h(
        'svg',
        {
          className: 'dsh-session-note__grip',
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          focusable: 'false',
        },
        [4, 8, 12].flatMap((y) =>
          [5, 11].map((x) => h('circle', { key: x + '-' + y, cx: x, cy: y, r: 1.2, fill: 'currentColor' })),
        ),
      );
    }

    /** The editable, session-scoped note body. Remounted per Session via its key. */
    function NoteBody({ sessionId, t }) {
      const [value, setValue] = useState(() => readText(sessionId));
      return h('textarea', {
        className: 'dsh-session-note__input',
        value,
        placeholder: t('placeholder'),
        'aria-label': t('label'),
        spellCheck: false,
        autoComplete: 'off',
        onChange: (event) => {
          const next = event.target.value;
          setValue(next);
          writeText(sessionId, next);
        },
        onKeyDown: (event) => {
          /* Keep typing inside the note: no page-level shortcut handling. */
          event.stopPropagation();
        },
      });
    }

    /**
     * Build the note card over the frame's overlay layer.
     * @param ctx - client root context (slots, locale, uiSession, layout).
     * @param t - the note's bound dictionary.
     */
    function createSessionNote(ctx, t) {
      const currentSession = ctx.uiSession.adapter.current;
      const panelInfo = ctx.layout.panelInfo;

      return function SessionNote() {
        const binding = useSyncExternalStore(
          currentSession.subscribe,
          currentSession.getSnapshot,
          currentSession.getSnapshot,
        );
        const panel = useSyncExternalStore(panelInfo.subscribe, panelInfo.getSnapshot, panelInfo.getSnapshot);

        const [position, setPosition] = useState(initialPosition);
        const [dragging, setDragging] = useState(false);
        const cardRef = useRef(null);
        const dragRef = useRef(null);

        useEffect(() => {
          const onResize = () => {
            const element = cardRef.current;
            const width = element === null ? defaultCardSize().width : element.offsetWidth;
            const height = element === null ? defaultCardSize().height : element.offsetHeight;
            setPosition((previous) => {
              const next = clampPosition(previous.x, previous.y, width, height);
              if (next.x === previous.x && next.y === previous.y) return previous;
              writeJson(POSITION_KEY, next);
              return next;
            });
          };
          window.addEventListener('resize', onResize);
          return () => window.removeEventListener('resize', onResize);
        }, []);

        const sessionId = binding !== null && binding !== undefined && typeof binding.key === 'string' ? binding.key : undefined;
        const activePanelId = panel === null || panel === undefined ? null : panel.activePanelId;
        const conversationVisible = activePanelId === null || activePanelId === undefined;

        const onPointerDown = (event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          const element = cardRef.current;
          if (element === null) return;
          const rect = element.getBoundingClientRect();
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: rect.left,
            originY: rect.top,
          };
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* Pointer capture is an enhancement; dragging still tracks this element. */
          }
          setDragging(true);
          event.preventDefault();
        };

        const onPointerMove = (event) => {
          const drag = dragRef.current;
          if (drag === null || drag.pointerId !== event.pointerId) return;
          const element = cardRef.current;
          const width = element === null ? defaultCardSize().width : element.offsetWidth;
          const height = element === null ? defaultCardSize().height : element.offsetHeight;
          const next = clampPosition(
            drag.originX + event.clientX - drag.startX,
            drag.originY + event.clientY - drag.startY,
            width,
            height,
          );
          setPosition((previous) =>
            previous.x === next.x && previous.y === next.y ? previous : next,
          );
        };

        const finishDrag = (event) => {
          const drag = dragRef.current;
          if (drag === null || drag.pointerId !== event.pointerId) return;
          commitDragEnd();
        };

        const commitDragEnd = () => {
          if (dragRef.current === null) return;
          dragRef.current = null;
          setDragging(false);
          const element = cardRef.current;
          if (element !== null) {
            const rect = element.getBoundingClientRect();
            writeJson(POSITION_KEY, { x: Math.round(rect.left), y: Math.round(rect.top) });
          }
        };

        useEffect(() => {
          if (!dragging) return undefined;
          const end = () => commitDragEnd();
          window.addEventListener('pointerup', end);
          window.addEventListener('pointercancel', end);
          return () => {
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
          };
        }, [dragging]);

        const onHandleKeyDown = (event) => {
          const step = event.shiftKey ? 48 : 16;
          let dx = 0;
          let dy = 0;
          if (event.key === 'ArrowLeft') dx = -step;
          else if (event.key === 'ArrowRight') dx = step;
          else if (event.key === 'ArrowUp') dy = -step;
          else if (event.key === 'ArrowDown') dy = step;
          else return;
          event.preventDefault();
          event.stopPropagation();
          const element = cardRef.current;
          const width = element === null ? defaultCardSize().width : element.offsetWidth;
          const height = element === null ? defaultCardSize().height : element.offsetHeight;
          setPosition((previous) => {
            const next = clampPosition(previous.x + dx, previous.y + dy, width, height);
            writeJson(POSITION_KEY, next);
            return next;
          });
        };

        if (sessionId === undefined || !conversationVisible) return null;

        return h(
          React.Fragment,
          null,
          h('style', { key: 'style', 'data-plugin-css': CSS_ID }, css),
          h(
            'div',
            {
              key: 'card',
              ref: cardRef,
              className: 'dsh-session-note',
              'data-dragging': dragging ? '' : undefined,
              style: { left: position.x + 'px', top: position.y + 'px' },
              role: 'region',
              'aria-label': t('title'),
            },
            h(
              'div',
              {
                className: 'dsh-session-note__handle',
                role: 'button',
                tabIndex: 0,
                'aria-label': t('move'),
                title: t('move'),
                onPointerDown,
                onPointerMove,
                onPointerUp: finishDrag,
                onPointerCancel: finishDrag,
                onLostPointerCapture: () => {
                  dragRef.current = null;
                  setDragging(false);
                },
                onKeyDown: onHandleKeyDown,
              },
              h(GripIcon),
              h('span', { className: 'dsh-session-note__title' }, t('title')),
            ),
            h(NoteBody, { key: sessionId, sessionId, t }),
          ),
        );
      };
    }

    return {
      inject: ['slots', 'locale', 'uiSession', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-note: dictionaries');
        const t = ctx.locale.bind(NS);
        const SessionNote = createSessionNote(ctx, t);
        ctx.effect(
          () =>
            ctx.slots.inject('shell.overlay', () =>
              ctx.slots.register(
                {
                  name: 'shell.overlay',
                  id: SLOT_ID,
                  order: 500,
                },
                SessionNote,
              ),
            ),
          'session-note: overlay card',
        );
      },
    };
  },
});
