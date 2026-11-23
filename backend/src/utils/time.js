export const now = () => new Date();
export const addMinutes = (minutes, from = new Date()) => new Date(from.getTime() + minutes * 60000);
