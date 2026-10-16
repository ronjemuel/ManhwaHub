"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Home,
  Library,
  MoreHorizontal,
  Search,
  History,
  Layers,
  Settings,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "./app-context";
const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse/", label: "Browse", icon: Compass },
  { href: "/library/", label: "Library", icon: Library },
  { href: "/more/", label: "More", icon: MoreHorizontal },
];
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    { data, error } = useApp();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (path.startsWith("/reader")) return <>{children}</>;
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          Manhwa<span>Hub</span>
        </Link>
        <p className="nav-caption">YOUR READING SPACE</p>
        <nav>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                path === href || path === href.slice(0, -1) ? "active" : ""
              }
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-secondary">
          <Link href="/history/">
            <History size={19} />
            Reading history
          </Link>
          <Link href="/sources/">
            <Layers size={19} />
            Sources
          </Link>
          <Link href="/settings/">
            <Settings size={19} />
            Settings
          </Link>
        </div>
        <div className="local-profile">
          <span className="avatar">M</span>
          <div>
            <strong>My reading space</strong>
            <small>Personal · saved on this device</small>
          </div>
        </div>
      </aside>
      <header className="topbar">
        <Link className="mobile-brand" href="/">
          <BookOpen size={21} />
          ManhwaHub
        </Link>
        <span className="desktop-breadcrumb">
          Your next chapter starts here
        </span>
        <Link
          className="search-link"
          href="/browse/"
          aria-label="Search titles"
        >
          <Search size={18} />
          <span>Search titles, discover stories</span>
        </Link>
        <Link
          className="icon-button"
          href="/settings/"
          aria-label="Open settings"
        >
          <Settings size={20} />
        </Link>
      </header>
      <main id="main" className="main">
        {offline && (
          <div className="offline-banner">
            <WifiOff size={16} />
            You’re offline. Saved data and cached demo chapters remain
            available.
          </div>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error} <Link href="/settings/?tab=data">Open Data settings</Link>
          </div>
        )}
        {children}
        <footer>
          ManhwaHub <span>·</span> Your stories. Your pace.{" "}
          <span className="footer-meta">
            {data.settings.enabledSources.length} sources enabled
          </span>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            className={
              path === href || path === href.slice(0, -1) ? "active" : ""
            }
            href={href}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
