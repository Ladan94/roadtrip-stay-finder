import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="empty">
      <h1>This road leads elsewhere.</h1>
      <Link className="button" href="/">
        Return to the planner
      </Link>
    </main>
  );
}
