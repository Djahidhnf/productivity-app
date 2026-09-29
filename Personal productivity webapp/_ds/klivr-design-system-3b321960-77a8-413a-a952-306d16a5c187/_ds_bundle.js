/* @ds-bundle: {"format":3,"namespace":"KlivrDesignSystem_3b3219","components":[{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data-display/Badge.jsx"},{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"Tag","sourcePath":"components/data-display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/data-display/Avatar.jsx":"7da4386b98dc","components/data-display/Badge.jsx":"db92776b1973","components/data-display/Card.jsx":"b4e441ef0679","components/data-display/Tag.jsx":"d5640f4a810b","components/feedback/Dialog.jsx":"81515dab103d","components/feedback/Toast.jsx":"b891aeadf59f","components/feedback/Tooltip.jsx":"b6b56f424a4c","components/forms/Button.jsx":"e6605a38e9d0","components/forms/Checkbox.jsx":"a341b368d5a4","components/forms/IconButton.jsx":"fad490758bcf","components/forms/Input.jsx":"150cfa350ab4","components/forms/Radio.jsx":"af815857c8da","components/forms/Select.jsx":"bfe372984d8c","components/forms/Switch.jsx":"de2b8b0bce0e","components/navigation/Tabs.jsx":"f61cba560810","ui_kits/dashboard/Panels.jsx":"e238c086abbc","ui_kits/marketing/Sections.jsx":"b6c6d263f714"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.KlivrDesignSystem_3b3219 = window.KlivrDesignSystem_3b3219 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data-display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-avatar{
  --_s:40px;
  position:relative; display:inline-flex; align-items:center; justify-content:center;
  width:var(--_s); height:var(--_s); flex:none;
  border-radius:var(--radius-pill); overflow:hidden;
  background:var(--accent-subtle); color:var(--accent-700);
  font-family:var(--font-display); font-weight:var(--weight-semibold); font-size:calc(var(--_s) * 0.4);
  user-select:none;
}
.klv-avatar img{ width:100%; height:100%; object-fit:cover; }
.klv-avatar--xs{ --_s:24px; }
.klv-avatar--sm{ --_s:32px; }
.klv-avatar--lg{ --_s:52px; }
.klv-avatar--xl{ --_s:72px; }
.klv-avatar--square{ border-radius:var(--radius-md); }
.klv-avatar__status{
  position:absolute; right:-1px; bottom:-1px;
  width:30%; height:30%; min-width:8px; min-height:8px;
  border-radius:50%; border:2px solid var(--surface);
}
.klv-avatar__status--online{ background:var(--success); }
.klv-avatar__status--busy{ background:var(--danger); }
.klv-avatar__status--away{ background:var(--warning); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-avatar-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-avatar-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}
function Avatar({
  src,
  name = '',
  size = 'md',
  square = false,
  status,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['klv-avatar', size !== 'md' && `klv-avatar--${size}`, square && 'klv-avatar--square', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials(name), status && /*#__PURE__*/React.createElement("span", {
    className: `klv-avatar__status klv-avatar__status--${status}`
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-badge{
  display:inline-flex; align-items:center; gap:var(--space-1);
  font-family:var(--font-sans); font-weight:var(--weight-semibold);
  font-size:var(--text-xs); line-height:1;
  padding:4px 9px; border-radius:var(--radius-pill);
  border:1px solid transparent; white-space:nowrap;
}
.klv-badge svg{ width:12px; height:12px; }
.klv-badge--dot::before{ content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
.klv-badge--neutral{ background:var(--surface-3); color:var(--text-secondary); border-color:var(--border); }
.klv-badge--accent{ background:var(--accent); color:var(--on-accent); }
.klv-badge--accent-soft{ background:var(--accent-subtle); color:var(--accent-700); }
.klv-badge--success{ background:var(--success-bg); color:var(--success); }
.klv-badge--warning{ background:var(--warning-bg); color:var(--warning); }
.klv-badge--danger{ background:var(--danger-bg); color:var(--danger); }
.klv-badge--info{ background:var(--info-bg); color:var(--info); }
.klv-badge--outline{ background:transparent; color:var(--text-secondary); border-color:var(--border-strong); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-badge-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-badge-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Badge({
  variant = 'neutral',
  dot = false,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['klv-badge', `klv-badge--${variant}`, dot && 'klv-badge--dot', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-card{
  display:flex; flex-direction:column;
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:var(--radius-2xl);
  overflow:hidden;
  transition:border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.klv-card--pad{ padding:var(--space-6); gap:var(--space-3); }
.klv-card--raised{ box-shadow:var(--shadow-md); border-color:transparent; }
.klv-card--interactive{ cursor:pointer; }
.klv-card--interactive:hover{ border-color:var(--border-strong); box-shadow:var(--shadow-lg); transform:translateY(-2px); }
.klv-card--accent{ border-color:transparent; box-shadow:var(--glow-accent); }
.klv-card__title{ font-family:var(--font-display); font-weight:var(--weight-semibold); font-size:var(--text-lg); color:var(--text-primary); letter-spacing:var(--tracking-tight); }
.klv-card__body{ font-family:var(--font-sans); font-size:var(--text-sm); color:var(--text-secondary); line-height:var(--leading-normal); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-card-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-card-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Card({
  variant = 'default',
  padded = true,
  interactive = false,
  title,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['klv-card', padded && 'klv-card--pad', variant !== 'default' && `klv-card--${variant}`, interactive && 'klv-card--interactive', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), title && /*#__PURE__*/React.createElement("div", {
    className: "klv-card__title"
  }, title), title ? /*#__PURE__*/React.createElement("div", {
    className: "klv-card__body"
  }, children) : children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-tag{
  display:inline-flex; align-items:center; gap:var(--space-1-5);
  font-family:var(--font-mono); font-size:var(--text-xs); font-weight:var(--weight-medium);
  padding:4px 8px; border-radius:var(--radius-sm);
  background:var(--surface-2); color:var(--text-secondary);
  border:1px solid var(--border);
}
.klv-tag svg{ width:13px; height:13px; }
.klv-tag__remove{
  display:inline-flex; align-items:center; justify-content:center;
  margin-right:-2px; width:15px; height:15px; border-radius:var(--radius-xs);
  border:none; background:transparent; color:var(--text-muted); cursor:pointer;
}
.klv-tag__remove:hover{ background:var(--surface-3); color:var(--text-primary); }
.klv-tag__remove svg{ width:11px; height:11px; }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-tag-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-tag-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Tag({
  icon = null,
  onRemove,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['klv-tag', className].filter(Boolean).join(' ')
  }, rest), icon, children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "klv-tag__remove",
    "aria-label": "Remove",
    onClick: onRemove
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
const CSS = `
.klv-dialog__overlay{
  position:fixed; inset:0; z-index:var(--z-modal);
  background:color-mix(in srgb, var(--neutral-1000) 55%, transparent);
  backdrop-filter:var(--blur-sm); -webkit-backdrop-filter:var(--blur-sm);
  display:flex; align-items:center; justify-content:center; padding:var(--space-6);
  animation:klv-fade var(--dur-base) var(--ease-out);
}
.klv-dialog{
  width:100%; max-width:480px; max-height:90vh; overflow:auto;
  background:var(--surface); color:var(--text-primary);
  border:1px solid var(--border);
  border-radius:var(--radius-2xl); box-shadow:var(--shadow-xl);
  display:flex; flex-direction:column;
  animation:klv-pop var(--dur-slow) var(--ease-spring);
}
.klv-dialog__head{ display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-4); padding:var(--space-6) var(--space-6) var(--space-3); }
.klv-dialog__title{ font-family:var(--font-display); font-weight:var(--weight-semibold); font-size:var(--text-xl); letter-spacing:var(--tracking-tight); }
.klv-dialog__close{
  flex:none; width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center;
  border:none; background:transparent; color:var(--text-muted); border-radius:var(--radius-sm); cursor:pointer;
}
.klv-dialog__close:hover{ background:var(--surface-3); color:var(--text-primary); }
.klv-dialog__close svg{ width:18px; height:18px; }
.klv-dialog__body{ padding:0 var(--space-6) var(--space-5); font-family:var(--font-sans); font-size:var(--text-sm); color:var(--text-secondary); line-height:var(--leading-normal); }
.klv-dialog__footer{ display:flex; gap:var(--space-3); justify-content:flex-end; padding:var(--space-4) var(--space-6) var(--space-6); }
@keyframes klv-fade{ from{ opacity:0 } to{ opacity:1 } }
@keyframes klv-pop{ from{ opacity:0; transform:translateY(8px) scale(.97) } to{ opacity:1; transform:none } }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-dialog-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-dialog-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Dialog({
  open,
  onClose,
  title,
  footer,
  children,
  className = ''
}) {
  ensureStyles();
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "klv-dialog__overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: ['klv-dialog', className].filter(Boolean).join(' '),
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "klv-dialog__head"
  }, title && /*#__PURE__*/React.createElement("h2", {
    className: "klv-dialog__title"
  }, title), /*#__PURE__*/React.createElement("button", {
    className: "klv-dialog__close",
    "aria-label": "Close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "klv-dialog__body"
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    className: "klv-dialog__footer"
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const CSS = `
.klv-toast{
  display:flex; align-items:flex-start; gap:var(--space-3);
  width:340px; max-width:calc(100vw - 32px);
  background:var(--surface); color:var(--text-primary);
  border:1px solid var(--border); border-left:3px solid var(--_accent, var(--accent));
  border-radius:var(--radius-lg); box-shadow:var(--shadow-lg);
  padding:var(--space-3) var(--space-4);
  font-family:var(--font-sans);
  animation:klv-toast-in var(--dur-slow) var(--ease-spring);
}
.klv-toast__icon{ flex:none; width:20px; height:20px; display:inline-flex; color:var(--_accent, var(--accent)); margin-top:1px; }
.klv-toast__icon svg{ width:20px; height:20px; }
.klv-toast__main{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.klv-toast__title{ font-size:var(--text-sm); font-weight:var(--weight-semibold); }
.klv-toast__desc{ font-size:var(--text-xs); color:var(--text-secondary); line-height:var(--leading-snug); }
.klv-toast__close{ flex:none; border:none; background:transparent; color:var(--text-muted); cursor:pointer; padding:2px; border-radius:var(--radius-xs); }
.klv-toast__close:hover{ color:var(--text-primary); background:var(--surface-3); }
.klv-toast__close svg{ width:14px; height:14px; }
.klv-toast--success{ --_accent:var(--success); }
.klv-toast--warning{ --_accent:var(--warning); }
.klv-toast--danger{ --_accent:var(--danger); }
.klv-toast--info{ --_accent:var(--info); }
@keyframes klv-toast-in{ from{ opacity:0; transform:translateX(12px) } to{ opacity:1; transform:none } }
`;
const ICONS = {
  default: /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }),
  success: /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }),
  warning: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
  })),
  danger: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "9",
    x2: "9",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "9",
    x2: "15",
    y2: "15"
  })),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "11",
    x2: "12",
    y2: "16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  }))
};
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-toast-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-toast-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Toast({
  variant = 'default',
  title,
  children,
  onClose,
  className = ''
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("div", {
    className: ['klv-toast', variant !== 'default' && `klv-toast--${variant}`, className].filter(Boolean).join(' '),
    role: "status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "klv-toast__icon"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, ICONS[variant] || ICONS.default)), /*#__PURE__*/React.createElement("div", {
    className: "klv-toast__main"
  }, title && /*#__PURE__*/React.createElement("span", {
    className: "klv-toast__title"
  }, title), children && /*#__PURE__*/React.createElement("span", {
    className: "klv-toast__desc"
  }, children)), onClose && /*#__PURE__*/React.createElement("button", {
    className: "klv-toast__close",
    "aria-label": "Dismiss",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
const CSS = `
.klv-tip-wrap{ position:relative; display:inline-flex; }
.klv-tip{
  position:absolute; z-index:var(--z-tooltip);
  background:var(--neutral-900); color:var(--neutral-50);
  font-family:var(--font-sans); font-size:var(--text-xs); font-weight:var(--weight-medium);
  padding:6px 9px; border-radius:var(--radius-sm); white-space:nowrap;
  box-shadow:var(--shadow-lg);
  opacity:0; pointer-events:none; transform:translate(var(--_tx,0), var(--_ty,4px));
  transition:opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
[data-theme="dark"] .klv-tip, .dark .klv-tip{ background:var(--neutral-800); border:1px solid var(--border); }
.klv-tip-wrap:hover .klv-tip, .klv-tip-wrap:focus-within .klv-tip{ opacity:1; transform:translate(var(--_tx,0),0); }
.klv-tip--top{ bottom:calc(100% + 8px); left:50%; --_tx:-50%; --_ty:4px; }
.klv-tip--bottom{ top:calc(100% + 8px); left:50%; --_tx:-50%; --_ty:-4px; }
.klv-tip--left{ right:calc(100% + 8px); top:50%; --_ty:-50%; --_tx:4px; }
.klv-tip--right{ left:calc(100% + 8px); top:50%; --_ty:-50%; --_tx:-4px; }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-tip-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-tip-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Tooltip({
  content,
  placement = 'top',
  children,
  className = ''
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("span", {
    className: ['klv-tip-wrap', className].filter(Boolean).join(' ')
  }, children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    className: `klv-tip klv-tip--${placement}`
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-btn{
  --_h: var(--control-md);
  font-family: var(--font-sans);
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
  line-height: 1;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  height: var(--_h);
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  transition: background var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out);
  user-select: none;
}
.klv-btn:focus-visible{ outline: none; box-shadow: var(--ring); }
.klv-btn:active{ transform: translateY(0.5px) scale(0.985); }
.klv-btn[disabled], .klv-btn[aria-disabled="true"]{ opacity: .5; pointer-events: none; }
.klv-btn svg{ width: 1.05em; height: 1.05em; flex: none; }

/* sizes */
.klv-btn--sm{ --_h: var(--control-sm); font-size: var(--text-xs); padding: 0 var(--space-3); border-radius: var(--radius-sm); }
.klv-btn--lg{ --_h: var(--control-lg); font-size: var(--text-base); padding: 0 var(--space-6); border-radius: var(--radius-lg); }

/* variants */
.klv-btn--primary{ background: var(--accent); color: var(--on-accent); }
.klv-btn--primary:hover{ background: var(--accent-hover); box-shadow: var(--glow-accent-soft); }
.klv-btn--secondary{ background: var(--surface); color: var(--text-primary); border-color: var(--border-strong); }
.klv-btn--secondary:hover{ background: var(--surface-2); border-color: var(--text-faint); }
.klv-btn--ghost{ background: transparent; color: var(--text-primary); }
.klv-btn--ghost:hover{ background: var(--surface-3); }
.klv-btn--danger{ background: var(--danger); color: #fff; }
.klv-btn--danger:hover{ filter: brightness(1.08); }
.klv-btn--pill{ border-radius: var(--radius-pill); }
.klv-btn--block{ width: 100%; }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-btn-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-btn-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Button({
  variant = 'primary',
  size = 'md',
  pill = false,
  block = false,
  iconLeft = null,
  iconRight = null,
  as = 'button',
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['klv-btn', `klv-btn--${variant}`, size !== 'md' && `klv-btn--${size}`, pill && 'klv-btn--pill', block && 'klv-btn--block', className].filter(Boolean).join(' ');
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), iconLeft, children != null && /*#__PURE__*/React.createElement("span", null, children), iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-check{ display:inline-flex; align-items:center; gap:var(--space-2); cursor:pointer; font-family:var(--font-sans); user-select:none; }
.klv-check[data-disabled="true"]{ opacity:.5; pointer-events:none; }
.klv-check input{ position:absolute; opacity:0; width:0; height:0; }
.klv-check__box{
  width:18px; height:18px; flex:none;
  display:inline-flex; align-items:center; justify-content:center;
  border:1.5px solid var(--border-strong); border-radius:var(--radius-xs);
  background:var(--surface); color:var(--on-accent);
  transition:background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.klv-check__box svg{ width:13px; height:13px; opacity:0; transform:scale(.6); transition:opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-spring); }
.klv-check input:checked + .klv-check__box{ background:var(--accent); border-color:var(--accent); }
.klv-check input:checked + .klv-check__box svg{ opacity:1; transform:scale(1); }
.klv-check input:indeterminate + .klv-check__box{ background:var(--accent); border-color:var(--accent); }
.klv-check input:focus-visible + .klv-check__box{ box-shadow:var(--ring); }
.klv-check__label{ font-size:var(--text-sm); color:var(--text-primary); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-check-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-check-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Checkbox({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  label,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("label", {
    className: ['klv-check', className].filter(Boolean).join(' '),
    "data-disabled": disabled
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "klv-check__box"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), label && /*#__PURE__*/React.createElement("span", {
    className: "klv-check__label"
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-iconbtn{
  --_s: var(--control-md);
  display:inline-flex;align-items:center;justify-content:center;
  width:var(--_s);height:var(--_s);
  border-radius:var(--radius-md);
  border:1px solid transparent;
  background:transparent;color:var(--text-secondary);
  cursor:pointer;flex:none;
  transition:background var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out),
             border-color var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out);
}
.klv-iconbtn:hover{ background:var(--surface-3); color:var(--text-primary); }
.klv-iconbtn:active{ transform:scale(0.92); }
.klv-iconbtn:focus-visible{ outline:none; box-shadow:var(--ring); }
.klv-iconbtn[disabled]{ opacity:.45; pointer-events:none; }
.klv-iconbtn svg{ width:1.2em;height:1.2em; }
.klv-iconbtn--sm{ --_s:var(--control-sm); border-radius:var(--radius-sm); }
.klv-iconbtn--lg{ --_s:var(--control-lg); border-radius:var(--radius-lg); }
.klv-iconbtn--solid{ background:var(--accent); color:var(--on-accent); }
.klv-iconbtn--solid:hover{ background:var(--accent-hover); color:var(--on-accent); box-shadow:var(--glow-accent-soft); }
.klv-iconbtn--outline{ border-color:var(--border-strong); color:var(--text-primary); }
.klv-iconbtn--outline:hover{ background:var(--surface-2); border-color:var(--text-faint); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-iconbtn-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-iconbtn-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function IconButton({
  variant = 'ghost',
  size = 'md',
  label,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['klv-iconbtn', variant !== 'ghost' && `klv-iconbtn--${variant}`, size !== 'md' && `klv-iconbtn--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-label": label,
    title: label
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-field{ display:flex; flex-direction:column; gap:var(--space-1-5); font-family:var(--font-sans); }
.klv-field__label{ font-size:var(--text-sm); font-weight:var(--weight-medium); color:var(--text-primary); }
.klv-field__label .req{ color:var(--danger); margin-left:2px; }
.klv-field__hint{ font-size:var(--text-xs); color:var(--text-muted); }
.klv-field__hint--error{ color:var(--danger); }

.klv-input{
  --_h: var(--control-md);
  display:flex; align-items:center; gap:var(--space-2);
  height:var(--_h);
  padding:0 var(--space-3);
  background:var(--surface);
  border:1px solid var(--border-strong);
  border-radius:var(--radius-md);
  color:var(--text-primary);
  transition:border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.klv-input:focus-within{ border-color:var(--accent); box-shadow:var(--ring); }
.klv-input--invalid{ border-color:var(--danger); }
.klv-input--invalid:focus-within{ box-shadow:0 0 0 3px color-mix(in srgb, var(--danger) 30%, transparent); }
.klv-input--sm{ --_h:var(--control-sm); border-radius:var(--radius-sm); font-size:var(--text-xs); }
.klv-input--lg{ --_h:var(--control-lg); border-radius:var(--radius-lg); }
.klv-input[data-disabled="true"]{ opacity:.55; pointer-events:none; background:var(--surface-2); }
.klv-input__el{
  flex:1 1 auto; min-width:0; height:100%;
  border:none; background:transparent; outline:none;
  color:inherit; font:inherit; font-size:var(--text-sm);
}
.klv-input--sm .klv-input__el{ font-size:var(--text-xs); }
.klv-input__el::placeholder{ color:var(--text-faint); }
.klv-input__affix{ display:inline-flex; color:var(--text-muted); flex:none; }
.klv-input__affix svg{ width:1.05rem; height:1.05rem; }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-input-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-input-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Input({
  label,
  hint,
  error,
  size = 'md',
  leading = null,
  trailing = null,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const invalid = Boolean(error);
  const boxCls = ['klv-input', size !== 'md' && `klv-input--${size}`, invalid && 'klv-input--invalid', className].filter(Boolean).join(' ');
  const inputId = id || (label ? `klv-${Math.random().toString(36).slice(2, 8)}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    className: "klv-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "klv-field__label",
    htmlFor: inputId
  }, label, rest.required && /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: boxCls,
    "data-disabled": disabled
  }, leading && /*#__PURE__*/React.createElement("span", {
    className: "klv-input__affix"
  }, leading), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    className: "klv-input__el",
    disabled: disabled,
    "aria-invalid": invalid
  }, rest)), trailing && /*#__PURE__*/React.createElement("span", {
    className: "klv-input__affix"
  }, trailing)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: `klv-field__hint${error ? ' klv-field__hint--error' : ''}`
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-radio{ display:inline-flex; align-items:center; gap:var(--space-2); cursor:pointer; font-family:var(--font-sans); user-select:none; }
.klv-radio[data-disabled="true"]{ opacity:.5; pointer-events:none; }
.klv-radio input{ position:absolute; opacity:0; width:0; height:0; }
.klv-radio__dot{
  width:18px; height:18px; flex:none;
  display:inline-flex; align-items:center; justify-content:center;
  border:1.5px solid var(--border-strong); border-radius:50%;
  background:var(--surface);
  transition:border-color var(--dur-fast) var(--ease-out);
}
.klv-radio__dot::after{ content:""; width:9px; height:9px; border-radius:50%; background:var(--accent); transform:scale(0); transition:transform var(--dur-fast) var(--ease-spring); }
.klv-radio input:checked + .klv-radio__dot{ border-color:var(--accent); }
.klv-radio input:checked + .klv-radio__dot::after{ transform:scale(1); }
.klv-radio input:focus-visible + .klv-radio__dot{ box-shadow:var(--ring); }
.klv-radio__label{ font-size:var(--text-sm); color:var(--text-primary); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-radio-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-radio-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Radio({
  checked,
  defaultChecked,
  onChange,
  name,
  value,
  disabled = false,
  label,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("label", {
    className: ['klv-radio', className].filter(Boolean).join(' '),
    "data-disabled": disabled
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "klv-radio__dot"
  }), label && /*#__PURE__*/React.createElement("span", {
    className: "klv-radio__label"
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-select{ display:flex; flex-direction:column; gap:var(--space-1-5); font-family:var(--font-sans); }
.klv-select__label{ font-size:var(--text-sm); font-weight:var(--weight-medium); color:var(--text-primary); }
.klv-select__wrap{ position:relative; display:flex; align-items:center; }
.klv-select__el{
  --_h:var(--control-md);
  appearance:none; -webkit-appearance:none;
  width:100%; height:var(--_h);
  padding:0 calc(var(--space-3) + 22px) 0 var(--space-3);
  background:var(--surface);
  border:1px solid var(--border-strong);
  border-radius:var(--radius-md);
  color:var(--text-primary);
  font:inherit; font-size:var(--text-sm); cursor:pointer;
  transition:border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.klv-select__el:focus{ outline:none; border-color:var(--accent); box-shadow:var(--ring); }
.klv-select__el:disabled{ opacity:.55; pointer-events:none; background:var(--surface-2); }
.klv-select__el--sm{ --_h:var(--control-sm); border-radius:var(--radius-sm); font-size:var(--text-xs); }
.klv-select__el--lg{ --_h:var(--control-lg); border-radius:var(--radius-lg); }
.klv-select__chev{ position:absolute; right:var(--space-3); pointer-events:none; color:var(--text-muted); display:inline-flex; }
.klv-select__chev svg{ width:16px; height:16px; }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-select-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-select-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Select({
  label,
  size = 'md',
  options,
  children,
  className = '',
  id,
  ...rest
}) {
  ensureStyles();
  const selId = id || (label ? `klv-sel-${Math.random().toString(36).slice(2, 7)}` : undefined);
  const elCls = ['klv-select__el', size !== 'md' && `klv-select__el--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: "klv-select"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "klv-select__label",
    htmlFor: selId
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "klv-select__wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selId,
    className: elCls
  }, rest), options ? options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  }) : children), /*#__PURE__*/React.createElement("span", {
    className: "klv-select__chev"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  })))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.klv-switch{ display:inline-flex; align-items:center; gap:var(--space-2-5,10px); cursor:pointer; font-family:var(--font-sans); user-select:none; }
.klv-switch[data-disabled="true"]{ opacity:.5; pointer-events:none; }
.klv-switch__track{
  --_w:42px; --_h:24px;
  position:relative; width:var(--_w); height:var(--_h); flex:none;
  background:var(--surface-3); border:1px solid var(--border-strong);
  border-radius:var(--radius-pill);
  transition:background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out);
}
.klv-switch__thumb{
  position:absolute; top:50%; left:3px; transform:translateY(-50%);
  width:16px; height:16px; border-radius:50%;
  background:var(--neutral-0); box-shadow:var(--shadow-sm);
  transition:left var(--dur-base) var(--ease-spring);
}
.klv-switch input{ position:absolute; opacity:0; width:0; height:0; }
.klv-switch input:checked + .klv-switch__track{ background:var(--accent); border-color:var(--accent); }
.klv-switch input:checked + .klv-switch__track .klv-switch__thumb{ left:21px; background:var(--neutral-900); }
.klv-switch input:focus-visible + .klv-switch__track{ box-shadow:var(--ring); }
.klv-switch--sm .klv-switch__track{ --_w:34px; --_h:20px; }
.klv-switch--sm .klv-switch__thumb{ width:13px; height:13px; }
.klv-switch--sm input:checked + .klv-switch__track .klv-switch__thumb{ left:17px; }
.klv-switch__label{ font-size:var(--text-sm); color:var(--text-primary); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-switch-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-switch-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Switch({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['klv-switch', size !== 'md' && `klv-switch--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls,
    "data-disabled": disabled
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "klv-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "klv-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "klv-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
const CSS = `
.klv-tabs{ display:inline-flex; font-family:var(--font-sans); }
.klv-tabs--line{ gap:var(--space-5); border-bottom:1px solid var(--border); }
.klv-tabs--pill{ gap:var(--space-1); background:var(--surface-3); padding:var(--space-1); border-radius:var(--radius-lg); }
.klv-tab{
  display:inline-flex; align-items:center; gap:var(--space-2);
  font-size:var(--text-sm); font-weight:var(--weight-medium);
  color:var(--text-secondary); background:transparent; border:none; cursor:pointer;
  transition:color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.klv-tab svg{ width:1rem; height:1rem; }
.klv-tab__count{ font-size:11px; font-family:var(--font-mono); padding:1px 6px; border-radius:var(--radius-pill); background:var(--surface-3); color:var(--text-muted); }

.klv-tabs--line .klv-tab{ padding:0 0 var(--space-3); position:relative; }
.klv-tabs--line .klv-tab::after{ content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px; border-radius:2px; background:transparent; transition:background var(--dur-fast) var(--ease-out); }
.klv-tabs--line .klv-tab:hover{ color:var(--text-primary); }
.klv-tabs--line .klv-tab[aria-selected="true"]{ color:var(--text-primary); }
.klv-tabs--line .klv-tab[aria-selected="true"]::after{ background:var(--accent); }

.klv-tabs--pill .klv-tab{ padding:var(--space-2) var(--space-4); border-radius:var(--radius-md); }
.klv-tabs--pill .klv-tab:hover{ color:var(--text-primary); }
.klv-tabs--pill .klv-tab[aria-selected="true"]{ color:var(--text-primary); background:var(--surface); box-shadow:var(--shadow-sm); }
.klv-tabs--pill .klv-tab[aria-selected="true"] .klv-tab__count{ background:var(--accent-subtle); color:var(--accent-700); }
.klv-tab:focus-visible{ outline:none; box-shadow:var(--ring); border-radius:var(--radius-sm); }
`;
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('klv-tabs-css')) return;
  const s = document.createElement('style');
  s.id = 'klv-tabs-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  variant = 'line',
  className = ''
}) {
  ensureStyles();
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.value);
  const active = value !== undefined ? value : internal;
  const select = v => {
    if (value === undefined) setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: ['klv-tabs', `klv-tabs--${variant}`, className].filter(Boolean).join(' '),
    role: "tablist"
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.value,
    role: "tab",
    "aria-selected": active === it.value,
    className: "klv-tab",
    onClick: () => select(it.value)
  }, it.icon, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
    className: "klv-tab__count"
  }, it.count))));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Panels.jsx
try { (() => {
// Klivr client dashboard — project & deploy console.
const {
  Button,
  Badge,
  Card,
  Tag,
  Avatar,
  Tabs,
  IconButton,
  Input,
  Switch,
  Tooltip
} = window.KlivrDesignSystem_3b3219;
const Icon = ({
  name,
  size = 18,
  color,
  strokeWidth
}) => /*#__PURE__*/React.createElement("i", {
  "data-lucide": name,
  style: {
    width: size,
    height: size,
    color,
    display: 'inline-flex'
  },
  "data-sw": strokeWidth
});
const MARK_WHITE = '../../assets/klivr-mark-white.png';
const MARK_DARK = '../../assets/klivr-mark-dark.png';

/* -------------------------------- SIDEBAR -------------------------------- */
function Sidebar({
  active,
  onNav,
  theme
}) {
  const nav = [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard'
  }, {
    id: 'projects',
    label: 'Projects',
    icon: 'folder-git-2',
    count: 6
  }, {
    id: 'deploys',
    label: 'Deploys',
    icon: 'rocket'
  }, {
    id: 'team',
    label: 'Team',
    icon: 'users'
  }, {
    id: 'billing',
    label: 'Billing',
    icon: 'credit-card'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    className: "db-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-side__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: theme === 'dark' ? MARK_WHITE : MARK_DARK,
    alt: "Klivr",
    className: "db-side__mark"
  }), /*#__PURE__*/React.createElement("span", {
    className: "db-side__name"
  }, "Klivr"), /*#__PURE__*/React.createElement(Badge, {
    variant: "accent-soft",
    className: "db-side__plan"
  }, "Pro")), /*#__PURE__*/React.createElement("nav", {
    className: "db-side__nav"
  }, nav.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    className: `db-navitem${active === n.id ? ' is-active' : ''}`,
    onClick: () => onNav(n.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: n.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, n.label), n.count != null && /*#__PURE__*/React.createElement("span", {
    className: "db-navitem__count"
  }, n.count)))), /*#__PURE__*/React.createElement("div", {
    className: "db-side__foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-usage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-usage__top"
  }, /*#__PURE__*/React.createElement("span", null, "Build minutes"), /*#__PURE__*/React.createElement("span", {
    className: "db-usage__val"
  }, "7.2k / 10k")), /*#__PURE__*/React.createElement("div", {
    className: "db-usage__bar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '72%'
    }
  }))), /*#__PURE__*/React.createElement("button", {
    className: "db-userchip"
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Ada Okoro",
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("span", {
    className: "db-userchip__meta"
  }, /*#__PURE__*/React.createElement("b", null, "Ada Okoro"), /*#__PURE__*/React.createElement("i", null, "ada@northwind.io")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevrons-up-down",
    size: 15
  }))));
}

/* -------------------------------- TOPBAR --------------------------------- */
function Topbar({
  theme,
  onToggleTheme
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "db-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-top__crumb"
  }, /*#__PURE__*/React.createElement("span", null, "Northwind"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 15
  }), /*#__PURE__*/React.createElement("b", null, "Overview")), /*#__PURE__*/React.createElement("div", {
    className: "db-top__search"
  }, /*#__PURE__*/React.createElement(Input, {
    size: "sm",
    placeholder: "Search projects, deploys\u2026",
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 15
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "db-top__actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "db-iconchip",
    onClick: onToggleTheme,
    "aria-label": "Toggle theme"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === 'dark' ? 'sun' : 'moon',
    size: 17
  })), /*#__PURE__*/React.createElement(Tooltip, {
    content: "Notifications"
  }, /*#__PURE__*/React.createElement("button", {
    className: "db-iconchip"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 17
  }), /*#__PURE__*/React.createElement("span", {
    className: "db-iconchip__dot"
  }))), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 15
    })
  }, "New project")));
}

/* ------------------------------- STAT CARDS ------------------------------ */
function StatRow() {
  const stats = [{
    label: 'Active projects',
    value: '6',
    delta: '+2',
    up: true,
    icon: 'folder-git-2'
  }, {
    label: 'Deploys this week',
    value: '48',
    delta: '+18%',
    up: true,
    icon: 'rocket'
  }, {
    label: 'Avg. build time',
    value: '41s',
    delta: '−6s',
    up: true,
    icon: 'timer'
  }, {
    label: 'Open incidents',
    value: '1',
    delta: '2 resolved',
    up: false,
    icon: 'shield-alert'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "db-stats"
  }, stats.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    className: "db-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-stat__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "db-stat__icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    className: `db-stat__delta${s.up ? ' is-up' : ''}`
  }, s.delta)), /*#__PURE__*/React.createElement("span", {
    className: "db-stat__value"
  }, s.value), /*#__PURE__*/React.createElement("span", {
    className: "db-stat__label"
  }, s.label))));
}

