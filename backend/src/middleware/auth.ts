import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type UserRole = 'WHOLESALER' | 'RETAILER' | 'ADMIN' | 'MAIN_WHOLESALER' | 'SALESMAN';

export interface AuthPayload {
  id: string;
  role: UserRole;
  wholesaler_id: string | null;
  retailer_id?: string;
  main_wholesaler_id?: string;
  salesman_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: no token' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};

export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Forbidden: ${role} role required` });
    }
    next();
  };
};

export const requireAnyRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: One of [${roles.join(', ')}] roles required` });
    }
    next();
  };
};
