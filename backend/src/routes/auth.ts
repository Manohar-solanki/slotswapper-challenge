import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../models';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'slotswapper-secret';

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const db = await getDb();
  const hashed = await bcrypt.hash(password, 10);
  try {
    const result = await db.run(
      'INSERT INTO users (name, email, passwordHash) VALUES (?, ?, ?)',
      [name, email, hashed]
    );
    res.status(201).json({ id: result.lastID, name, email });
  } catch (e) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const user: any = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

export default router;