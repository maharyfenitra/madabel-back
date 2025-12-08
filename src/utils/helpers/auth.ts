import type { FastifyRequest } from "fastify";

/**
 * Authentication and authorization helpers
 */

export interface AuthenticatedUser {
  userId: number;
  role: string;
  email?: string;
}

/**
 * Extract authenticated user from request
 */
export function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser | null {
  const user = (request as any).user;
  
  if (!user || !user.userId || !user.role) {
    return null;
  }

  return {
    userId: user.userId,
    role: user.role,
    email: user.email,
  };
}

/**
 * Check if user has one of the required roles
 */
export function hasRole(user: AuthenticatedUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthenticatedUser | null): boolean {
  return hasRole(user, 'ADMIN');
}

/**
 * Check if user is evaluator
 */
export function isEvaluator(user: AuthenticatedUser | null): boolean {
  return hasRole(user, 'EVALUATOR');
}

/**
 * Check if user is candidat
 */
export function isCandidat(user: AuthenticatedUser | null): boolean {
  return hasRole(user, 'CANDIDAT');
}

/**
 * Check if user owns the resource (userId matches)
 */
export function ownsResource(user: AuthenticatedUser | null, resourceUserId: number): boolean {
  return user?.userId === resourceUserId;
}

/**
 * Check if user can access resource (admin or owner)
 */
export function canAccessResource(
  user: AuthenticatedUser | null,
  resourceUserId: number
): boolean {
  if (!user) return false;
  return isAdmin(user) || ownsResource(user, resourceUserId);
}
