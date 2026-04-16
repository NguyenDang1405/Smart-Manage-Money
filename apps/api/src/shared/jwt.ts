import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123456";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

type TokenPayload = {
  userId: string;
  email: string;
  iat: number;
  exp: number;
};

type VerifyResult =
  | { valid: true; expired: false; payload: TokenPayload }
  | { valid: false; expired: true; payload: null }
  | { valid: false; expired: false; payload: null };

function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
}

function verifyToken(token: string): VerifyResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return { valid: true, expired: false, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, expired: true, payload: null };
    }
    return { valid: false, expired: false, payload: null };
  }
}

export type { TokenPayload, VerifyResult };
export const JWTUtils = {
  generateToken,
  verifyToken,
};
