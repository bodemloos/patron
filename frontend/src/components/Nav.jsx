import { NavLink } from "react-router-dom";
import { useStore } from "../store.js";
import Logo from "./Logo.jsx";

const ALL_LINKS = [
  {
    to: "/floor",
    label: "Floor",
    icon: IconFloor,
    roles: ["manager", "waiter"],
  },
  {
    to: "/kitchen",
    label: "Kitchen",
    icon: IconKitchen,
    roles: ["manager", "kitchen"],
  },
  { to: "/bar", label: "Bar", icon: IconBar, roles: ["manager", "bar"] },
  {
    to: "/reservations",
    label: "Reservations",
    icon: IconCalendar,
    roles: ["manager", "waiter"],
  },
  { to: "/customers", label: "Customers", icon: IconUsers, roles: ["manager"] },
  { to: "/items", label: "Menu", icon: IconMenu, roles: ["manager"] },
  { to: "/stock", label: "Stock", icon: IconStock, roles: ["manager"] },
  { to: "/staff", label: "Staff", icon: IconStaff, roles: ["manager"] },
  { to: "/schedule", label: "Schedule", icon: IconClock, roles: ["manager"] },
  { to: "/contracts", label: "Contracts", icon: IconDoc, roles: ["manager"] },
  { to: "/rsz", label: "RSZ / ONSS", icon: IconShield, roles: ["manager"] },
  { to: "/reports", label: "Reports", icon: IconReports, roles: ["manager"] },
  { to: "/settings", label: "Settings", icon: IconCog, roles: ["manager"] },
];

export default function Nav() {
  const role = useStore((s) => s.role);
  const links = ALL_LINKS.filter((l) => l.roles.includes(role));

  return (
    <>
      {/* Sidebar — hidden below md */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white dark:bg-surface-900 border-r border-slate-200 dark:border-white/5 flex-col">
        <div
          className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 cursor-pointer"
          onClick={() => (window.location.href = "/welcome.html")}
        >
          <Logo size={28} className="text-brand-600 dark:text-brand-400" />
          <div>
            <div className="font-semibold leading-tight">Patron</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Restaurant manager
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                    isActive
                      ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-800",
                  ].join(" ")
                }
              >
                <Icon className="w-4 h-4" />
                {l.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-200 dark:border-white/5 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>v1.0 — sample data</span>
          <a
            href="/welcome.html"
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 dark:text-brand-400 hover:underline"
            title="Marketing landing page"
          >
            About ↗
          </a>
        </div>
      </aside>

      {/* Bottom tab bar — visible below md only */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-surface-900 border-t border-slate-200 dark:border-white/5 flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                [
                  "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                  isActive
                    ? "text-brand-700 dark:text-brand-400"
                    : "text-slate-500 dark:text-slate-400",
                ].join(" ")
              }
            >
              <Icon className="w-5 h-5" />
              <span className="truncate">{l.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

/* Lightweight inline SVG icons — no extra deps */
function svg(props, children) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

function IconFloor(p) {
  return svg(
    p,
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="3.5" />
      <rect x="3" y="14" width="7" height="7" rx="3.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  );
}
function IconKitchen(p) {
  return svg(
    p,
    <>
      <path d="M5 3v8a4 4 0 0 0 8 0V3" />
      <path d="M9 3v6" />
      <path d="M17 3l3 5v3a3 3 0 1 1-6 0V8z" />
    </>
  );
}
function IconBar(p) {
  return svg(
    p,
    <>
      <path d="M3 4h18l-7 9v6" />
      <path d="M14 19h-4" />
      <path d="M10 19v-6L3 4" />
    </>
  );
}
function IconMenu(p) {
  return svg(
    p,
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </>
  );
}
function IconStock(p) {
  return svg(
    p,
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  );
}
function IconStaff(p) {
  return svg(
    p,
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  );
}
function IconReports(p) {
  return svg(
    p,
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-6 4 4 5-7" />
    </>
  );
}
function IconCalendar(p) {
  return svg(
    p,
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
    </>
  );
}
function IconUsers(p) {
  return svg(
    p,
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <circle cx="17" cy="9" r="3" />
      <path d="M22 19a5 5 0 0 0-7-4.5" />
    </>
  );
}
function IconClock(p) {
  return svg(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  );
}
function IconCog(p) {
  return svg(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  );
}
function IconDoc(p) {
  return svg(
    p,
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  );
}
function IconShield(p) {
  return svg(
    p,
    <>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  );
}
