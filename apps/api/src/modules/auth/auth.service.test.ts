import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { HashUtils } from "../../shared/hash";
import { JWTUtils } from "../../shared/jwt";
import { AppError } from "../../shared/app-error";

// Mock the dependencies
vi.mock("./auth.repository", () => ({
  AuthRepository: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock("../../shared/hash", () => ({
  HashUtils: {
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
  },
}));

vi.mock("../../shared/jwt", () => ({
  JWTUtils: {
    generateToken: vi.fn(),
  },
}));

describe("AuthService - register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user successfully and return user details and token", async () => {
    const registerInput = {
      email: "newuser@example.com",
      password: "password123",
      fullName: "John Doe",
    };

    const mockedHashedPassword = "hashed_password_123";
    const mockedCreatedUser = {
      id: "mocked-uuid-1111",
      email: registerInput.email,
      fullName: registerInput.fullName,
      passwordHash: mockedHashedPassword,
      avatarUrl: null,
      monthlyIncome: null,
      currency: "VND",
      createdAt: new Date(),
      updatedAt: null,
    };
    const mockedToken = "mocked_jwt_token";

    // Setup mocks
    vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue(null);
    vi.mocked(HashUtils.hashPassword).mockResolvedValue(mockedHashedPassword);
    vi.mocked(AuthRepository.createUser).mockResolvedValue(mockedCreatedUser as any);
    vi.mocked(JWTUtils.generateToken).mockReturnValue(mockedToken);

    // Execute service method
    const result = await AuthService.register(registerInput);

    // Assertions
    expect(AuthRepository.getUserByEmail).toHaveBeenCalledWith(registerInput.email);
    expect(HashUtils.hashPassword).toHaveBeenCalledWith(registerInput.password);
    expect(AuthRepository.createUser).toHaveBeenCalledWith({
      email: registerInput.email,
      fullName: registerInput.fullName,
      passwordHash: mockedHashedPassword,
    });
    expect(JWTUtils.generateToken).toHaveBeenCalledWith({
      userId: mockedCreatedUser.id,
      email: mockedCreatedUser.email,
    });

    // Verify returning structure (passwordHash must be excluded)
    expect(result).toEqual({
      user: {
        id: mockedCreatedUser.id,
        email: mockedCreatedUser.email,
        fullName: mockedCreatedUser.fullName,
        avatarUrl: null,
        monthlyIncome: null,
        currency: "VND",
        createdAt: mockedCreatedUser.createdAt,
        updatedAt: null,
      },
      token: mockedToken,
    });
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it("should throw an 409 AppError if email already exists", async () => {
    const registerInput = {
      email: "existing@example.com",
      password: "password123",
      fullName: "Existing User",
    };

    const existingUser = {
      id: "existing-uuid",
      email: registerInput.email,
      fullName: registerInput.fullName,
      passwordHash: "existing_hash",
      avatarUrl: null,
      monthlyIncome: null,
      currency: "VND",
      createdAt: new Date(),
      updatedAt: null,
    };

    // Setup mock to return existing user
    vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue(existingUser as any);

    // Execute and assert error
    await expect(AuthService.register(registerInput)).rejects.toThrow(
      new AppError({
        message: "User with this email already exists",
        status: 409,
        code: "CONFLICT",
      })
    );

    // Confirm database write was not called
    expect(AuthRepository.createUser).not.toHaveBeenCalled();
  });
});

describe("AuthService - login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully and return user and token", async () => {
    const loginInput = {
      email: "user@example.com",
      password: "password123",
    };

    const mockedUser = {
      id: "user-uuid",
      email: loginInput.email,
      fullName: "Test User",
      passwordHash: "hashed_password",
      avatarUrl: null,
      monthlyIncome: null,
      currency: "VND",
      createdAt: new Date(),
      updatedAt: null,
    };

    const mockedToken = "valid_token";

    vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue(mockedUser as any);
    vi.mocked(HashUtils.comparePassword).mockResolvedValue(true);
    vi.mocked(JWTUtils.generateToken).mockReturnValue(mockedToken);

    const result = await AuthService.login(loginInput);

    expect(AuthRepository.getUserByEmail).toHaveBeenCalledWith(loginInput.email);
    expect(HashUtils.comparePassword).toHaveBeenCalledWith(loginInput.password, mockedUser.passwordHash);
    expect(result.token).toBe(mockedToken);
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it("should throw 401 AppError if user not found", async () => {
    vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue(null);

    await expect(AuthService.login({ email: "notfound@example.com", password: "any" })).rejects.toThrow(
      new AppError({
        message: "Invalid email or password",
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  });

  it("should throw 401 AppError if password does not match", async () => {
    const mockedUser = { id: "1", email: "a@b.com", passwordHash: "hash" } as any;
    vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue(mockedUser);
    vi.mocked(HashUtils.comparePassword).mockResolvedValue(false);

    await expect(AuthService.login({ email: "a@b.com", password: "wrong" })).rejects.toThrow(
      new AppError({
        message: "Invalid email or password",
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  });
});
