import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthUser extends Partial<DecodedIdToken> {
  id: string;
  uid: string;
  email?: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

export {};
