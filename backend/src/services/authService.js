import bcrypt from 'bcryptjs';
import { userRepo } from '../repositories/users.js';
import { AppError } from '../utils/errors.js';
import { signToken } from '../middleware/auth.js';

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

export const authService = {
  async register({ email, password, name }) {
    if (await userRepo.findByEmail(email)) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    let id;
    try {
      id = await userRepo.create({ email, name, passwordHash, role: 'customer' });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      throw error;
    }
    const user = await userRepo.findById(id);
    return { user: publicUser(user), token: signToken(user) };
  },

  async login({ email, password }) {
    const user = await userRepo.findByEmail(email);
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    return { user: publicUser(user), token: signToken(user) };
  },

  publicUser
};
