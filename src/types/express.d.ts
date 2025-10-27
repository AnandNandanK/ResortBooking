// src/types/express.d.ts
import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface User extends User {} // extends Prisma User type
  }
}
