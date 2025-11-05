import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDb } } from '../models';

const router = Router();
router.use(authenticateToken);

// GET all swappable slots (not owned by current user)
router.get('/swappable-slots', async (req: any, res) => {
  const db = await getDb();
  const slots = await db.all(
    `SELECT e.*, u.name as ownerName 
     FROM events e 
     JOIN users u ON e.userId = u.id 
     WHERE e.status = 'SWAPPABLE' AND e.userId != ?`,
    [req.user.id]
  );
  res.json(slots);
});

// POST swap request
router.post('/swap-request', async (req: any, res) => {
  const { mySlotId, theirSlotId } = req.body;
  const db = await getDb();
  const tx = await db.transaction(async () => {
    const mySlot: any = await db.get('SELECT * FROM events WHERE id = ? AND userId = ?', [mySlotId, req.user.id]);
    const theirSlot: any = await db.get('SELECT * FROM events WHERE id = ? AND status = "SWAPPABLE"', [theirSlotId]);
    if (!mySlot || !theirSlot) return res.status(400).json({ error: 'Invalid slots' });

    // Lock both slots
    await db.run('UPDATE events SET status = "SWAP_PENDING" WHERE id IN (?, ?)', [mySlotId, theirSlotId]);
    const result = await db.run(
      'INSERT INTO swap_requests (requesterSlotId, targetSlotId, status) VALUES (?, ?, "PENDING")',
      [mySlotId, theirSlotId]
    );
    return { id: result.lastID };
  });
  res.status(201).json(tx);
});

// POST swap response
router.post('/swap-response/:requestId', async (req: any, res) => {
  const { accept } = req.body;
  const requestId = req.params.requestId;
  const db = await getDb();

  const tx = await db.transaction(async () => {
    const request: any = await db.get('SELECT * FROM swap_requests WHERE id = ?', [requestId]);
    if (!request || request.status !== 'PENDING') return res.status(400).json({ error: 'Invalid request' });

    const slotA = await db.get('SELECT * FROM events WHERE id = ?', [request.requesterSlotId]);
    const slotB = await db.get('SELECT * FROM events WHERE id = ?', [request.targetSlotId]);
    if (!slotA || !slotB) return res.status(400).json({ error: 'Slots missing' });

    if (accept) {
      // Swap ownership
      await db.run('UPDATE events SET userId = ?, status = "BUSY" WHERE id = ?', [slotB.userId, slotA.id]);
      await db.run('UPDATE events SET userId = ?, status = "BUSY" WHERE id = ?', [slotA.userId, slotB.id]);
      await db.run('UPDATE swap_requests SET status = "ACCEPTED" WHERE id = ?', [requestId]);
    } else {
      // Restore to swappable
      await db.run('UPDATE events SET status = "SWAPPABLE" WHERE id IN (?, ?)', [slotA.id, slotB.id]);
      await db.run('UPDATE swap_requests SET status = "REJECTED" WHERE id = ?', [requestId]);
    }
  });

  res.json({ success: true });
});

export default router;