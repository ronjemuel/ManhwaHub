"use client";
import { useState } from "react";
import { ImageOff, RotateCcw } from "lucide-react";
import type { Page } from "@/types";
export function PageImage({
  page,
  eager = false,
}: {
  page: Page;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  return (
    <div
      className="page-image"
      style={{ aspectRatio: `${page.width}/${page.height}` }}
    >
      {failed ? (
        <div className="image-error" role="alert">
          <ImageOff size={32} />
          <h3>This page didn’t load</h3>
          <p>Check your connection, then try again.</p>
          <button
            className="button"
            onClick={(e) => {
              e.stopPropagation();
              setFailed(false);
              setRetry((n) => n + 1);
            }}
          >
            <RotateCcw size={16} />
            Retry image
          </button>
        </div>
      ) : (
        <img
          key={retry}
          src={page.url}
          width={page.width}
          height={page.height}
          alt={page.alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