/* ------------------------------ DEPLOY TABLE ----------------------------- */
const STATUS = {
  live: {
    variant: 'success',
    label: 'Live',
    dot: true
  },
  building: {
    variant: 'warning',
    label: 'Building',
    dot: true
  },
  failed: {
    variant: 'danger',
    label: 'Failed',
    dot: true
  },
  queued: {
    variant: 'info',
    label: 'Queued',
    dot: true
  }
};
function ProjectsPanel() {
  const rows = [{
    name: 'klivr-app',
    branch: 'main',
    env: 'production',
    status: 'live',
    time: '2m ago',
    who: 'Ada Okoro',
    dur: '41s'
  }, {
    name: 'cobalt-payments',
    branch: 'release/2.4',
    env: 'production',
    status: 'building',
    time: 'now',
    who: 'Jon Reed',
    dur: '—'
  }, {
    name: 'lumen-portal',
    branch: 'feat/auth',
    env: 'preview',
    status: 'live',
    time: '18m ago',
    who: 'Mira Patel',
    dur: '1m 12s'
  }, {
    name: 'vector-dash',
    branch: 'main',
    env: 'staging',
    status: 'failed',
    time: '34m ago',
    who: 'Sam Lee',
    dur: '—'
  }, {
    name: 'forge-api',
    branch: 'fix/rate-limit',
    env: 'preview',
    status: 'queued',
    time: '1h ago',
    who: 'Ada Okoro',
    dur: '—'
  }];
  const [tab, setTab] = React.useState('all');
  return /*#__PURE__*/React.createElement(Card, {
    padded: false,
    className: "db-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-panel__head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "db-panel__title"
  }, "Recent deploys"), /*#__PURE__*/React.createElement("div", {
    className: "db-panel__tools"
  }, /*#__PURE__*/React.createElement(Tabs, {
    variant: "pill",
    value: tab,
    onChange: setTab,
    items: [{
      value: 'all',
      label: 'All'
    }, {
      value: 'prod',
      label: 'Production'
    }, {
      value: 'preview',
      label: 'Preview'
    }]
  }), /*#__PURE__*/React.createElement(IconButton, {
    label: "Filter",
    variant: "outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sliders-horizontal",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    className: "db-table"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-table__head"
  }, /*#__PURE__*/React.createElement("span", null, "Project"), /*#__PURE__*/React.createElement("span", null, "Branch"), /*#__PURE__*/React.createElement("span", null, "Environment"), /*#__PURE__*/React.createElement("span", null, "Status"), /*#__PURE__*/React.createElement("span", null, "Duration"), /*#__PURE__*/React.createElement("span", null, "Deployed")), rows.map(r => {
    const st = STATUS[r.status];
    return /*#__PURE__*/React.createElement("div", {
      key: r.name,
      className: "db-table__row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "db-cell-name"
    }, /*#__PURE__*/React.createElement("span", {
      className: "db-cell-name__dot"
    }), /*#__PURE__*/React.createElement("b", null, r.name)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Tag, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "git-branch",
        size: 12
      })
    }, r.branch)), /*#__PURE__*/React.createElement("span", {
      className: "db-cell-muted"
    }, r.env), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Badge, {
      variant: st.variant,
      dot: st.dot
    }, st.label)), /*#__PURE__*/React.createElement("span", {
      className: "db-cell-mono"
    }, r.dur), /*#__PURE__*/React.createElement("span", {
      className: "db-cell-deployed"
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: r.who,
      size: "xs"
    }), /*#__PURE__*/React.createElement("span", {
      className: "db-cell-muted"
    }, r.time)));
  })));
}

