/* @ds-bundle: {"format":4,"namespace":"StillDesignSystem_5e6a28","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"ProgressRing","sourcePath":"components/display/ProgressRing.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Button.jsx":"3094df349433","components/core/Icon.jsx":"44b44c4701fc","components/core/IconButton.jsx":"87b731a00130","components/display/Badge.jsx":"d116332ff087","components/display/Card.jsx":"73757419bf48","components/display/ProgressRing.jsx":"e1ba7633384d","components/display/Tag.jsx":"e3b784335ba3","components/feedback/Dialog.jsx":"ccdbcf4315ba","components/feedback/Toast.jsx":"bd770b0537f4","components/feedback/Tooltip.jsx":"618f3d93b593","components/forms/Checkbox.jsx":"9161b5020892","components/forms/Input.jsx":"da6083d410c6","components/forms/Radio.jsx":"3a4f826cf493","components/forms/Select.jsx":"f411e86757ac","components/forms/Switch.jsx":"bc8902cae8e5","components/navigation/Tabs.jsx":"9b94c47943e8","ui_kits/app/FocusView.jsx":"1db8cfbcdca4","ui_kits/app/ListView.jsx":"1071c8644927","ui_kits/app/SettingsView.jsx":"f69ccb8572ea","ui_kits/app/Sidebar.jsx":"94eadae35de2","ui_kits/app/TaskRow.jsx":"1768330035cc"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.StillDesignSystem_5e6a28 = window.StillDesignSystem_5e6a28 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const LUCIDE_SRC = 'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js';
let lucidePromise = null;
function loadLucide() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.lucide && window.lucide.icons) return Promise.resolve();
  if (!lucidePromise) {
    lucidePromise = new Promise(function (resolve) {
      const s = document.createElement('script');
      s.src = LUCIDE_SRC;
      s.onload = resolve;
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }
  return lucidePromise;
}
function toPascal(n) {
  return String(n).replace(/(^|[-_ ])(\w)/g, function (_, __, c) {
    return c.toUpperCase();
  });
}
function renderNode(node, i) {
  const tag = node[0],
    attrs = node[1] || {},
    kids = node[2];
  return React.createElement(tag, Object.assign({
    key: i
  }, attrs), kids ? kids.map(renderNode) : undefined);
}
function Icon({
  name,
  size = 18,
  strokeWidth = 1.75,
  color = 'currentColor',
  title,
  style,
  ...rest
}) {
  const [, tick] = React.useState(0);
  const ready = typeof window !== 'undefined' && window.lucide && window.lucide.icons;
  React.useEffect(function () {
    if (!ready) loadLucide().then(function () {
      tick(function (x) {
        return x + 1;
      });
    });
  }, [ready]);
  let nodes = null;
  if (ready) {
    const def = window.lucide.icons[toPascal(name)];
    if (def) nodes = def[0] === 'svg' ? def[2] : def;
  }
  return /*#__PURE__*/React.createElement("svg", _extends({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": title ? undefined : true,
    role: title ? 'img' : undefined,
    style: {
      display: 'block',
      flexShrink: 0,
      ...style
    }
  }, rest), title ? /*#__PURE__*/React.createElement("title", null, title) : null, nodes ? nodes.map(renderNode) : null);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    h: 28,
    px: 10,
    fs: 13,
    gap: 6,
    icon: 15
  },
  md: {
    h: 34,
    px: 14,
    fs: 14,
    gap: 8,
    icon: 16
  },
  lg: {
    h: 40,
    px: 18,
    fs: 15,
    gap: 8,
    icon: 18
  }
};
const VARIANTS = {
  primary: {
    bg: 'var(--surface-inverse)',
    hover: 'var(--surface-inverse-hover)',
    fg: 'var(--fg-inverse)',
    border: 'transparent'
  },
  secondary: {
    bg: 'var(--surface-1)',
    hover: 'var(--surface-hover)',
    fg: 'var(--fg-1)',
    border: 'var(--border-2)'
  },
  ghost: {
    bg: 'transparent',
    hover: 'var(--surface-hover)',
    fg: 'var(--fg-2)',
    hoverFg: 'var(--fg-1)',
    border: 'transparent'
  },
  accent: {
    bg: 'var(--accent)',
    hover: 'var(--accent-hover)',
    fg: 'var(--accent-fg)',
    border: 'transparent'
  },
  danger: {
    bg: 'transparent',
    hover: 'var(--danger-bg)',
    fg: 'var(--danger-fg)',
    border: 'var(--border-2)'
  }
};
function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  disabled,
  type = 'button',
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.secondary;
  const on = hover && !disabled;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.h,
      padding: '0 ' + (children ? s.px : 0) + 'px',
      minWidth: children ? undefined : s.h,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fs,
      fontWeight: 500,
      letterSpacing: '-0.005em',
      lineHeight: 1,
      color: on && v.hoverFg ? v.hoverFg : v.fg,
      background: on ? v.hover : v.bg,
      border: '1px solid ' + v.border,
      borderRadius: 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: press && !disabled ? 'scale(0.98)' : 'none',
      whiteSpace: 'nowrap',
      transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    box: 28,
    icon: 16
  },
  md: {
    box: 34,
    icon: 18
  },
  lg: {
    box: 40,
    icon: 20
  }
};
const VARIANTS = {
  ghost: {
    bg: 'transparent',
    hover: 'var(--surface-hover)',
    fg: 'var(--fg-2)',
    hoverFg: 'var(--fg-1)',
    border: 'transparent'
  },
  secondary: {
    bg: 'var(--surface-1)',
    hover: 'var(--surface-hover)',
    fg: 'var(--fg-1)',
    border: 'var(--border-2)'
  },
  primary: {
    bg: 'var(--surface-inverse)',
    hover: 'var(--surface-inverse-hover)',
    fg: 'var(--fg-inverse)',
    border: 'transparent'
  },
  accent: {
    bg: 'var(--accent)',
    hover: 'var(--accent-hover)',
    fg: 'var(--accent-fg)',
    border: 'transparent'
  }
};
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  round,
  active,
  disabled,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.ghost;
  const on = hover && !disabled;
  const bg = active ? 'var(--surface-active)' : on ? v.hover : v.bg;
  const fg = active ? 'var(--fg-1)' : on && v.hoverFg ? v.hoverFg : v.fg;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    "aria-pressed": active === undefined ? undefined : !!active,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: s.box,
      height: s.box,
      padding: 0,
      color: fg,
      background: bg,
      border: '1px solid ' + v.border,
      borderRadius: round ? 'var(--radius-full)' : 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: press && !disabled ? 'scale(0.94)' : 'none',
      transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    bg: 'var(--surface-sunken)',
    fg: 'var(--fg-2)',
    dot: 'var(--fg-3)'
  },
  accent: {
    bg: 'var(--accent-subtle)',
    fg: 'var(--accent-subtle-fg)',
    dot: 'var(--accent)'
  },
  success: {
    bg: 'var(--success-bg)',
    fg: 'var(--success-fg)',
    dot: 'var(--success)'
  },
  warning: {
    bg: 'var(--warning-bg)',
    fg: 'var(--warning-fg)',
    dot: 'var(--warning)'
  },
  danger: {
    bg: 'var(--danger-bg)',
    fg: 'var(--danger-fg)',
    dot: 'var(--danger)'
  },
  info: {
    bg: 'var(--info-bg)',
    fg: 'var(--info-fg)',
    dot: 'var(--info)'
  }
};
function Badge({
  tone = 'neutral',
  variant = 'soft',
  dot,
  children,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  const outline = variant === 'outline';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 20,
      padding: '0 7px',
      borderRadius: 'var(--radius-full)',
      background: outline ? 'transparent' : t.bg,
      color: t.fg,
      border: '1px solid ' + (outline ? 'var(--border-2)' : 'transparent'),
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.dot
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PAD = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24
};
const VARIANTS = {
  outlined: {
    bg: 'var(--surface-1)',
    border: 'var(--border-1)',
    shadow: 'none'
  },
  raised: {
    bg: 'var(--surface-1)',
    border: 'var(--border-1)',
    shadow: 'var(--shadow-1)'
  },
  sunken: {
    bg: 'var(--surface-sunken)',
    border: 'transparent',
    shadow: 'none'
  },
  plain: {
    bg: 'transparent',
    border: 'transparent',
    shadow: 'none'
  }
};
function Card({
  variant = 'outlined',
  padding = 'md',
  interactive,
  selected,
  children,
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.outlined;
  const clickable = interactive || !!onClick;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    role: clickable ? 'button' : undefined,
    tabIndex: clickable ? 0 : undefined,
    style: {
      background: clickable && hover && variant !== 'sunken' ? 'var(--surface-2)' : v.bg,
      border: '1px solid ' + (selected ? 'var(--fg-1)' : clickable && hover ? 'var(--border-2)' : v.border),
      borderRadius: 'var(--radius-lg)',
      boxShadow: v.shadow,
      padding: PAD[padding] !== undefined ? PAD[padding] : 16,
      cursor: clickable ? 'pointer' : undefined,
      fontFamily: 'var(--font-sans)',
      color: 'var(--fg-1)',
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/ProgressRing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ProgressRing({
  value = 0,
  size = 160,
  stroke = 3,
  color = 'var(--accent)',
  track = 'var(--border-1)',
  children,
  style,
  ...rest
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "progressbar",
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": Math.round(v * 100),
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      display: 'block',
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: track,
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * (1 - v),
    style: {
      transition: 'stroke-dashoffset var(--dur-calm) var(--ease-out)'
    }
  })), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, children) : null);
}
Object.assign(__ds_scope, { ProgressRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/ProgressRing.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DOTS = {
  neutral: 'var(--fg-3)',
  sage: 'var(--sage-500)',
  moss: 'var(--moss-500)',
  amber: 'var(--amber-500)',
  clay: 'var(--clay-500)',
  mist: 'var(--mist-500)'
};
function Tag({
  children,
  color,
  icon,
  selected,
  onClick,
  onRemove,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const clickable = !!onClick;
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    role: clickable ? 'button' : undefined,
    tabIndex: clickable ? 0 : undefined,
    "aria-pressed": clickable ? !!selected : undefined,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 24,
      padding: onRemove ? '0 4px 0 8px' : '0 8px',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 450,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      color: selected ? 'var(--fg-inverse)' : 'var(--fg-2)',
      background: selected ? 'var(--surface-inverse)' : clickable && hover ? 'var(--surface-active)' : 'var(--surface-sunken)',
      cursor: clickable ? 'pointer' : 'default',
      transition: 'background var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), color ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 2,
      background: DOTS[color] || color
    }
  }) : null, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13
  }) : null, children, onRemove ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 16,
      height: 16,
      padding: 0,
      border: 'none',
      borderRadius: 4,
      background: 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 12,
    strokeWidth: 2
  })) : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  onClose,
  title,
  description,
  children,
  footer,
  width = 420,
  inline,
  style
}) {
  React.useEffect(() => {
    if (!open || inline) return;
    const onKey = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, inline, onClose]);
  if (!open) return null;
  const panel = /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": inline ? undefined : true,
    "aria-label": typeof title === 'string' ? title : undefined,
    onClick: e => e.stopPropagation(),
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: width,
      background: 'var(--surface-1)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-overlay)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--fg-1)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '20px 20px 0 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      paddingTop: 4
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3
    }
  }, title) : null, description ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 1.5,
      color: 'var(--fg-2)',
      textWrap: 'pretty'
    }
  }, description) : null), onClose ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    label: "Close",
    size: "sm",
    onClick: onClose
  }) : null), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 24px 0'
    }
  }, children) : null, footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      padding: '20px 24px 20px'
    }
  }, footer) : /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24
    }
  }));
  if (inline) return panel;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--overlay)',
      backdropFilter: 'blur(var(--blur-overlay))',
      WebkitBackdropFilter: 'blur(var(--blur-overlay))'
    }
  }, panel);
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE_ICON = {
  neutral: null,
  success: 'check',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  info: 'info'
};
const TONE_COLOR = {
  neutral: 'inherit',
  success: 'var(--sage-300)',
  warning: 'var(--amber-500)',
  danger: 'var(--clay-500)',
  info: 'var(--mist-500)'
};
function Toast({
  children,
  tone = 'neutral',
  icon,
  action,
  onClose,
  style,
  ...rest
}) {
  const glyph = icon || TONE_ICON[tone];
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 40,
      padding: '8px 8px 8px 14px',
      maxWidth: 420,
      background: 'var(--surface-inverse)',
      color: 'var(--fg-inverse)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-overlay)',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      lineHeight: 1.35,
      ...style
    }
  }, rest), glyph ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: TONE_COLOR[tone] || 'inherit',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: glyph,
    size: 16
  })) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      paddingRight: action || onClose ? 4 : 6
    }
  }, children), action ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: action.onClick,
    style: {
      height: 26,
      padding: '0 8px',
      border: 'none',
      borderRadius: 6,
      background: 'transparent',
      color: 'inherit',
      fontFamily: 'inherit',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      textDecoration: 'underline',
      textUnderlineOffset: 3,
      textDecorationColor: 'currentColor'
    }
  }, action.label) : null, onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss",
    onClick: onClose,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 26,
      height: 26,
      padding: 0,
      border: 'none',
      borderRadius: 6,
      background: 'transparent',
      color: 'inherit',
      opacity: 0.6,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })) : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  shortcut,
  placement = 'top',
  open,
  delay = 400,
  children,
  style
}) {
  const [show, setShow] = React.useState(false);
  const timer = React.useRef(null);
  const visible = open !== undefined ? open : show;
  const enter = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(true), delay);
  };
  const leave = () => {
    clearTimeout(timer.current);
    setShow(false);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const pos = placement === 'bottom' ? {
    top: '100%',
    marginTop: 6
  } : {
    bottom: '100%',
    marginBottom: 6
  };
  return /*#__PURE__*/React.createElement("span", {
    onMouseEnter: enter,
    onMouseLeave: leave,
    onFocus: enter,
    onBlur: leave,
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    }
  }, children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      left: '50%',
      ...pos,
      transform: 'translateX(-50%) translateY(' + (visible ? 0 : placement === 'bottom' ? -2 : 2) + 'px)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 26,
      padding: '0 8px',
      borderRadius: 6,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 50,
      background: 'var(--surface-inverse)',
      color: 'var(--fg-inverse)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      opacity: visible ? 1 : 0,
      transition: 'opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)'
    }
  }, label, shortcut ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      opacity: 0.6
    }
  }, shortcut) : null));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  checked,
  defaultChecked,
  onChange,
  label,
  shape = 'square',
  size = 'md',
  strike,
  disabled,
  style,
  ...rest
}) {
  const [inner, setInner] = React.useState(!!defaultChecked);
  const [hover, setHover] = React.useState(false);
  const isOn = checked !== undefined ? checked : inner;
  const box = size === 'lg' ? 20 : size === 'sm' ? 14 : 16;
  const toggle = e => {
    if (disabled) return;
    if (checked === undefined) setInner(!isOn);
    onChange && onChange(!isOn, e);
  };
  return /*#__PURE__*/React.createElement("label", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--fg-1)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: isOn,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
      margin: 0,
      pointerEvents: 'none'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: box,
      height: box,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: shape === 'round' ? '50%' : 5,
      border: '1.5px solid ' + (isOn ? 'var(--accent)' : hover ? 'var(--fg-3)' : 'var(--border-strong)'),
      background: isOn ? 'var(--accent)' : 'transparent',
      color: 'var(--accent-fg)',
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)'
    }
  }, isOn ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: box - 4,
    strokeWidth: 2.5
  }) : null), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: strike && isOn ? 'var(--fg-3)' : 'inherit',
      textDecoration: strike && isOn ? 'line-through' : 'none',
      textDecorationColor: 'var(--border-strong)',
      transition: 'color var(--dur-base) var(--ease-out)'
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    h: 30,
    fs: 13,
    px: 10
  },
  md: {
    h: 36,
    fs: 14,
    px: 12
  },
  lg: {
    h: 44,
    fs: 15,
    px: 14
  }
};
function Input({
  label,
  hint,
  error,
  icon,
  trailing,
  size = 'md',
  variant = 'outlined',
  disabled,
  id,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const autoId = React.useId ? React.useId() : undefined;
  const inputId = id || autoId;
  const s = SIZES[size] || SIZES.md;
  const bare = variant === 'bare';
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--border-2)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--fg-2)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: bare ? undefined : s.h,
      padding: bare ? 0 : '0 ' + s.px + 'px',
      background: bare ? 'transparent' : disabled ? 'var(--surface-2)' : 'var(--surface-1)',
      border: bare ? 'none' : '1px solid ' + borderColor,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus && !bare ? error ? '0 0 0 3px oklch(57% 0.09 25 / 0.18)' : 'var(--ring)' : 'none',
      color: 'var(--fg-3)',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)'
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  }) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      onFocus && onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      onBlur && onBlur(e);
    },
    style: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      padding: bare ? '4px 0' : 0,
      fontFamily: 'inherit',
      fontSize: bare ? 'var(--text-md)' : s.fs,
      color: disabled ? 'var(--fg-disabled)' : 'var(--fg-1)',
      boxShadow: 'none',
      ...inputStyle
    }
  }, rest)), trailing), error || hint ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: error ? 'var(--danger-fg)' : 'var(--fg-3)'
    }
  }, error || hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  checked,
  onChange,
  label,
  name,
  value,
  disabled,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--fg-1)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    name: name,
    value: value,
    checked: !!checked,
    disabled: disabled,
    onChange: e => onChange && onChange(value, e),
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
      margin: 0,
      pointerEvents: 'none'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      flexShrink: 0,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1.5px solid ' + (checked ? 'var(--accent)' : hover ? 'var(--fg-3)' : 'var(--border-strong)'),
      transition: 'border-color var(--dur-fast) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--accent)',
      transform: checked ? 'scale(1)' : 'scale(0)',
      transition: 'transform var(--dur-fast) var(--ease-out)'
    }
  })), label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    h: 30,
    fs: 13
  },
  md: {
    h: 36,
    fs: 14
  },
  lg: {
    h: 44,
    fs: 15
  }
};
function Select({
  label,
  options = [],
  size = 'md',
  disabled,
  id,
  style,
  onFocus,
  onBlur,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const autoId = React.useId ? React.useId() : undefined;
  const selId = id || autoId;
  const s = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--fg-2)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selId,
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      onFocus && onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      onBlur && onBlur(e);
    },
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height: s.h,
      padding: '0 34px 0 12px',
      fontFamily: 'inherit',
      fontSize: s.fs,
      color: disabled ? 'var(--fg-disabled)' : 'var(--fg-1)',
      background: disabled ? 'var(--surface-2)' : 'var(--surface-1)',
      border: '1px solid ' + (focus ? 'var(--accent)' : 'var(--border-2)'),
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? 'var(--ring)' : 'none',
      outline: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)'
    }
  }, rest), options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 10,
      pointerEvents: 'none',
      color: 'var(--fg-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevrons-up-down",
    size: 15
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked,
  defaultChecked,
  onChange,
  label,
  size = 'md',
  disabled,
  style,
  ...rest
}) {
  const [inner, setInner] = React.useState(!!defaultChecked);
  const isOn = checked !== undefined ? checked : inner;
  const w = size === 'sm' ? 26 : 32,
    h = size === 'sm' ? 16 : 18,
    k = h - 4;
  const toggle = e => {
    if (disabled) return;
    if (checked === undefined) setInner(!isOn);
    onChange && onChange(!isOn, e);
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--fg-1)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: isOn,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
      margin: 0,
      pointerEvents: 'none'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: w,
      height: h,
      flexShrink: 0,
      borderRadius: 999,
      background: isOn ? 'var(--accent)' : 'var(--border-strong)',
      transition: 'background var(--dur-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: 2,
      width: k,
      height: k,
      borderRadius: '50%',
      background: 'var(--gray-0)',
      boxShadow: 'var(--shadow-1)',
      transform: isOn ? 'translateX(' + (w - h) + 'px)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-out)'
    }
  })), label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange,
  variant = 'segmented',
  size = 'md',
  fullWidth,
  style
}) {
  const h = size === 'sm' ? 26 : 30;
  if (variant === 'underline') {
    return /*#__PURE__*/React.createElement("div", {
      role: "tablist",
      style: {
        display: 'flex',
        gap: 20,
        borderBottom: '1px solid var(--border-1)',
        fontFamily: 'var(--font-sans)',
        ...style
      }
    }, items.map(it => {
      const on = it.value === value;
      return /*#__PURE__*/React.createElement("button", {
        key: it.value,
        role: "tab",
        "aria-selected": on,
        type: "button",
        onClick: () => onChange && onChange(it.value),
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: 0,
          marginBottom: -1,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          borderBottom: '1.5px solid ' + (on ? 'var(--fg-1)' : 'transparent'),
          color: on ? 'var(--fg-1)' : 'var(--fg-3)',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 500,
          transition: 'color var(--dur-fast) var(--ease-out)'
        }
      }, it.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
        name: it.icon,
        size: 15
      }) : null, it.label);
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      gap: 2,
      padding: 2,
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-sunken)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, items.map(it => {
    const on = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      role: "tab",
      "aria-selected": on,
      "aria-label": it.label ? undefined : it.value,
      type: "button",
      onClick: () => onChange && onChange(it.value),
      style: {
        flex: fullWidth ? 1 : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: h,
        padding: it.label ? '0 12px' : '0 8px',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        background: on ? 'var(--surface-1)' : 'transparent',
        color: on ? 'var(--fg-1)' : 'var(--fg-3)',
        boxShadow: on ? 'var(--shadow-1)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)'
      }
    }, it.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 15
    }) : null, it.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/FocusView.jsx
