"use client";
import Link from "next/link";
import {
  History,
  Layers,
  Settings,
  HardDrive,
  ChevronRight,
  BookOpen,
} from "lucide-react";
export function MorePage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR READING SPACE</p>
          <h1>
            A little more<span className="accent">.</span>
          </h1>
        </div>
      </div>
      <div className="more-profile">
        <span className="avatar large">M</span>
        <div>
          <h2>My reading space</h2>
          <p>Personal · stored on this device</p>
        </div>
      </div>
      <div className="more-list">
        {[
          {
            href: "/history/",
            icon: History,
            title: "Reading history",
            text: "Every chapter, right where you left it.",
          },
          {
            href: "/sources/",
            icon: Layers,
            title: "Sources",
            text: "Manage your catalogs and check connections.",
          },
          {
            href: "/settings/",
            icon: Settings,
            title: "Settings",
            text: "Appearance, reader, and content preferences.",
          },
          {
            href: "/settings/?tab=data",
            icon: HardDrive,
            title: "Data & offline",
            text: "Back up your library and save demo chapters.",
          },
        ].map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href}>
            <Icon size={24} />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
            <ChevronRight size={20} />
          </Link>
        ))}
      </div>
      <div className="info-card">
        <BookOpen size={28} />
        <h3>ManhwaHub · Version 1</h3>
        <p>
          Your personal reader, with original demo stories and public Kitsu
          metadata. No account needed. Keep JSON backups to move your library to
          another browser.
        </p>
      </div>
    </>
  );
}
