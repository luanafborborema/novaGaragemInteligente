import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SEU_SEGREDO_SUPER_SECRETO_POR_EXEMPLO';

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization || req.headers['Authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido.' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Formato de token inválido.' });

  const scheme = parts[0];
  const token = parts[1];
  if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ error: 'Formato de token inválido.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}
