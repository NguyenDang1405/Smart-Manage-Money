import type { Request, Response, NextFunction } from "express";
import { prisma } from "../shared/prisma";
import { clerkClient } from "@clerk/express";
import { AppError } from "../shared/app-error";

// Extend Express Request to include authenticated user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests via Clerk.
 * - Extracts Clerk auth state.
 * - If user is not authenticated, returns 401 UNAUTHORIZED.
 * - Synchronizes Clerk user with our local Prisma database.
 * - Attaches user details to `req.user` for backward compatibility.
 */
async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const clerkAuth = (req as any).auth;

  if (!clerkAuth || !clerkAuth.userId) {
    return next(
      new AppError({
        message: "Authentication required",
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  }

  const clerkId = clerkAuth.userId;

  try {
    // 1. Find user in our local database
    let user = await prisma.user.findUnique({
      where: { clerkId },
    });

    // 2. If user doesn't exist, sync with Clerk
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) {
        return next(
          new AppError({
            message: "User email not found in Clerk",
            status: 400,
            code: "BAD_REQUEST",
          })
        );
      }

      // Check if user already exists with this email (registered before Clerk integration)
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Link existing user to Clerk ID
        user = await prisma.user.update({
          where: { email },
          data: { clerkId },
        });
      } else {
        // Create new user linked to Clerk ID
        user = await prisma.user.create({
          data: {
            clerkId,
            email,
            fullName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email.split("@")[0],
            avatarUrl: clerkUser.imageUrl || null,
          },
        });
      }
    }

    // 3. Attach user payload to request for downstream handlers
    req.user = {
      userId: user.id,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export { authenticate };
