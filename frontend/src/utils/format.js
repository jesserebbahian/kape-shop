export const peso = (cents) => `₱${(cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (value) =>
  new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtDateTime = (value) =>
  new Date(value).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const GRIND_LABELS = { whole_bean: 'Whole bean', filter: 'Filter', espresso: 'Espresso' };

export const STATUS_LABELS = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  roasting: 'Roasting',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  expired: 'Expired'
};

