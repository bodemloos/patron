/**
 * Patronize loader — drop-in script that pins the Patronize reservation
 * widget to the bottom-right of any website.
 *
 * Usage:
 *   <script src="https://your-patron-domain/patronize.js" defer></script>
 *
 * The script creates a fixed-position iframe sized to fit the launcher
 * pill (~280×64). When the iframe posts a `{source:'patronize', type:
 * 'state', state:'open'}` message, the iframe is grown to fit the
 * booking panel. On close it shrinks back. No CSS leaks into the host
 * page — the iframe isolates everything.
 *
 * Customization (all optional, set on the <script> tag):
 *   data-api="https://api.example.com"   override the API origin
 *   data-position="left"                  pin to bottom-left instead
 *   data-z-index="9999"                   custom stacking
 */
(function () {
  // Guard against double-loads (e.g. if the host pastes the snippet twice).
  if (window.__PATRONIZE_LOADED__) return;
  window.__PATRONIZE_LOADED__ = true;

  var script = document.currentScript;
  var origin;
  try {
    origin = script ? new URL(script.src).origin : window.location.origin;
  } catch (e) {
    origin = window.location.origin;
  }

  // Read optional data-* config off the <script> tag.
  var ds = (script && script.dataset) || {};
  var apiOverride = ds.api || '';
  var position = (ds.position === 'left') ? 'left' : 'right';
  var zIndex = ds.zIndex || '2147483646';

  var SIZE_CLOSED = { w: 280, h: 64 };
  var SIZE_OPEN = { w: 440, h: 720 };

  function mount() {
    if (document.getElementById('__patronize_iframe__')) return;

    // Build the iframe URL. If the host explicitly overrode the API origin,
    // forward it via ?api so the widget JS knows where to point its fetches.
    var src = origin + '/patronize.html';
    if (apiOverride) src += '?api=' + encodeURIComponent(apiOverride);

    var iframe = document.createElement('iframe');
    iframe.id = '__patronize_iframe__';
    iframe.title = 'Make a reservation';
    iframe.src = src;
    iframe.allow = 'clipboard-write';
    iframe.style.cssText = [
      'position:fixed',
      'bottom:16px',
      position + ':16px',
      'width:' + SIZE_CLOSED.w + 'px',
      'height:' + SIZE_CLOSED.h + 'px',
      'max-width:calc(100vw - 32px)',
      'max-height:calc(100vh - 32px)',
      'border:0',
      'background:transparent',
      'color-scheme:normal',
      'z-index:' + zIndex,
      'transition:width 0.25s ease, height 0.25s ease',
    ].join(';');

    document.body.appendChild(iframe);

    function resize(state) {
      var s = state === 'open' ? SIZE_OPEN : SIZE_CLOSED;
      iframe.style.width = s.w + 'px';
      iframe.style.height = s.h + 'px';
    }

    window.addEventListener('message', function (e) {
      // Only listen to messages from our own iframe.
      if (e.source !== iframe.contentWindow) return;
      var d = e.data;
      if (!d || d.source !== 'patronize' || d.type !== 'state') return;
      resize(d.state);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