/* ------------------------------- SIDE PANEL ------------------------------ */
function ActivityPanel() {
  const items = [{
    icon: 'git-merge',
    who: 'Jon Reed',
    what: 'merged',
    target: '#482 Rate limiting',
    time: '5m',
    color: 'var(--accent)'
  }, {
    icon: 'rocket',
    who: 'Ada Okoro',
    what: 'deployed',
    target: 'klivr-app → prod',
    time: '2m',
    color: 'var(--green-500)'
  }, {
    icon: 'message-square',
    who: 'Mira Patel',
    what: 'commented on',
    target: '#477 Auth flow',
    time: '22m',
    color: 'var(--info)'
  }, {
    icon: 'alert-triangle',
    who: 'CI',
    what: 'flagged',
    target: 'vector-dash build',
    time: '34m',
    color: 'var(--danger)'
  }, {
    icon: 'user-plus',
    who: 'Sam Lee',
    what: 'joined',
    target: 'Forge API',
    time: '1h',
    color: 'var(--text-muted)'
  }];
  return /*#__PURE__*/React.createElement(Card, {
    className: "db-activity"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-activity__head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "db-panel__title"
  }, "Activity"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "View all")), /*#__PURE__*/React.createElement("div", {
    className: "db-feed"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "db-feed__item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "db-feed__icon",
    style: {
      color: it.color
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    className: "db-feed__text"
  }, /*#__PURE__*/React.createElement("b", null, it.who), " ", it.what, " ", /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, it.target)), /*#__PURE__*/React.createElement("span", {
    className: "db-feed__time"
  }, it.time)))), /*#__PURE__*/React.createElement("div", {
    className: "db-activity__cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "db-activity__cta-text"
  }, /*#__PURE__*/React.createElement("b", null, "Auto-deploy on push"), /*#__PURE__*/React.createElement("span", null, "Ship main to production automatically.")), /*#__PURE__*/React.createElement(Switch, {
    defaultChecked: true
  })));
}
window.KlivrDashboard = {
  Sidebar,
  Topbar,
  StatRow,
  ProjectsPanel,
  ActivityPanel,
  Icon
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Panels.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Sections.jsx
try { (() => {
// Klivr marketing site — full landing page recreation.
// Uses design-system primitives from window.KlivrDesignSystem_<ns>.
const {
  Button,
  Badge,
  Card,
  Tag,
  Avatar
} = window.KlivrDesignSystem_3b3219;
const Icon = ({
  name,
  size = 18,
  color
}) => /*#__PURE__*/React.createElement("i", {
  "data-lucide": name,
  style: {
    width: size,
    height: size,
    color,
    display: 'inline-flex'
  }
});
const LOGO_WHITE = '../../assets/klivr-logo-white.png';
const LOGO_DARK = '../../assets/klivr-logo-dark.png';
const MARK_ACCENT = '../../assets/klivr-mark-accent.png';

/* ---------------------------------- NAV ---------------------------------- */
function Nav({
  theme,
  onToggleTheme
}) {
  const links = ['Services', 'Work', 'Process', 'About'];
  return /*#__PURE__*/React.createElement("header", {
    className: "mk-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-nav__inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "mk-nav__brand",
    href: "#"
  }, /*#__PURE__*/React.createElement("img", {
    src: theme === 'dark' ? LOGO_WHITE : LOGO_DARK,
    alt: "Klivr"
  })), /*#__PURE__*/React.createElement("nav", {
    className: "mk-nav__links"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#"
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "mk-nav__actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "mk-themebtn",
    onClick: onToggleTheme,
    "aria-label": "Toggle theme"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === 'dark' ? 'sun' : 'moon',
    size: 17
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 15
    })
  }, "Start a project"))));
}

