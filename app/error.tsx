'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>Something interrupted your journey.</h1>
      <p>Please try again. Your trip has not been saved.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
