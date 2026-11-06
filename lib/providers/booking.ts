/** Booking.com Demand requires approved partner access. Never substitute Places data for rates. */
export function bookingStatus() {
  return {
    connected: false as const,
    reason:
      'Live booking inventory is not implemented. Approved partner credentials, contract-specific response mapping and sandbox validation are required before enabling this adapter.',
  };
}