/* --------------------------------- HERO ---------------------------------- */
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__glow"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-eyebrow__dot"
  }), "Software development agency"), /*#__PURE__*/React.createElement("h1", {
    className: "mk-hero__title"
  }, "Software,", /*#__PURE__*/React.createElement("br", null), "shipped ", /*#__PURE__*/React.createElement("span", {
    className: "mk-accent-text"
  }, "sharp"), "."), /*#__PURE__*/React.createElement("p", {
    className: "mk-hero__sub"
  }, "We build production software and embed senior engineers with your team \u2014 from first prototype to scaled release. No hand-offs, no fluff."), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__cta"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 17
    })
  }, "Start a project"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "play",
      size: 16
    })
  }, "See our work")), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__proof"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-avatars"
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Ada Okoro",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Jon Reed",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Mira Patel",
    size: "sm"
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Sam Lee",
    size: "sm"
  })), /*#__PURE__*/React.createElement("span", null, "Trusted by 40+ product teams shipping every week."))), /*#__PURE__*/React.createElement("div", {
    className: "mk-hero__panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-terminal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-terminal__bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-dot",
    style: {
      background: '#ff5f57'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "mk-dot",
    style: {
      background: '#febc2e'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "mk-dot",
    style: {
      background: '#28c840'
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "mk-terminal__file"
  }, "deploy.sh")), /*#__PURE__*/React.createElement("pre", {
    className: "mk-terminal__body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c-dim"
  }, "$"), " klivr ship ", /*#__PURE__*/React.createElement("span", {
    className: "c-accent"
  }, "--prod"), '\n', /*#__PURE__*/React.createElement("span", {
    className: "c-dim"
  }, "\u2192"), " building ", /*#__PURE__*/React.createElement("span", {
    className: "c-dim"
  }, "klivr-app"), "\u2026 ", /*#__PURE__*/React.createElement("span", {
    className: "c-ok"
  }, "done 12.4s"), '\n', /*#__PURE__*/React.createElement("span", {
    className: "c-dim"
  }, "\u2192"), " running tests\u2026 ", /*#__PURE__*/React.createElement("span", {
    className: "c-ok"
  }, "218 passed"), '\n', /*#__PURE__*/React.createElement("span", {
    className: "c-dim"
  }, "\u2192"), " deploying to ", /*#__PURE__*/React.createElement("span", {
    className: "c-accent"
  }, "production"), "\u2026", '\n', /*#__PURE__*/React.createElement("span", {
    className: "c-ok"
  }, "\u2713 live in 41s"), " \xB7 klivr.app", '\n'))));
}

