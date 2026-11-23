import { User } from '../models/index.js';

export const userRepo = {
  findByEmail: (email) => User.findOne({ where: { email }, raw: true }),
  findById: (id) => User.findByPk(id, { raw: true }),
  create: async ({ email, name, passwordHash, role }) => (await User.create({ email, name, password_hash: passwordHash, role })).id,
  count: () => User.count()
};
