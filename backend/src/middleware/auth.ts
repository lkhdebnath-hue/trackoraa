import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user: any;
    }
  }
}

export interface IRequestWithUser extends Request {
  user: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'trackora_jwt_secret_key_change_in_production_12345';

export const protect = async (req: IRequestWithUser, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Token is invalid or user no longer exists.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account is suspended.' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Auth protect error:', error);
    return res.status(401).json({ message: 'Not authorized. Token verification failed.' });
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: IRequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    next();
  };
};

export const hasPermission = (permission: string) => {
  return (req: IRequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (req.user.role === 'super_admin') {
      return next(); // Super admin always has all permissions
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ message: 'You do not have the required permission.' });
    }

    next();
  };
};