/* ------------------------------- LOGO STRIP ------------------------------ */
function LogoStrip() {
  const names = ['Northwind', 'Lumen', 'Cobalt', 'Forge', 'Vector', 'Halo'];
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-logos"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-logos__label"
  }, "SELECTED CLIENTS"), /*#__PURE__*/React.createElement("div", {
    className: "mk-logos__row"
  }, names.map(n => /*#__PURE__*/React.createElement("span", {
    key: n,
    className: "mk-logos__item"
  }, n))));
}

/* -------------------------------- SERVICES ------------------------------- */
function Services() {
  const items = [{
    icon: 'box',
    title: 'Product engineering',
    body: 'Full-stack teams that design, build and ship your product end-to-end.'
  }, {
    icon: 'users',
    title: 'Staff augmentation',
    body: 'Senior engineers embedded in your team, productive from day one.'
  }, {
    icon: 'server',
    title: 'Platform & infra',
    body: 'Cloud, CI/CD and DevOps foundations built to scale without surprises.'
  }, {
    icon: 'zap',
    title: 'Rapid prototyping',
    body: 'From idea to a working prototype in two-week sprints, not quarters.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-section__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-eyebrow"
  }, "WHAT WE DO"), /*#__PURE__*/React.createElement("h2", {
    className: "mk-h2"
  }, "Engineering that ships, ", /*#__PURE__*/React.createElement("br", null), "not slideware.")), /*#__PURE__*/React.createElement("div", {
    className: "mk-services"
  }, items.map((it, i) => /*#__PURE__*/React.createElement(Card, {
    key: it.title,
    interactive: true,
    className: "mk-service",
    variant: i === 0 ? 'accent' : 'default'
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-service__icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("h3", {
    className: "mk-service__title"
  }, it.title), /*#__PURE__*/React.createElement("p", {
    className: "mk-service__body"
  }, it.body), /*#__PURE__*/React.createElement("span", {
    className: "mk-service__more"
  }, "Learn more ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    size: 14
  }))))));
}

