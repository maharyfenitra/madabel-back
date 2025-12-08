import type { FastifyReply } from "fastify";

/**
 * Error handling helpers
 */

export interface ApiError {
  error: string;
  details?: string;
  statusCode?: number;
}

/**
 * Send a standardized error response
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  error?: any
): FastifyReply {
  console.error(`❌ Error (${statusCode}):`, message, error);

  const response: ApiError = {
    error: message,
    statusCode,
  };

  // Include details in development mode
  if (process.env.NODE_ENV === 'development' && error) {
    response.details = error.message || String(error);
  }

  return reply.status(statusCode).send(response);
}

/**
 * Send a 400 Bad Request error
 */
export function sendBadRequest(
  reply: FastifyReply,
  message: string = "Requête invalide"
): FastifyReply {
  return sendError(reply, 400, message);
}

/**
 * Send a 401 Unauthorized error
 */
export function sendUnauthorized(
  reply: FastifyReply,
  message: string = "Utilisateur non authentifié"
): FastifyReply {
  return sendError(reply, 401, message);
}

/**
 * Send a 403 Forbidden error
 */
export function sendForbidden(
  reply: FastifyReply,
  message: string = "Accès interdit"
): FastifyReply {
  return sendError(reply, 403, message);
}

/**
 * Send a 404 Not Found error
 */
export function sendNotFound(
  reply: FastifyReply,
  message: string = "Ressource non trouvée"
): FastifyReply {
  return sendError(reply, 404, message);
}

/**
 * Send a 409 Conflict error
 */
export function sendConflict(
  reply: FastifyReply,
  message: string = "Conflit avec une ressource existante"
): FastifyReply {
  return sendError(reply, 409, message);
}

/**
 * Send a 500 Internal Server Error
 */
export function sendInternalError(
  reply: FastifyReply,
  message: string = "Erreur interne du serveur",
  error?: any
): FastifyReply {
  return sendError(reply, 500, message, error);
}

/**
 * Async error handler wrapper for route handlers
 */
export function asyncHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error: any) {
      const reply = args[1] as FastifyReply;
      return sendInternalError(reply, "Erreur interne du serveur", error) as any;
    }
  };
}
