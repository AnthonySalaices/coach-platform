import { ZodError } from "zod";

/** Thrown by guards/handlers; carries an HTTP status that `toErrorResponse` maps. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

/**
 * Single funnel for turning thrown errors into safe JSON responses. Validation
 * errors → 400; guard errors → their status; everything else → 500 with the
 * detail logged server-side only (never leaked to the client).
 */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof ZodError) {
    return Response.json(
      {
        error: "Invalid request.",
        issues: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  if (err instanceof HttpError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("Unhandled error:", err);
  return Response.json({ error: "Internal server error." }, { status: 500 });
}
