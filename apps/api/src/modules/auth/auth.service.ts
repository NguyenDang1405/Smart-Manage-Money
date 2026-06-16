import { HashUtils } from "../../shared/hash";
import { JWTUtils } from "../../shared/jwt";
import { AppError } from "../../shared/app-error";
import { AuthRepository } from "./auth.repository";
import type { RegisterInput, LoginInput, GoogleLoginInput } from "./auth.schema";
import crypto from "crypto";

async function register(data: RegisterInput) {
  const existingUser = await AuthRepository.getUserByEmail(data.email);
  if (existingUser) {
    throw new AppError({
      message: "User with this email already exists",
      status: 409,
      code: "CONFLICT",
    });
  }

  const hashedPassword = await HashUtils.hashPassword(data.password);

  const newUser = await AuthRepository.createUser({
    email: data.email,
    fullName: data.fullName,
    passwordHash: hashedPassword,
  });

  // Exclude passwordHash from the return value
  const { passwordHash: _, ...userWithoutPassword } = newUser;

  const token = JWTUtils.generateToken({ userId: newUser.id, email: newUser.email });

  return {
    user: userWithoutPassword,
    token,
  };
}

async function login(data: LoginInput) {
  // Step 1: Find user by email
  const user = await AuthRepository.getUserByEmail(data.email);
  if (!user) {
    throw new AppError({
      message: "Invalid email or password",
      status: 401,
      code: "UNAUTHORIZED",
    });
  }

  // Step 2: Compare password with stored hash
  const isPasswordValid = await HashUtils.comparePassword(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError({
      message: "Invalid email or password",
      status: 401,
      code: "UNAUTHORIZED",
    });
  }

  // Step 3: Generate JWT token
  const token = JWTUtils.generateToken({ userId: user.id, email: user.email });

  // Step 4: Exclude passwordHash from the return value
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

async function googleLogin(data: GoogleLoginInput) {
  let user = await AuthRepository.getUserByEmail(data.email);

  if (!user) {
    const randomPassword = crypto.randomUUID();
    const hashedPassword = await HashUtils.hashPassword(randomPassword);

    user = await AuthRepository.createUser({
      email: data.email,
      fullName: data.fullName || data.email.split("@")[0],
      avatarUrl: data.avatarUrl || null,
      passwordHash: hashedPassword,
    });
  }

  const token = JWTUtils.generateToken({ userId: user.id, email: user.email });
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

export const AuthService = {
  register,
  login,
  googleLogin,
};

// Refactored: fix(auth): handle expired token refreshes on API client

// Refactored: fix(auth): handle expired token refreshes on API client
