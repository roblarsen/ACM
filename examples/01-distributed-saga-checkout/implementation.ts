import { Request, Response } from 'express';
import { stripeClient } from './stripe';
import { inventoryService } from './inventory';
import { db } from './db';

interface CheckoutPayload {
  orderId: string;
  userId: string;
  items: Array<{ sku: string; quantity: number }>;
  paymentMethodId: string;
  amountCents: number;
}

export async function processCheckout(req: Request, res: Response) {
  const payload: CheckoutPayload = req.body;

  // 1. Reserve inventory across items
  for (const item of payload.items) {
    const available = await inventoryService.checkStock(item.sku, item.quantity);
    if (!available) {
      return res.status(409).json({ error: `Insufficient stock for ${item.sku}` });
    }
    await inventoryService.holdStock(item.sku, item.quantity, payload.orderId);
  }

  // 2. Charge payment via Stripe
  const paymentIntent = await stripeClient.paymentIntents.create({
    amount: payload.amountCents,
    currency: 'usd',
    payment_method: payload.paymentMethodId,
    confirm: true,
  });

  if (paymentIntent.status !== 'succeeded') {
    return res.status(402).json({ error: 'Payment authorization failed' });
  }

  // 3. Commit order record to database
  const order = await db.orders.create({
    data: {
      id: payload.orderId,
      userId: payload.userId,
      amountCents: payload.amountCents,
      status: 'PAID',
      stripeChargeId: paymentIntent.id,
      items: { create: payload.items }
    }
  });

  return res.status(201).json({ success: true, orderId: order.id });
}