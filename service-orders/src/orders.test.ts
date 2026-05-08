import {
  calculateSubtotal,
  calculateDiscount,
  calculateTax,
  calculateTotal,
  validateItems,
  canTransition,
  OrderItem
} from './orders';

const sampleItems: OrderItem[] = [
  { productId: 'p1', quantity: 2, unitPrice: 10 },
  { productId: 'p2', quantity: 1, unitPrice: 5 }
];

describe('calculateSubtotal', () => {
  it('sums item lines', () => {
    expect(calculateSubtotal(sampleItems)).toBe(25);
  });

  it('returns 0 for empty items', () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});

describe('calculateDiscount', () => {
  it('gives no discount under $100', () => {
    expect(calculateDiscount(50)).toBe(0);
    expect(calculateDiscount(99.99)).toBe(0);
  });

  it('gives 5% between $100 and $500', () => {
    expect(calculateDiscount(100)).toBeCloseTo(5);
    expect(calculateDiscount(200)).toBeCloseTo(10);
    expect(calculateDiscount(499)).toBeCloseTo(24.95);
  });

  it('gives 10% over $500', () => {
    expect(calculateDiscount(500)).toBeCloseTo(50);
    expect(calculateDiscount(1000)).toBeCloseTo(100);
  });
});

describe('calculateTax', () => {
  it('applies 21% VAT to discounted amount by default', () => {
    expect(calculateTax(100, 0)).toBeCloseTo(21);
    expect(calculateTax(100, 5)).toBeCloseTo(19.95);
  });

  it('respects custom tax rate', () => {
    expect(calculateTax(100, 0, 0.1)).toBeCloseTo(10);
  });
});

describe('calculateTotal', () => {
  it('returns zeros for empty order', () => {
    expect(calculateTotal([])).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0 });
  });

  it('computes a small order with no discount', () => {
    const r = calculateTotal(sampleItems);
    expect(r.subtotal).toBe(25);
    expect(r.discount).toBe(0);
    expect(r.tax).toBeCloseTo(5.25, 2);
    expect(r.total).toBeCloseTo(30.25, 2);
  });

  it('applies tiered discount and VAT for a $200 subtotal', () => {
    const r = calculateTotal([{ productId: 'p', quantity: 2, unitPrice: 100 }]);
    expect(r.subtotal).toBe(200);
    expect(r.discount).toBe(10);
    expect(r.tax).toBeCloseTo(39.9, 2);
    expect(r.total).toBeCloseTo(229.9, 2);
  });

  it('rounds to 2 decimals', () => {
    const r = calculateTotal([{ productId: 'p', quantity: 3, unitPrice: 0.1 }]);
    expect(r.subtotal).toBe(0.3);
    expect(r.total).toBeCloseTo(0.36, 2);
  });
});

describe('validateItems', () => {
  it('accepts valid items', () => {
    const r = validateItems(sampleItems);
    expect(r.ok).toBe(true);
  });

  it('rejects non-array', () => {
    expect(validateItems('hello').ok).toBe(false);
    expect(validateItems(null).ok).toBe(false);
  });

  it('rejects empty array', () => {
    expect(validateItems([]).ok).toBe(false);
  });

  it('rejects too many items', () => {
    const items = Array.from({ length: 101 }, () => ({
      productId: 'p',
      quantity: 1,
      unitPrice: 1
    }));
    expect(validateItems(items).ok).toBe(false);
  });

  it('rejects missing productId', () => {
    expect(validateItems([{ quantity: 1, unitPrice: 1 }]).ok).toBe(false);
  });

  it('rejects negative quantity', () => {
    expect(validateItems([{ productId: 'p', quantity: -1, unitPrice: 1 }]).ok).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    expect(validateItems([{ productId: 'p', quantity: 1.5, unitPrice: 1 }]).ok).toBe(false);
  });

  it('rejects negative price', () => {
    expect(validateItems([{ productId: 'p', quantity: 1, unitPrice: -1 }]).ok).toBe(false);
  });
});

describe('canTransition', () => {
  it('allows pending → paid', () => {
    expect(canTransition('pending', 'paid')).toBe(true);
  });

  it('allows pending → cancelled', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true);
  });

  it('allows paid → shipped', () => {
    expect(canTransition('paid', 'shipped')).toBe(true);
  });

  it('allows shipped → delivered', () => {
    expect(canTransition('shipped', 'delivered')).toBe(true);
  });

  it('rejects pending → shipped (must pay first)', () => {
    expect(canTransition('pending', 'shipped')).toBe(false);
  });

  it('rejects delivered → anything (terminal)', () => {
    expect(canTransition('delivered', 'cancelled')).toBe(false);
    expect(canTransition('delivered', 'paid')).toBe(false);
  });

  it('rejects cancelled → anything (terminal)', () => {
    expect(canTransition('cancelled', 'paid')).toBe(false);
  });
});
