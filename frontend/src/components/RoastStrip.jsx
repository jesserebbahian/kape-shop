import { api } from '../api/client.js';
import { fmtDate, fmtDateTime } from '../utils/format.js';
import { useLoad } from '../hooks/useLoad.js';

export default function RoastStrip() {
  const { data, loading, error } = useLoad((signal) => api('/batches', { signal }));
  const batches = data?.data || [];
  const next = batches.find((b) => b.remainingUnits > 0);

  return (
    <section className="roast" aria-label="Next roast batch">
      <div className="wrap">
        <div>
          <h2>{next ? `Next roast: ${fmtDate(next.roastDate)}` : 'Roast schedule'}</h2>
          <p>
            {next
              ? `Every bag is roasted to order. Order before ${fmtDateTime(next.cutoffAt)} to join this batch.`
              : loading ? 'Checking the next roast date…' : error ? 'Reconnect to check the roast schedule.' : 'No batch is open right now. Check back for the next roast date.'}
          </p>
        </div>
        {next && (
          <div>
            <strong>{next.remainingUnits} of {next.capacityUnits} bags left</strong>
            <div className="bar" role="img" aria-label={`${next.remainingUnits} of ${next.capacityUnits} bags left`}>
              <span style={{ width: `${(next.remainingUnits / next.capacityUnits) * 100}%` }} />
            </div>
            <p className="muted" style={{ color: 'inherit', opacity: 0.85 }}>A 500g bag counts as two bags.</p>
          </div>
        )}
      </div>
    </section>
  );
}
