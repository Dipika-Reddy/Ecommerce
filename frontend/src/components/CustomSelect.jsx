import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * CustomSelect — a fully styled, portal-rendered dropdown.
 * Options list is appended to <body> so it can NEVER be clipped
 * by overflow:hidden parents, and is always viewport-clamped.
 *
 * Props:
 *  value        – current selected value (string)
 *  onChange     – (value: string) => void
 *  options      – string[] or { value, label }[]
 *  placeholder  – text shown when no value selected
 *  disabled     – bool
 *  className    – extra class for the trigger button
 */
const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Normalise options → [{ value, label }]
  const normalised = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const selected = normalised.find((o) => String(o.value) === String(value));

  // Calculate position so menu never leaves the viewport
  const positionMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const optCount = Math.max(normalised.length, 1);
    const itemH = 40;
    const menuHeight = Math.min(optCount * itemH + 16, 280);
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Open above or below?
    const spaceBelow = viewportH - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    const top = openAbove
      ? rect.top + scrollY - menuHeight - 4
      : rect.bottom + scrollY + 4;

    // Align with trigger left edge, but clamp so it doesn't overflow right
    const menuWidth = Math.max(rect.width, 160);
    const rawLeft = rect.left + scrollX;
    const maxLeft = viewportW + scrollX - menuWidth - 8;
    const left = Math.max(8 + scrollX, Math.min(rawLeft, maxLeft));

    setMenuStyle({ top, left, width: menuWidth });
  }, [normalised.length]);

  const openMenu = () => {
    if (disabled) return;
    positionMenu();
    setOpen(true);
  };

  // Close on outside click; reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onScroll = () => positionMenu();
    const onResize = () => positionMenu();
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, positionMenu]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  // Portal menu
  const menu = ReactDOM.createPortal(
    <ul
      ref={menuRef}
      role="listbox"
      style={{
        position: 'absolute',
        top: menuStyle.top,
        left: menuStyle.left,
        width: menuStyle.width,
        zIndex: 99999,
        maxHeight: 280,
      }}
      className="overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl shadow-slate-200/60 ring-1 ring-slate-900/5 animate-scale-in"
    >
      {normalised.map((opt) => {
        const isActive = String(opt.value) === String(value);
        return (
          <li
            key={opt.value}
            role="option"
            aria-selected={isActive}
            onClick={() => handleSelect(opt.value)}
            className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors select-none ${
              isActive
                ? 'bg-orange-50 text-orange-600 font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isActive && (
              <svg className="h-3.5 w-3.5 shrink-0 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {!isActive && <span className="w-3.5 shrink-0" />}
            {opt.label}
          </li>
        );
      })}
    </ul>,
    document.body
  );

  return (
    <>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-left shadow-sm transition-all
          hover:border-orange-400 hover:shadow-md
          focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400
          disabled:cursor-not-allowed disabled:opacity-50
          ${open ? 'border-orange-400 ring-2 ring-orange-400/30' : ''}
          ${className}`}
      >
        <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && menu}
    </>
  );
};

export default CustomSelect;
