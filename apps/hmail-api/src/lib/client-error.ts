import { Prisma } from "@prisma/client";

const DB_UNAVAILABLE_MESSAGE =
  "PMail+ cannot reach the server database right now. Please try again in a minute. If this continues, contact your administrator.";

const SERVICE_BUSY_MESSAGE =
  "PMail+ is temporarily unavailable. Please wait a moment and try again.";

function isDatabaseUnreachable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P1001") return true;
  if (err instanceof Error) {
    return /can't reach database|database server|ECONNREFUSED|connection refused|invalid `prisma\./i.test(
      err.message,
    );
  }
  return false;
}

export function toClientError(
  err: unknown,
  fallback = SERVICE_BUSY_MESSAGE,
): { message: string; status: number; code?: string } {
  if (isDatabaseUnreachable(err)) {
    return { message: DB_UNAVAILABLE_MESSAGE, status: 503, code: "database_unavailable" };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
    return {
      message:
        "PMail+ database schema is out of date on the server. Ask your administrator to run migrations and restart the API.",
      status: 503,
      code: "schema_out_of_date",
    };
  }

  if (err instanceof Error) {
    if (/database schema is out of date/i.test(err.message)) {
      return { message: err.message, status: 503, code: "schema_out_of_date" };
    }
    return { message: err.message, status: 400 };
  }

  return { message: fallback, status: 500, code: "internal_error" };
}
