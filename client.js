window.__ModuleLoader__.load({
  id: '@local/task-completion-notify',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // ------------------------------------------------------------------
    // Toast store (module scope: one per client run)
    // ------------------------------------------------------------------
    const TOAST_LIFETIME_MS = 6000;
    const MAX_TOASTS = 3;

    let toasts = new Map();
    let toastSeq = 0;
    const toastListeners = new Set();
    const timerDisposers = new Map();

    function publishToasts(label) {
      for (const listener of [...toastListeners]) {
        try {
          listener(label);
        } catch {
          // A crashing subscriber must not break the notification path.
        }
      }
    }

    function dismissToast(id) {
      if (!toasts.has(id)) return;
      toasts = new Map(toasts);
      toasts.delete(id);
      const dispose = timerDisposers.get(id);
      if (dispose !== undefined) {
        timerDisposers.delete(id);
        dispose();
      }
      publishToasts('dismiss');
    }

    function scheduleTimeout(ctx, fn, ms) {
      const timer = ctx.get('timer');
      if (timer !== undefined && timer.timeout !== undefined) return timer.timeout(fn, ms);
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    }

    function addToast(ctx, sessionId, title) {
      toastSeq += 1;
      const id = `tcn-${toastSeq}`;
      const now = Date.now();
      toasts = new Map(toasts);
      toasts.set(id, { id, sessionId, title, createdAt: now });
      while (toasts.size > MAX_TOASTS) {
        const oldest = toasts.keys().next().value;
        dismissToast(oldest);
      }
      timerDisposers.set(id, scheduleTimeout(ctx, () => dismissToast(id), TOAST_LIFETIME_MS));
      playChime();
      publishToasts('add');
    }

    function clearAllTimers() {
      for (const dispose of [...timerDisposers.values()]) {
        try {
          dispose();
        } catch {
          // ignore
        }
      }
      timerDisposers.clear();
    }

    // ------------------------------------------------------------------
    // Chime: a two-note completion tone synthesized with Web Audio, so the
    // bundle ships no audio asset.
    // ------------------------------------------------------------------
    let audioCtx = null;
    function playChime() {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (typeof Ctor === 'undefined') return;
        if (audioCtx === null) audioCtx = new Ctor();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        const start = audioCtx.currentTime + 0.03;
        const master = audioCtx.createGain();
        master.gain.value = 0.9;
        master.connect(audioCtx.destination);
        const notes = [
          { frequency: 659.25, offset: 0, duration: 0.4 }, // E5
          { frequency: 880.0, offset: 0.16, duration: 0.55 }, // A5
        ];
        for (const note of notes) {
          const oscillator = audioCtx.createOscillator();
          const envelope = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = note.frequency;
          const at = start + note.offset;
          envelope.gain.setValueAtTime(0.0001, at);
          envelope.gain.exponentialRampToValueAtTime(0.2, at + 0.025);
          envelope.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);
          oscillator.connect(envelope);
          envelope.connect(master);
          oscillator.start(at);
          oscillator.stop(at + note.duration + 0.05);
        }
      } catch {
        // Audio unavailable (autoplay policy or missing API): stay silent.
      }
    }

    // ------------------------------------------------------------------
    // Locale copy
    // ------------------------------------------------------------------
    const FALLBACK = { title: 'Task complete', dismiss: 'Dismiss' };
    function translate(locale, key) {
      try {
        const value = locale.bind('taskCompletion')(key);
        if (typeof value === 'string' && value !== '') return value;
      } catch {
        // fall through to the English fallback
      }
      return FALLBACK[key];
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------
    const CSS = [
      '.tcn-stack{position:fixed;right:16px;bottom:24px;z-index:1000;display:flex;flex-direction:column;gap:8px;pointer-events:auto}',
      '.tcn-card{display:flex;align-items:flex-start;gap:10px;min-width:240px;max-width:340px;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);box-shadow:0 8px 24px rgba(0,0,0,.18);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.45;cursor:pointer}',
      '.tcn-icon{flex:0 0 auto;display:block;margin-top:1px}',
      '.tcn-body{flex:1 1 auto;min-width:0}',
      '.tcn-title{font-weight:600}',
      '.tcn-sub{margin-top:2px;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.tcn-close{flex:0 0 auto;width:22px;height:22px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;cursor:pointer;padding:0}',
      '.tcn-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
    ].join('\n');

    function CheckIcon() {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 20,
        height: 20,
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('circle', { cx: 12, cy: 12, r: 10, fill: 'var(--dsw-alias-state-success-primary)' }),
        h('path', {
          d: 'M7.5 12.5l3 3 6-6.5',
          fill: 'none',
          stroke: 'var(--dsw-alias-bg-base)',
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
      );
    }

    function apply(ctx) {
      const locale = ctx.get('locale');
      const sessions = ctx.sessions;
      if (locale !== undefined) {
        ctx.effect(
          () =>
            locale.register('taskCompletion', {
              en: { title: 'Task complete', dismiss: 'Dismiss' },
              zh: { title: '任务完成', dismiss: '关闭' },
            }),
          'task-completion-notify: locale dictionary',
        );
      }

      // Completion detection: the session list rows carry `running` and are
      // republished by the Controller on every baseline change and live
      // status event, so a running -> idle transition on a row is exactly
      // "a task ended".
      const list = sessions.list;
      const running = new Map();

      const rowTitle = (sessionId) => {
        const row = list.getSnapshot().byId[sessionId];
        if (row !== undefined) {
          if (typeof row.displayTitle === 'string' && row.displayTitle !== '') return row.displayTitle;
          if (typeof row.title === 'string' && row.title !== '') return row.title;
        }
        return String(sessionId);
      };

      ctx.effect(
        () => {
          const disposeList = list.subscribe(() => {
            const snapshot = list.getSnapshot();
            const present = new Set();
            for (const id of snapshot.ids) {
              present.add(id);
              const row = snapshot.byId[id];
              const now = row !== undefined && row.running === true;
              const prev = running.get(id);
              if (prev === undefined) {
                running.set(id, now);
              } else if (prev !== now) {
                running.set(id, now);
                if (now === false) addToast(ctx, id, rowTitle(id));
              }
            }
            if (snapshot.phase === 'ready') {
              for (const id of [...running.keys()]) {
                if (!present.has(id)) running.delete(id);
              }
            }
          });
          return () => {
            disposeList();
            clearAllTimers();
            running.clear();
          };
        },
        'task-completion-notify: session running transitions',
      );

      function ToastStack() {
        const [, force] = React.useState(0);
        React.useEffect(() => {
          const update = () => force((n) => n + 1);
          toastListeners.add(update);
          update();
          let disposeLocale = () => {};
          if (locale !== undefined) disposeLocale = locale.subscribe(update);
          return () => {
            toastListeners.delete(update);
            disposeLocale();
          };
        }, []);
        const t = (key) => (locale !== undefined ? translate(locale, key) : FALLBACK[key]);
        const items = [...toasts.values()];
        return h(
          React.Fragment,
          null,
          h('style', { 'data-tcn-styles': true }, CSS),
          h('div', { className: 'tcn-stack', role: 'status', 'aria-live': 'polite' },
            items.map((toast) =>
              h(
                'div',
                {
                  key: toast.id,
                  className: 'tcn-card',
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => dismissToast(toast.id),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter' || event.key === ' ') dismissToast(toast.id);
                  },
                },
                h('span', { className: 'tcn-icon', 'aria-hidden': true }, CheckIcon()),
                h('div', { className: 'tcn-body' },
                  h('div', { className: 'tcn-title' }, t('title')),
                  h('div', { className: 'tcn-sub' }, toast.title),
                ),
                h('button', {
                  type: 'button',
                  className: 'tcn-close',
                  'aria-label': t('dismiss'),
                  onClick: (event) => {
                    event.stopPropagation();
                    dismissToast(toast.id);
                  },
                },
                  '×',
                ),
              ),
            ),
          ),
        );
      }

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'task-completion-notify',
            order: 10,
          },
          ToastStack,
        ),
      );
    }

    return {
      inject: ['slots', 'sessions'],
      apply,
    };
  },
});
