import { authService } from '../services/authService.js';
import { ok, created } from '../utils/response.js';

export const authController = {
  register: async (req, res) => created(res, await authService.register(req.body)),
  login: async (req, res) => ok(res, await authService.login(req.body)),
  me: (req, res) => ok(res, { user: req.user })
};