/* ---------------------------------- WORK --------------------------------- */
function Work() {
  const cases = [{
    tag: 'Fintech',
    title: 'Cobalt payments platform',
    stat: '99.99% uptime · 8M txns/day',
    stack: ['Go', 'React', 'Postgres']
  }, {
    tag: 'Healthcare',
    title: 'Lumen patient portal',
    stat: 'Shipped in 9 weeks',
    stack: ['TypeScript', 'Next.js']
  }, {
    tag: 'Logistics',
    title: 'Vector fleet dashboard',
    stat: '−38% dispatch time',
    stack: ['React', 'Rust', 'Kafka']
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-section mk-section--alt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-section__head mk-section__head--row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "mk-eyebrow"
  }, "SELECTED WORK"), /*#__PURE__*/React.createElement("h2", {
    className: "mk-h2"
  }, "Recent builds.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 15
    })
  }, "View all work")), /*#__PURE__*/React.createElement("div", {
    className: "mk-work"
  }, cases.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.title,
    interactive: true,
    padded: false,
    className: "mk-case"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-case__thumb"
  }, /*#__PURE__*/React.createElement("img", {
    src: MARK_ACCENT,
    alt: ""
  })), /*#__PURE__*/React.createElement("div", {
    className: "mk-case__body"
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "accent-soft"
  }, c.tag), /*#__PURE__*/React.createElement("h3", {
    className: "mk-case__title"
  }, c.title), /*#__PURE__*/React.createElement("p", {
    className: "mk-case__stat"
  }, c.stat), /*#__PURE__*/React.createElement("div", {
    className: "mk-case__stack"
  }, c.stack.map(s => /*#__PURE__*/React.createElement(Tag, {
    key: s
  }, s))))))));
}

