import { test, expect } from './fixtures';
import { users, coupons, products } from './test-data';

const email = users.standard.email;

test.describe('US-101 AC1: code normalisation', () => {
  test('US-101 AC1: lowercase code is accepted', async ({ api }) => {
    const { status, body } = await api.validateCoupon('save10', 1000, email);
    expect(status).toBe(200);
    expect(body.discount).toBe(100);
  });

  test('US-101 AC1: surrounding spaces are ignored', async ({ api }) => {
    const { status, body } = await api.validateCoupon('  SAVE10  ', 1000, email);
    expect(status).toBe(200);
    expect(body.discount).toBe(100);
  });
});

test.describe('US-101 AC2: SAVE10', () => {
  test('US-101 AC2: SAVE10 on ₹1000 gives ₹100 off', async ({ api }) => {
    const { status, body } = await api.validateCoupon(coupons.percent, 1000, email);
    expect(status).toBe(200);
    expect(body.discount).toBe(100);
  });

  test('US-101 AC2: SAVE10 rounds down to the rupee (₹999 gives ₹99)', async ({ api }) => {
    const { body } = await api.validateCoupon(coupons.percent, 999, email);
    expect(body.discount).toBe(99);
  });

  test('US-101 AC2: SAVE10 is exactly ₹200 at the ₹2000 cap boundary', async ({ api }) => {
    const { body } = await api.validateCoupon(coupons.percent, 2000, email);
    expect(body.discount).toBe(200);
  });

  test('US-101 AC2: SAVE10 stays capped at ₹200 above the cap', async ({ api }) => {
    const { body } = await api.validateCoupon(coupons.percent, 5000, email);
    expect(body.discount).toBe(200);
  });
});

test.describe('US-101 AC3: FLAT100', () => {
  test('US-101 AC3: FLAT100 is rejected at ₹499', async ({ api }) => {
    const { status, body } = await api.validateCoupon(coupons.flat, 499, email);
    expect(status).not.toBe(200);
    expect(body.valid).not.toBe(true);
  });

  // The PO confirmed ₹500 is inclusive.
  test('US-101 AC3: FLAT100 gives ₹100 off at exactly ₹500', async ({ api }) => {
    const { status, body } = await api.validateCoupon(coupons.flat, 500, email);
    expect(status).toBe(200);
    expect(body.discount).toBe(100);
  });

  test('US-101 AC3: FLAT100 gives ₹100 off at ₹501', async ({ api }) => {
    const { status, body } = await api.validateCoupon(coupons.flat, 501, email);
    expect(status).toBe(200);
    expect(body.discount).toBe(100);
  });
});

test.describe('US-101 AC4: WELCOME50', () => {
  test('US-101 AC4: WELCOME50 gives 50% off on a first order', async ({ api }) => {
    const { status, body } = await api.validateCoupon(coupons.firstOrder, 400, email);
    expect(status).toBe(200);
    expect(body.discount).toBe(200);
  });

  test('US-101 AC4: WELCOME50 is capped at ₹250', async ({ api }) => {
    const { body } = await api.validateCoupon(coupons.firstOrder, 1000, email);
    expect(body.discount).toBe(250);
  });

  test('US-101 AC4: WELCOME50 is rejected for a returning shopper', async ({ api }) => {
    const { status, body } = await api.validateCoupon(coupons.firstOrder, 1000, users.returning.email);
    expect(status).not.toBe(200);
    expect(body.valid).not.toBe(true);
  });
});

test.describe('US-101 AC5: expired coupon', () => {
  test('US-101 AC5: SUMMER25 shows "This coupon has expired"', async ({ api }) => {
    const { status, body } = await api.validateCoupon(coupons.expired, 1000, email);
    expect(status).not.toBe(200);
    expect(body.message).toBe('This coupon has expired');
  });
});

test.describe('US-101 AC6: invalid coupon', () => {
  test('US-101 AC6: unknown code shows "Invalid coupon code"', async ({ api }) => {
    const { status, body } = await api.validateCoupon('NOPE', 1000, email);
    expect(status).not.toBe(200);
    expect(body.message).toBe('Invalid coupon code');
  });
});

test.describe('US-101 AC7: order summary', () => {
  test('US-101 AC7: summary shows Subtotal, Discount and Total with SAVE10', async ({ signedInPage: page }) => {
    await page
      .getByRole('listitem')
      .filter({ hasText: products.mouse.name })
      .getByRole('button', { name: 'Add to cart' })
      .click();
    await page.goto('/checkout');

    await page.getByLabel('Coupon code').fill(coupons.percent);
    await page.getByRole('button', { name: 'Apply coupon' }).click();

    await expect(page.getByTestId('coupon-message')).toContainText('SAVE10 applied');
    await expect(page.getByTestId('order-subtotal')).toHaveText('₹799');
    await expect(page.getByTestId('order-discount')).toHaveText('₹79');
    await expect(page.getByTestId('order-total')).toHaveText('₹720');
  });

  test('US-101 AC7: summary shows the expiry message and no discount for SUMMER25', async ({ signedInPage: page }) => {
    await page
      .getByRole('listitem')
      .filter({ hasText: products.mouse.name })
      .getByRole('button', { name: 'Add to cart' })
      .click();
    await page.goto('/checkout');

    await page.getByLabel('Coupon code').fill(coupons.expired);
    await page.getByRole('button', { name: 'Apply coupon' }).click();

    await expect(page.getByTestId('coupon-message')).toHaveText('This coupon has expired');
    await expect(page.getByTestId('order-total')).toHaveText('₹799');
  });
});
