import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDb } from '../models';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: any, res) => {
  const db = await getDb();
  const events = await db.all('SELECT * FROM events WHERE userId = ?', [req.user.id]);
  res.json(events);
});

router.post('/', async (req: any, res) => {
  const { title, startTime, endTime, status = 'BUSY' } = req.body;
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO events (title, startTime, endTime, status, userId) VALUES (?, ?, ?, ?, ?)',
    [title, startTime, endTime, status, req.user.id]
  );
  res.status(201).json({ id: result.lastID, title, startTime, endTime, status, userId: req.user.id });
});

router.patch('/:id/status', async (req: any, res) => {
  const { status } = req.body;
  if (!['BUSY', 'SWAPPABLE'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const db = await getDb();
  const event = await db.get('SELECT * FROM events WHERE id = ? AND userId = ?', [req.params.id, req.user.id]);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  await db.run('UPDATE events SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ...event, status });
});

export default router;