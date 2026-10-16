"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, BookOpen, ChevronRight, X } from "lucide-react";
import type { Series, ReadingProgress } from "@/types";
import { seriesHref } from "@/utils/links";
export function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`button ${props.className || ""}`}>
      {children}
    </button>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={28} />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Something needs attention</strong>
        <p>{message}</p>
        {retry && <Button onClick={retry}>Try again</Button>}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div aria-label="Loading" role="status" className="grid-cards">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton" />
          <div className="skeleton line" />
        </div>
      ))}
    </div>
  );
}
export function Cover({
  series,
  className = "",
}: {
  series: Series;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return series.cover && !broken ? (
    <img
      className={`cover ${className}`}
      src={series.cover}
      alt={`${series.title} cover`}
      width={390}
      height={554}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  ) : (
    <div className={`cover cover-fallback ${className}`}>
      <BookOpen />
      <span>{series.title}</span>
    </div>
  );
}
export function SeriesCard({
  series,
  progress,
}: {
  series: Series;
  progress?: ReadingProgress;
}) {
  return (
    <Link className="series-card" href={seriesHref(series)}>
      <div className="cover-wrap">
        <Cover series={series} />
        <span className="cover-label">{series.format}</span>
        {["mature", "explicit"].includes(series.contentRating) && (
          <span className="age-label">
            {series.contentRating === "explicit" ? "18+ Explicit" : "Mature"}
          </span>
        )}
        {progress && (
          <div className="card-progress">
            <span
              style={{ width: `${Math.round(progress.fraction * 100)}%` }}
            />
          </div>
        )}
      </div>
      <h3>{series.title}</h3>
      <p>
        {progress
          ? `Chapter ${progress.chapterNumber ?? "—"} · ${Math.round(progress.fraction * 100)}%`
          : series.sourceId.startsWith("demo")
            ? "Original demo"
            : `Kitsu · ${series.status}`}
      </p>
    </Link>
  );
}
export function Shelf({
  title,
  children,
  href,
  eyebrow,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  eyebrow?: string;
}) {
  return (
    <section className="shelf">
      <div className="section-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {href && (
          <Link className="text-link" href={href}>
            View all <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    else if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
