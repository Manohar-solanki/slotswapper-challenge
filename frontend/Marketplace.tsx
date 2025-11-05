import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Marketplace() {
  const [slots, setSlots] = useState<any[]>([]);
  const [mySlots, setMySlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [offerSlot, setOfferSlot] = useState<number | null>(null);

  useEffect(() => {
    api.get('/swappable-slots').then(res => setSlots(res.data));
    api.get('/events').then(res => setMySlots(res.data.filter((e: any) => e.status === 'SWAPPABLE')));
  }, []);

  const requestSwap = () => {
    if (!selectedSlot || !offerSlot) return;
    api.post('/swap-request', { mySlotId: offerSlot, theirSlotId: selectedSlot })
      .then(() => alert('Swap requested!'));
  };

  return (
    <div>
      <h2>Marketplace</h2>
      {slots.map(slot => (
        <div key={slot.id} onClick={() => setSelectedSlot(slot.id)}>
          {slot.title} – {slot.startTime} (by {slot.ownerName})
          {selectedSlot === slot.id && (
            <div>
              <select onChange={e => setOfferSlot(Number(e.target.value))}>
                <option value="">Choose your slot</option>
                {mySlots.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <button onClick={requestSwap}>Request Swap</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}