try { (() => {
function FocusView({
  task,
  durations,
  onExit,
  onComplete
}) {
  const {
    ProgressRing,
    IconButton,
    Tabs,
    Tooltip
  } = StillNS;
  const [mode, setMode] = React.useState('focus');
  const total = durations[mode] * 60;
  const [left, setLeft] = React.useState(total);
  const [running, setRunning] = React.useState(false);
  const [sessions, setSessions] = React.useState(1);
  React.useEffect(() => {
    setLeft(durations[mode] * 60);
    setRunning(false);
  }, [mode]);
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft(l => {
      if (l <= 1) {
        setRunning(false);
        if (mode === 'focus') {
          setSessions(s => s + 1);
          onComplete && onComplete();
        }
        return 0;
      }
      return l - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [running, mode]);
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'Escape') onExit();
      if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        setRunning(r => !r);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, '0'),
    ss = String(left % 60).padStart(2, '0');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 40,
      background: 'var(--bg-app)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 16,
      left: 16
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    label: "Exit focus",
    shortcut: "Esc",
    placement: "bottom"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "x",
    label: "Exit focus",
    onClick: onExit
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 24,
      right: 24,
      display: 'flex',
      gap: 6
    }
  }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: i < sessions ? 'var(--accent)' : 'var(--border-2)'
    }
  }))), /*#__PURE__*/React.createElement(Tabs, {
    items: [{
      value: 'focus',
      label: 'Focus'
    }, {
      value: 'short',
      label: 'Short break'
    }, {
      value: 'long',
      label: 'Long break'
    }],
    value: mode,
    onChange: setMode
  }), /*#__PURE__*/React.createElement(ProgressRing, {
    value: 1 - left / total,
    size: 320,
    stroke: 3,
    color: mode === 'focus' ? 'var(--accent)' : 'var(--fg-3)'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-display)',
      lineHeight: 1,
      letterSpacing: 'var(--tracking-display)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, mm, ":", ss), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      maxWidth: 220,
      textAlign: 'center',
      fontSize: 14,
      color: 'var(--fg-2)',
      lineHeight: 1.4,
      textWrap: 'balance'
    }
  }, mode === 'focus' ? task ? task.title : 'Open focus' : 'Step away from the screen')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    label: "Reset"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "rotate-ccw",
    label: "Reset",
    onClick: () => {
      setLeft(total);
      setRunning(false);
    }
  })), /*#__PURE__*/React.createElement(IconButton, {
    icon: running ? 'pause' : 'play',
    label: running ? 'Pause' : 'Start',
    variant: "accent",
    size: "lg",
    round: true,
    onClick: () => setRunning(!running),
    style: {
      width: 56,
      height: 56
    }
  }), /*#__PURE__*/React.createElement(Tooltip, {
    label: "Skip"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "skip-forward",
    label: "Skip",
    onClick: () => setLeft(1)
  }))));
}
Object.assign(window, {
  FocusView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/FocusView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ListView.jsx
try { (() => {
function ListView({
  eyebrow,
  title,
  groups,
  projects,
  onAdd,
  onToggle,
  onFocus,
  hideCompleted,
  showDue,
  emptyText = 'Nothing left for today.'
}) {
  const {
    Icon
  } = StillNS;
  const [showDone, setShowDone] = React.useState(false);
  const projById = Object.fromEntries(projects.map(p => [p.id, p]));
  const all = groups.flatMap(g => g.tasks);
  const open = all.filter(t => !t.done).length;
  const done = all.filter(t => t.done);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: '56px 32px 96px'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: '0 12px',
      marginBottom: 20
    }
  }, eyebrow ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--fg-3)',
      marginBottom: 4
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 32,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--fg-3)'
    }
  }, open, " left"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--border-1)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(CaptureRow, {
    onAdd: onAdd
  })), groups.map(g => {
    const rows = g.tasks.filter(t => !t.done || !hideCompleted && !g.collapseDone);
    return /*#__PURE__*/React.createElement("section", {
      key: g.key,
      style: {
        marginTop: g.label ? 20 : 0
      }
    }, g.label ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 12px 6px',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--fg-2)'
      }
    }, g.label) : null, rows.filter(t => !t.done).map(t => /*#__PURE__*/React.createElement(TaskRow, {
      key: t.id,
      task: t,
      project: projById[t.project],
      onToggle: onToggle,
      onFocus: onFocus,
      showDue: showDue
    })));
  }), open === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '48px 12px',
      textAlign: 'center',
      color: 'var(--fg-3)',
      fontSize: 15
    }
  }, emptyText) : null, !hideCompleted && done.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowDone(!showDone),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      padding: '0 12px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--fg-3)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: showDone ? 'chevron-down' : 'chevron-right',
    size: 14
  }), "Completed", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11
    }
  }, done.length)), showDone ? done.map(t => /*#__PURE__*/React.createElement(TaskRow, {
    key: t.id,
    task: t,
    project: projById[t.project],
    onToggle: onToggle,
    onFocus: onFocus
  })) : null) : null));
}
Object.assign(window, {
  ListView
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ListView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SettingsView.jsx
try { (() => {
function SettingRow({
  title,
  desc,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '16px 0',
      borderBottom: '1px solid var(--border-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 500
    }
  }, title), desc ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--fg-3)',
      marginTop: 2
    }
  }, desc) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0
    }
  }, children));
}
function SettingsView({
  theme,
  setTheme,
  hideCompleted,
  setHideCompleted,
  durations,
  setDurations
}) {
  const {
    Tabs,
    Switch,
    Select,
    Radio
  } = StillNS;
  const [tab, setTab] = React.useState('general');
  const [chime, setChime] = React.useState('gentle');
  const [autoBreak, setAutoBreak] = React.useState(true);
  const [dnd, setDnd] = React.useState(true);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 600,
      margin: '0 auto',
      padding: '56px 32px 96px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 20px',
      fontSize: 32,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2
    }
  }, "Settings"), /*#__PURE__*/React.createElement(Tabs, {
    variant: "underline",
    items: [{
      value: 'general',
      label: 'General'
    }, {
      value: 'focus',
      label: 'Focus'
    }],
    value: tab,
    onChange: setTab
  }), tab === 'general' ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SettingRow, {
    title: "Appearance",
    desc: "Dark is easier on the eyes at night."
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: [{
      value: 'light',
      icon: 'sun'
    }, {
      value: 'dark',
      icon: 'moon'
    }],
    value: theme,
    onChange: setTheme
  })), /*#__PURE__*/React.createElement(SettingRow, {
    title: "Week starts on"
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    options: ['Monday', 'Sunday'],
    style: {
      width: 130
    }
  })), /*#__PURE__*/React.createElement(SettingRow, {
    title: "Hide completed",
    desc: "Finished tasks leave the list."
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: hideCompleted,
    onChange: setHideCompleted
  }))) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SettingRow, {
    title: "Session length"
  }, /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    style: {
      width: 130
    },
    value: String(durations.focus),
    onChange: e => setDurations({
      ...durations,
      focus: Number(e.target.value)
    }),
    options: [{
      value: '25',
      label: '25 min'
    }, {
      value: '50',
      label: '50 min'
    }, {
      value: '90',
      label: '90 min'
    }]
  })), /*#__PURE__*/React.createElement(SettingRow, {
    title: "Start breaks automatically"
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: autoBreak,
    onChange: setAutoBreak
  })), /*#__PURE__*/React.createElement(SettingRow, {
    title: "Silence notifications",
    desc: "During focus sessions only."
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: dnd,
    onChange: setDnd
  })), /*#__PURE__*/React.createElement(SettingRow, {
    title: "End-of-session sound"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20
    }
  }, [['gentle', 'Gentle'], ['none', 'None']].map(([v, l]) => /*#__PURE__*/React.createElement(Radio, {
    key: v,
    name: "chime",
    value: v,
    label: l,
    checked: chime === v,
    onChange: setChime
  })))))));
}
Object.assign(window, {
  SettingsView,
  SettingRow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SettingsView.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Sidebar.jsx
try { (() => {
function SidebarItem({
  icon,
  color,
  label,
  count,
  active,
  onClick
}) {
  const {
    Icon
  } = StillNS;
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      height: 32,
      padding: '0 10px',
      border: 'none',
      borderRadius: 6,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: active ? 500 : 400,
      textAlign: 'left',
      background: active ? 'var(--surface-active)' : hover ? 'var(--surface-hover)' : 'transparent',
      color: active ? 'var(--fg-1)' : 'var(--fg-2)',
      transition: 'background var(--dur-fast) var(--ease-out)'
    }
  }, icon ? /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 16
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      display: 'flex',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: color
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, label), count ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--fg-3)'
    }
  }, count) : null);
}
function Sidebar({
  view,
  onNavigate,
  projects,
  counts,
  onNewProject,
  onStartFocus
}) {
  const {
    IconButton,
    Tooltip,
    Button
  } = StillNS;
  const PROJ_COLORS = {
    sage: 'var(--sage-500)',
    mist: 'var(--mist-500)',
    amber: 'var(--amber-500)',
    moss: 'var(--moss-500)',
    clay: 'var(--clay-500)'
  };
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--sidebar-width)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-2)',
      borderRight: '1px solid var(--border-1)',
      padding: '14px 10px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 4px 0 10px',
      height: 34
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: '-0.04em'
    }
  }, "still"), /*#__PURE__*/React.createElement(Tooltip, {
    label: "Search",
    shortcut: "\u2318K",
    placement: "bottom"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "search",
    size: "sm",
    label: "Search"
  }))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(SidebarItem, {
    icon: "sun",
    label: "Today",
    count: counts.today,
    active: view === 'today',
    onClick: () => onNavigate('today')
  }), /*#__PURE__*/React.createElement(SidebarItem, {
    icon: "calendar",
    label: "Upcoming",
    count: counts.upcoming,
    active: view === 'upcoming',
    onClick: () => onNavigate('upcoming')
  }), /*#__PURE__*/React.createElement(SidebarItem, {
    icon: "inbox",
    label: "Inbox",
    count: counts.inbox,
    active: view === 'inbox',
    onClick: () => onNavigate('inbox')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 4px 0 10px',
      marginTop: 24,
      height: 28
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 'var(--tracking-caps)',
      textTransform: 'uppercase',
      color: 'var(--fg-3)'
    }
  }, "Projects"), /*#__PURE__*/React.createElement(Tooltip, {
    label: "New project"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "plus",
    size: "sm",
    label: "New project",
    onClick: onNewProject
  }))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      marginTop: 2
    }
  }, projects.map(p => /*#__PURE__*/React.createElement(SidebarItem, {
    key: p.id,
    color: PROJ_COLORS[p.color] || p.color,
    label: p.name,
    count: counts[p.id],
    active: view === p.id,
    onClick: () => onNavigate(p.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    icon: "play",
    onClick: onStartFocus,
    style: {
      flex: 1
    }
  }, "Focus"), /*#__PURE__*/React.createElement(Tooltip, {
    label: "Settings",
    shortcut: ","
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "settings",
    label: "Settings",
    active: view === 'settings',
    onClick: () => onNavigate('settings')
  }))));
}
Object.assign(window, {
  Sidebar,
  SidebarItem
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/TaskRow.jsx
try { (() => {
const StillNS = window.StillDesignSystem_5e6a28;
function TaskRow({
  task,
  project,
  onToggle,
  onFocus,
  showDue
}) {
  const {
    Checkbox,
    Tag,
    IconButton,
    Tooltip
  } = StillNS;
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      padding: '0 6px 0 12px',
      borderRadius: 8,
      background: hover ? 'var(--surface-hover)' : 'transparent',
      transition: 'background var(--dur-fast) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    shape: "round",
    strike: true,
    checked: task.done,
    onChange: () => onToggle(task.id),
    label: task.title,
    style: {
      flex: 1,
      minWidth: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0
    }
  }, showDue && task.due ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--fg-3)'
    }
  }, task.due) : null, project ? /*#__PURE__*/React.createElement(Tag, {
    color: project.color
  }, project.name) : null, task.est ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--fg-3)',
      width: 28,
      textAlign: 'right'
    }
  }, task.est, "m") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      opacity: hover && !task.done ? 1 : 0,
      transition: 'opacity var(--dur-fast) var(--ease-out)'
    }
  }, !task.done ? /*#__PURE__*/React.createElement(Tooltip, {
    label: "Focus on this",
    shortcut: "F"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "play",
    size: "sm",
    label: "Focus on this",
    onClick: () => onFocus(task)
  })) : null)));
}
function CaptureRow({
  onAdd,
  placeholder = 'What needs doing?'
}) {
  const {
    Input,
    Icon
  } = StillNS;
  const [val, setVal] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      padding: '0 12px',
      color: 'var(--fg-3)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), /*#__PURE__*/React.createElement(Input, {
    variant: "bare",
    value: val,
    placeholder: placeholder,
    style: {
      flex: 1
    },
    inputStyle: {
      fontSize: 15
    },
    onChange: e => setVal(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && val.trim()) {
        onAdd(val.trim());
        setVal('');
      }
    }
  }), val ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--fg-3)'
    }
  }, "\u21B5") : null);
}
Object.assign(window, {
  TaskRow,
  CaptureRow,
  StillNS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/TaskRow.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ProgressRing = __ds_scope.ProgressRing;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
