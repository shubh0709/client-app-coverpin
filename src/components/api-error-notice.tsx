const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Shared banner for API load failures — used on the entities, analytics, and
 * upload pages. The backend runs on Render's free tier, which spins down
 * after inactivity, so a fresh request can take up to ~2 minutes to wake it
 * back up; callers hit this constantly, so the message is spelled out here. */
export function ApiErrorNotice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      <p>{message}</p>
      <p className="mt-1">
        This backend runs on a free hosting tier and may be asleep — it can take up to 2 minutes to
        wake up after being idle. Please wait a moment and try again. If you&apos;re running it
        locally, make sure the backend is up at <code>{API_URL}</code>.
      </p>
    </div>
  );
}