/* ------------------------------- STATS BAND ------------------------------ */
function Stats() {
  const stats = [{
    k: '40+',
    v: 'Product teams'
  }, {
    k: '12yr',
    v: 'Avg. senior experience'
  }, {
    k: '2wk',
    v: 'To first ship'
  }, {
    k: '99.9%',
    v: 'Uptime delivered'
  }];
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-stats"
  }, stats.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.v,
    className: "mk-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-stat__k"
  }, s.k), /*#__PURE__*/React.createElement("span", {
    className: "mk-stat__v"
  }, s.v))));
}

/* ---------------------------------- CTA ---------------------------------- */
function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    className: "mk-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-cta__card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-cta__glow"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mk-eyebrow"
  }, "BOOK A BUILD SPRINT"), /*#__PURE__*/React.createElement("h2", {
    className: "mk-cta__title"
  }, "Let's ship something sharp."), /*#__PURE__*/React.createElement("p", {
    className: "mk-cta__sub"
  }, "Tell us what you're building. We'll scope a sprint and put senior engineers on it this month."), /*#__PURE__*/React.createElement("div", {
    className: "mk-cta__actions"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 17
    })
  }, "Start a project"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "ghost",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 16
    })
  }, "Book a call"))));
}

/* -------------------------------- FOOTER --------------------------------- */
function Footer({
  theme
}) {
  const cols = [{
    h: 'Company',
    l: ['About', 'Work', 'Careers', 'Contact']
  }, {
    h: 'Services',
    l: ['Product engineering', 'Staff aug', 'Platform', 'Prototyping']
  }, {
    h: 'Resources',
    l: ['Case studies', 'Blog', 'Open source']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    className: "mk-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-footer__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mk-footer__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: theme === 'dark' ? LOGO_WHITE : LOGO_DARK,
    alt: "Klivr"
  }), /*#__PURE__*/React.createElement("p", null, "Senior engineers, embedded in your team. From prototype to scale."), /*#__PURE__*/React.createElement("div", {
    className: "mk-footer__social"
  }, ['github', 'twitter', 'linkedin'].map(s => /*#__PURE__*/React.createElement("a", {
    key: s,
    href: "#",
    "aria-label": s
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s,
    size: 17
  }))))), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h,
    className: "mk-footer__col"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mk-footer__h"
  }, c.h), c.l.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#"
  }, l))))), /*#__PURE__*/React.createElement("div", {
    className: "mk-footer__bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Klivr. All rights reserved."), /*#__PURE__*/React.createElement("span", null, "Built sharp.")));
}
window.KlivrMarketing = {
  Nav,
  Hero,
  LogoStrip,
  Services,
  Work,
  Stats,
  CTA,
  Footer,
  Icon
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
