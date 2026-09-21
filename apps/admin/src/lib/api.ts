import { connectDb } from "@bookoran/db";
import { NextResponse } from "next/server";
import { ZodError, type TypeOf, type ZodTypeAny } from "zod";
import { activeAdmin } from "./session";

/**
 * Shared plumbing for the admin API.
 *
 * Every handler goes through `route()`, which connects to the database,
 * requires a session and turns thrown errors into one consistent JSON shape:
 *
 *   success  the resource, or { items: [...] }
 *   failure  { error: { code, message, fields? } }
 *
 * The admin is behind a login, so error messages here can be specific — they
 * help whoever is running the shop understand what went wrong. Nothing in
 * this file is reachable without a session.
 */

export type ApiSession = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
};

/** Thrown by handlers to produce a specific status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function fail(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}

type Ctx<P> = { params: Promise<P> };

type Handler<P> = (args: {
  req: Request;
  params: P;
  session: ApiSession;
}) => Promise<NextResponse | Response>;

/**
 * Wraps a route handler: connect, authenticate, run, translate errors.
 *
 * `owner` restricts a route to the owner role — used for anything that
 * changes money or access, where a packer account has no business.
 */
export function route<P = Record<string, never>>(
  handler: Handler<P>,
  options: { owner?: boolean } = {},
) {
  // `ctx` is declared non-optional because Next's generated route types
  // require it; it is still read defensively, since a route with no dynamic
  // segment carries no params.
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      // Confirmed against the database, not just the JWT — a deactivated or
      // deleted account loses access on its next request, and a demotion
      // takes effect without waiting for a new sign-in.
      const user = await activeAdmin();
      if (!user) {
        return fail(401, "unauthenticated", "Session expirée ou absente.");
      }

      if (options.owner && user.role !== "owner") {
        return fail(403, "forbidden", "Réservé au gérant.");
      }

      await connectDb();

      const params = ((await ctx?.params) ?? {}) as P;
      return await handler({ req, params, session: user });
    } catch (error) {
      return translate(error);
    }
  };
}

function translate(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.status, error.code, error.message, error.fields);
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      fields[issue.path.join(".") || "_"] = issue.message;
    }
    return fail(422, "invalid_body", "Données invalides.", fields);
  }

  const e = error as {
    name?: string;
    code?: number;
    message?: string;
    errors?: Record<string, { message: string }>;
    keyValue?: Record<string, unknown>;
  };

  // Mongoose rejected the document — surface which field and why, because
  // these messages carry the real rules (integer money, required weight).
  if (e?.name === "ValidationError" && e.errors) {
    const fields: Record<string, string> = {};
    for (const [path, detail] of Object.entries(e.errors)) {
      fields[path] = detail.message;
    }
    return fail(422, "invalid_document", "Données invalides.", fields);
  }

  if (e?.name === "CastError") {
    return fail(400, "bad_identifier", "Identifiant invalide.");
  }

  if (e?.code === 11000) {
    const field = Object.keys(e.keyValue ?? {})[0] ?? "champ";
    return fail(409, "duplicate", `Ce ${field} existe déjà.`);
  }

  // Anything unrecognised is a bug. Log it for the server and stay vague to
  // the client rather than leaking a stack trace into the admin UI.
  console.error("[api]", error);
  return fail(500, "server_error", "Erreur inattendue côté serveur.");
}

/**
 * Parses and validates a JSON body. Throws ZodError, caught by route().
 *
 * Typed on the schema rather than on a bare T so the result carries the
 * schema's OUTPUT type — otherwise a field with `.default()` still reads as
 * possibly undefined at the call site.
 */
export async function body<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<TypeOf<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "bad_json", "Corps de requête illisible.");
  }
  return schema.parse(raw);
}

export function notFound(what = "Ressource"): never {
  throw new ApiError(404, "not_found", `${what} introuvable.`);
}
