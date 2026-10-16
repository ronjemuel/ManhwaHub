import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>This page wandered off.</h1>
      <p>Return to your reading space and choose another story.</p>
      <Link className="button primary" href="/">
        Go home
      </Link>
    </div>
  );
}
