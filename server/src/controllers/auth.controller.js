import * as authService from '../services/auth.service.js';

export async function register(req, res) {
  res.status(201).json({ data: await authService.register(req.body) });
}

export async function login(req, res) {
  res.json({ data: await authService.login(req.body) });
}

export async function me(req, res) {
  res.json({ data: await authService.getCurrentUser(req.user.id) });
}
