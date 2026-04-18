import { prisma } from "../../shared/prisma";
import type { Prisma } from "@prisma/client";

async function createUser(data: Prisma.UserCreateInput) {
  return await prisma.user.create({
    data,
  });
}

async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

export const AuthRepository = {
  createUser,
  getUserByEmail,
};
