import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { userRepo } from '../repositories/users.js';

export const authenticate = async (req, res, next) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  let user;
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    user = await userRepo.findById(Number(payload.sub));
  } catch {
    return next(new AppError(401, 'INVALID_TOKEN', 'Token is invalid or expired'));
  }
  if (!user) return next(new AppError(401, 'INVALID_TOKEN', 'Token is invalid or expired'));
  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  return next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not have access to this resource'));
  }
  return next();
};

export const signToken = (user) => jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpires });
