"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h2>This page could not load.</h2>
      <p>
        Your saved data is still on this device. Try loading the page again.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
