const TRANSITIONS = {
  pending_payment: ['paid', 'cancelled', 'expired'],
  paid: ['roasting'],
  roasting: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  expired: []
};

export const OrderStateMachine = {
  states: Object.keys(TRANSITIONS),
  canTransition: (from, to) => (TRANSITIONS[from] || []).includes(to),
  allowedFrom: (from) => TRANSITIONS[from] || []
};
