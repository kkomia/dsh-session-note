/**
 * Session note (browser half).
 *
 * A small note card floats over the app frame beside the current conversation.
 * It stays put while the transcript scrolls, can be dragged and resized
 * anywhere inside the window, and stores its text per Session in browser
 * storage. The card is registered into the documented root `shell.overlay`
 * list slot, so plugin unload removes exactly this card and its styles.
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
    const SIZE_KEY = 'dsh.session-note.v1.size';
    const MINIMIZED_KEY = 'dsh.session-note.v1.minimized';
    const TEXT_KEY_PREFIX = 'dsh.session-note.v1.text.';
    const CARD_WIDTH = 288;
    const CARD_HEIGHT = 300;
    const MIN_WIDTH = 220;
    const MIN_HEIGHT = 180;
    const EDGE = 8;
    const RIGHT_GAP = 24;
    /** Clear the conversation header (76px) below the frame's reserved top strip. */
    const TOP_GAP = 88;

    const zh = {
      title: '会话便签',
      move: '拖动便签',
      resize: '调整大小',
      minimize: '最小化便签',
      restore: '展开便签',
      label: '会话便签内容',
      placeholder: '可粘贴或输入多行便签，内容随当前会话保存。',
    };
    const en = {
      title: 'Session note',
      move: 'Move note',
      resize: 'Resize note',
      minimize: 'Minimize note',
      restore: 'Expand note',
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
  flex: 1;
  min-width: 0;
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
.dsh-session-note__minimize {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin: 0 -6px 0 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8a8a8a);
  cursor: pointer;
}
.dsh-session-note__minimize:hover {
  background: var(--dsw-alias-bg-layer-1, rgba(127, 127, 127, 0.12));
  color: var(--dsw-alias-label-secondary, #5c5c5c);
}
.dsh-session-note__minimize:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #4176e6));
  outline-offset: 1px;
}
.dsh-session-note[data-minimized] .dsh-session-note__input {
  display: none;
}
.dsh-session-note__input {
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 10px 12px 20px;
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
.dsh-session-note__resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  cursor: nwse-resize;
  touch-action: none;
}
.dsh-session-note__resize::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid var(--dsw-alias-label-tertiary, #8a8a8a);
  border-bottom: 1.5px solid var(--dsw-alias-label-tertiary, #8a8a8a);
}
.dsh-session-note__resize:focus-visible {
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

    /** Read a boolean flag from browser storage, tolerating disabled storage. */
    function readFlag(key) {
      try {
        return window.localStorage.getItem(key) === '1';
      } catch {
        return false;
      }
    }

    /** Persist a boolean flag, tolerating disabled storage. */
    function writeFlag(key, value) {
      try {
        if (value) window.localStorage.setItem(key, '1');
        else window.localStorage.removeItem(key);
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

    /** Keep the requested card size inside the window and above the minimums. */
    function clampSize(width, height) {
      const viewport = viewportSize();
      const maxWidth = Math.max(MIN_WIDTH, viewport.width - EDGE * 2);
      const maxHeight = Math.max(MIN_HEIGHT, viewport.height - topClearance() - EDGE * 2);
      return {
        width: Math.min(Math.max(MIN_WIDTH, Math.round(width)), maxWidth),
        height: Math.min(Math.max(MIN_HEIGHT, Math.round(height)), maxHeight),
      };
    }

    /** Restore the last saved size, or fall back to the default card size. */
    function initialSize() {
      const saved = readJson(SIZE_KEY);
      const size =
        saved !== null && Number.isFinite(saved.width) && Number.isFinite(saved.height)
          ? { width: saved.width, height: saved.height }
          : defaultCardSize();
      return clampSize(size.width, size.height);
    }

    /** Restore the last dragged position, or open at the right edge of the window. */
    function initialPosition(width, height) {
      const saved = readJson(POSITION_KEY);
      if (saved !== null && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        return clampPosition(saved.x, saved.y, width, height);
      }
      const viewport = viewportSize();
      return clampPosition(viewport.width - width - RIGHT_GAP, topClearance() + TOP_GAP, width, height);
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

    /** The minimize/restore chevron shown at the right of the title bar. */
    function MinimizeIcon({ collapsed }) {
      return h(
        'svg',
        {
          className: 'dsh-session-note__minimize-icon',
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          'aria-hidden': 'true',
          focusable: 'false',
        },
        collapsed
          ? h('path', {
              d: 'M4 10l4-4 4 4',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.6,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            })
          : h('path', {
              d: 'M4 8h8',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.6,
              strokeLinecap: 'round',
            }),
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

        const sessionId =
          binding !== null && binding !== undefined && typeof binding.key === 'string' ? binding.key : undefined;
        const activePanelId = panel === null || panel === undefined ? null : panel.activePanelId;
        const conversationVisible = activePanelId === null || activePanelId === undefined;

        const [initial] = useState(() => {
          const size = initialSize();
          return { size, position: initialPosition(size.width, size.height) };
        });
        const [size, setSize] = useState(initial.size);
        const [position, setPosition] = useState(initial.position);
        const [dragging, setDragging] = useState(false);
        const [resizing, setResizing] = useState(false);
        const [minimized, setMinimized] = useState(() => readFlag(MINIMIZED_KEY));
        const cardRef = useRef(null);
        const dragRef = useRef(null);
        const resizeRef = useRef(null);
        const sizeRef = useRef(size);
        const positionRef = useRef(position);
        const minimizedRef = useRef(minimized);
        sizeRef.current = size;
        positionRef.current = position;
        minimizedRef.current = minimized;

        /* Re-fit the card after the window changes size. */
        useEffect(() => {
          const onWindowResize = () => {
            const element = cardRef.current;
            let width = sizeRef.current.width;
            let height = sizeRef.current.height;
            if (!minimizedRef.current) {
              const nextSize = clampSize(sizeRef.current.width, sizeRef.current.height);
              width = nextSize.width;
              height = nextSize.height;
              if (nextSize.width !== sizeRef.current.width || nextSize.height !== sizeRef.current.height) {
                sizeRef.current = nextSize;
                setSize(nextSize);
                writeJson(SIZE_KEY, nextSize);
              }
            } else if (element !== null) {
              height = element.offsetHeight;
            }
            const nextPosition = clampPosition(positionRef.current.x, positionRef.current.y, width, height);
            if (nextPosition.x !== positionRef.current.x || nextPosition.y !== positionRef.current.y) {
              positionRef.current = nextPosition;
              setPosition(nextPosition);
              writeJson(POSITION_KEY, nextPosition);
            }
          };
          window.addEventListener('resize', onWindowResize);
          return () => window.removeEventListener('resize', onWindowResize);
        }, []);

        /* Keep the card on screen when it collapses or expands. */
        useEffect(() => {
          const element = cardRef.current;
          if (element === null) return;
          if (minimized) {
            const nextPosition = clampPosition(
              positionRef.current.x,
              positionRef.current.y,
              element.offsetWidth,
              element.offsetHeight,
            );
            if (nextPosition.x !== positionRef.current.x || nextPosition.y !== positionRef.current.y) {
              positionRef.current = nextPosition;
              setPosition(nextPosition);
              writeJson(POSITION_KEY, nextPosition);
            }
            return;
          }
          const nextSize = clampSize(sizeRef.current.width, sizeRef.current.height);
          if (nextSize.width !== sizeRef.current.width || nextSize.height !== sizeRef.current.height) {
            sizeRef.current = nextSize;
            setSize(nextSize);
            writeJson(SIZE_KEY, nextSize);
          }
          const nextPosition = clampPosition(
            positionRef.current.x,
            positionRef.current.y,
            nextSize.width,
            nextSize.height,
          );
          if (nextPosition.x !== positionRef.current.x || nextPosition.y !== positionRef.current.y) {
            positionRef.current = nextPosition;
            setPosition(nextPosition);
            writeJson(POSITION_KEY, nextPosition);
          }
        }, [minimized]);

        const toggleMinimized = () => {
          const next = !minimizedRef.current;
          minimizedRef.current = next;
          setMinimized(next);
          writeFlag(MINIMIZED_KEY, next);
        };

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
          const width = element === null ? sizeRef.current.width : element.offsetWidth;
          const height = element === null ? sizeRef.current.height : element.offsetHeight;
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

        const onResizePointerDown = (event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          const element = cardRef.current;
          if (element === null) return;
          resizeRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startWidth: element.offsetWidth,
            startHeight: element.offsetHeight,
          };
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* Pointer capture is an enhancement; resizing still tracks this element. */
          }
          setResizing(true);
          event.preventDefault();
          event.stopPropagation();
        };

        const onResizePointerMove = (event) => {
          const drag = resizeRef.current;
          if (drag === null || drag.pointerId !== event.pointerId) return;
          const nextSize = clampSize(
            drag.startWidth + event.clientX - drag.startX,
            drag.startHeight + event.clientY - drag.startY,
          );
          const nextPosition = clampPosition(
            positionRef.current.x,
            positionRef.current.y,
            nextSize.width,
            nextSize.height,
          );
          sizeRef.current = nextSize;
          positionRef.current = nextPosition;
          setSize(nextSize);
          setPosition(nextPosition);
        };

        const finishResize = (event) => {
          const drag = resizeRef.current;
          if (drag === null || drag.pointerId !== event.pointerId) return;
          commitResize();
        };

        const commitResize = () => {
          if (resizeRef.current === null) return;
          resizeRef.current = null;
          setResizing(false);
          writeJson(SIZE_KEY, { width: sizeRef.current.width, height: sizeRef.current.height });
          writeJson(POSITION_KEY, { x: positionRef.current.x, y: positionRef.current.y });
        };

        const onResizeHandleKeyDown = (event) => {
          const step = event.shiftKey ? 48 : 16;
          let dw = 0;
          let dh = 0;
          if (event.key === 'ArrowRight') dw = step;
          else if (event.key === 'ArrowLeft') dw = -step;
          else if (event.key === 'ArrowDown') dh = step;
          else if (event.key === 'ArrowUp') dh = -step;
          else return;
          event.preventDefault();
          event.stopPropagation();
          const nextSize = clampSize(sizeRef.current.width + dw, sizeRef.current.height + dh);
          const nextPosition = clampPosition(
            positionRef.current.x,
            positionRef.current.y,
            nextSize.width,
            nextSize.height,
          );
          sizeRef.current = nextSize;
          positionRef.current = nextPosition;
          setSize(nextSize);
          setPosition(nextPosition);
          writeJson(SIZE_KEY, nextSize);
          writeJson(POSITION_KEY, nextPosition);
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

        useEffect(() => {
          if (!resizing) return undefined;
          const end = () => commitResize();
          window.addEventListener('pointerup', end);
          window.addEventListener('pointercancel', end);
          return () => {
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
          };
        }, [resizing]);

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
          const width = element === null ? sizeRef.current.width : element.offsetWidth;
          const height = element === null ? sizeRef.current.height : element.offsetHeight;
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
              'data-minimized': minimized ? '' : undefined,
              style: {
                left: position.x + 'px',
                top: position.y + 'px',
                width: size.width + 'px',
                height: minimized ? undefined : size.height + 'px',
              },
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
              h(
                'button',
                {
                  key: 'minimize',
                  type: 'button',
                  className: 'dsh-session-note__minimize',
                  'aria-label': minimized ? t('restore') : t('minimize'),
                  'aria-expanded': minimized ? 'false' : 'true',
                  title: minimized ? t('restore') : t('minimize'),
                  onPointerDown: (event) => {
                    event.stopPropagation();
                  },
                  onClick: (event) => {
                    event.stopPropagation();
                    toggleMinimized();
                  },
                  onKeyDown: (event) => {
                    event.stopPropagation();
                  },
                },
                h(MinimizeIcon, { collapsed: minimized }),
              ),
            ),
            h(NoteBody, { key: sessionId, sessionId, t }),
            minimized
              ? null
              : h('div', {
                  key: 'resize',
                  className: 'dsh-session-note__resize',
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': t('resize'),
                  title: t('resize'),
                  onPointerDown: onResizePointerDown,
                  onPointerMove: onResizePointerMove,
                  onPointerUp: finishResize,
                  onPointerCancel: finishResize,
                  onLostPointerCapture: () => {
                    resizeRef.current = null;
                    setResizing(false);
                  },
                  onKeyDown: onResizeHandleKeyDown,
                }),
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
