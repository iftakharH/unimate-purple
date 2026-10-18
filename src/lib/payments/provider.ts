import "server-only";

/**
 * Payment provider seam (spec §7). A real gateway can replace the mock by
 * implementing this interface — the app only ever talks to `paymentProvider`.
 *
 * Guardrails that hold for EVERY implementation:
 * - never collect, store or log card numbers / CVV / expiry — only the method
 *   type, status, amount, transaction id and timestamps are persisted;
 * - no real money moves here; this is a campus sandbox.
 */

export type PaymentMethod = "card" | "mobile_wallet" | "bank";

export type CreatedPayment = {
  transactionId: string;
  amountBdt: number;
};

export type ConfirmedPayment =
  | { ok: true; status: "succeeded" }
  | { ok: false; status: "failed"; failureReason: string };

export interface PaymentProvider {
  /** Registers a payment intent and returns its sandbox transaction id. */
  createPayment(input: {
    amountBdt: number;
    method: PaymentMethod;
    dealId: string;
  }): Promise<CreatedPayment>;
  /** Confirms the (mock) charge. Deterministic success in the sandbox. */
  confirmPayment(transactionId: string): Promise<ConfirmedPayment>;
  /** Simulated refund — admins only (enforced by the database trigger). */
  refund(transactionId: string): Promise<{ ok: boolean }>;
}

/**
 * The only implementation in this build. Deterministic on purpose: a demo
 * checkout that occasionally fails teaches nothing — failures are exercised
 * by the admin refund/simulation paths instead (Phase 9).
 */
class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: {
    amountBdt: number;
    method: PaymentMethod;
    dealId: string;
  }): Promise<CreatedPayment> {
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    return {
      transactionId: `MOCK-${Date.now().toString(36).toUpperCase()}-${random}`,
      amountBdt: input.amountBdt,
    };
  }

  async confirmPayment(transactionId: string): Promise<ConfirmedPayment> {
    void transactionId; // sandbox: the mock charge always succeeds
    return { ok: true, status: "succeeded" };
  }

  async refund(transactionId: string): Promise<{ ok: boolean }> {
    void transactionId; // sandbox: simulated refund
    return { ok: true };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
