import { test, expect } from "./fixtures";
import { users, coupons } from "./test-data";

// US-101 coupon rules, generated with samy-qa-plugin (coupon-boundary-testing skill).
test.describe("US-101 SAVE10 (10%, capped at ₹200)", () => {
  test("US-101: SAVE10 on ₹1000 gives ₹100 off", async ({ api }) => {
    const { status, body } = await api.validateCoupon(
      coupons.percent,
      1000,
      users.standard.email,
    );
    expect(status).toBe(200);
    expect(body.discount).toBe(100);
  });

  test("US-101: SAVE10 discount is capped at ₹200", async ({ api }) => {
    const { body } = await api.validateCoupon(
      coupons.percent,
      5000,
      users.standard.email,
    );
    expect(body.discount).toBe(200);
  });
});

test.describe("US-101 FLAT100 minimum subtotal", () => {
  test("US-101: FLAT100 is rejected below ₹500", async ({ api }) => {
    const { status } = await api.validateCoupon(
      coupons.flat,
      499,
      users.standard.email,
    );
    expect(status).not.toBe(200);
  });
});

test.describe("US-101 invalid and expired codes", () => {
  test("US-101: SUMMER25 is expired", async ({ api }) => {
    const { status, body } = await api.validateCoupon(
      coupons.expired,
      1000,
      users.standard.email,
    );
    expect(status).not.toBe(200);
    expect(JSON.stringify(body)).toContain("This coupon has expired");
  });

  test("US-101: unknown code is invalid", async ({ api }) => {
    const { status, body } = await api.validateCoupon(
      "NOPE",
      1000,
      users.standard.email,
    );
    expect(status).not.toBe(200);
    expect(JSON.stringify(body)).toContain("Invalid coupon code");
  });
});
