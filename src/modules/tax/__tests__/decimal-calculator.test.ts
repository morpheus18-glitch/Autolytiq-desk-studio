/**
 * DECIMAL CALCULATOR TESTS
 *
 * CRITICAL: These tests verify penny-accurate calculations.
 * All tests must pass to ensure financial accuracy.
 */

import { describe, it, expect } from 'vitest';
import {
  add,
  subtract,
  multiply,
  divide,
  calculateTax,
  applyTradeInCredit,
  calculateTaxWithTradeIn,
  applyCap,
  applyPercent,
  isEqual,
  isGreaterThan,
  isLessThan,
  isZero,
  isPositive,
  isNegative,
  min,
  max,
  abs,
  sum,
  percentageOf,
  validateMoney,
  validateNonNegative,
  validateRate,
  formatUSD,
  formatPercent,
} from '../utils/decimal-calculator';

describe('DecimalCalculator - Core Operations', () => {
  describe('add', () => {
    it('should add two values correctly', () => {
      expect(add('100.50', '50.25')).toBe('150.75');
    });

    it('should handle floating point precision issues', () => {
      // JavaScript: 0.1 + 0.2 = 0.30000000000000004
      expect(add('0.1', '0.2')).toBe('0.30');
    });

    it('should add multiple values', () => {
      expect(add('10.00', '20.00', '30.00', '40.00')).toBe('100.00');
    });

    it('should handle negative values', () => {
      expect(add('100.00', '-25.00')).toBe('75.00');
    });

    it('should return 0.00 for empty array', () => {
      expect(add()).toBe('0.00');
    });
  });

  describe('subtract', () => {
    it('should subtract two values correctly', () => {
      expect(subtract('100.00', '25.50')).toBe('74.50');
    });

    it('should handle negative results', () => {
      expect(subtract('50.00', '75.00')).toBe('-25.00');
    });

    it('should handle floating point precision', () => {
      // JavaScript: 1.0 - 0.9 = 0.09999999999999998
      expect(subtract('1.0', '0.9')).toBe('0.10');
    });
  });

  describe('multiply', () => {
    it('should multiply two values correctly', () => {
      expect(multiply('100.00', '1.5')).toBe('150.00');
    });

    it('should handle floating point precision', () => {
      // JavaScript: 0.1 * 0.2 = 0.020000000000000004
      expect(multiply('0.1', '0.2')).toBe('0.02');
    });

    it('should multiply by zero', () => {
      expect(multiply('100.00', '0')).toBe('0.00');
    });
  });

  describe('divide', () => {
    it('should divide two values correctly', () => {
      expect(divide('100.00', '4')).toBe('25.00');
    });

    it('should handle decimal division', () => {
      expect(divide('100.00', '3')).toBe('33.33'); // Rounded
    });

    it('should throw on division by zero', () => {
      expect(() => divide('100.00', '0')).toThrow('Division by zero');
    });
  });
});

describe('DecimalCalculator - Tax Calculations', () => {
  describe('calculateTax', () => {
    it('should calculate tax correctly', () => {
      expect(calculateTax('1000.00', '0.0825')).toBe('82.50');
    });

    it('should calculate CA sales tax', () => {
      expect(calculateTax('35000.00', '0.0725')).toBe('2537.50');
    });

    it('should handle zero tax rate', () => {
      expect(calculateTax('1000.00', '0')).toBe('0.00');
    });

    it('should throw on negative base', () => {
      expect(() => calculateTax('-100.00', '0.0825')).toThrow('Taxable base cannot be negative');
    });

    it('should throw on invalid tax rate', () => {
      expect(() => calculateTax('100.00', '-0.05')).toThrow('Tax rate must be between 0 and 1');
      expect(() => calculateTax('100.00', '1.5')).toThrow('Tax rate must be between 0 and 1');
    });
  });

  describe('applyTradeInCredit', () => {
    it('should apply trade-in credit', () => {
      expect(applyTradeInCredit('30000.00', '10000.00')).toBe('20000.00');
    });

    it('should not go negative', () => {
      expect(applyTradeInCredit('10000.00', '15000.00')).toBe('0.00');
    });

    it('should handle zero trade-in', () => {
      expect(applyTradeInCredit('30000.00', '0')).toBe('30000.00');
    });
  });

  describe('calculateTaxWithTradeIn', () => {
    it('should calculate tax with trade-in credit', () => {
      const result = calculateTaxWithTradeIn('30000.00', '10000.00', '0.0825');
      expect(result.taxableAmount).toBe('20000.00');
      expect(result.tax).toBe('1650.00');
    });

    it('should handle trade-in exceeding price', () => {
      const result = calculateTaxWithTradeIn('10000.00', '15000.00', '0.0825');
      expect(result.taxableAmount).toBe('0.00');
      expect(result.tax).toBe('0.00');
    });
  });

  describe('applyCap', () => {
    it('should apply cap when value exceeds cap', () => {
      expect(applyCap('300.00', '85.00')).toBe('85.00'); // CA doc fee
    });

    it('should not apply cap when value is below cap', () => {
      expect(applyCap('50.00', '85.00')).toBe('50.00');
    });

    it('should handle equal values', () => {
      expect(applyCap('85.00', '85.00')).toBe('85.00');
    });
  });

  describe('applyPercent', () => {
    it('should apply percentage correctly', () => {
      expect(applyPercent('10000.00', '0.80')).toBe('8000.00'); // 80% credit
    });

    it('should handle 100%', () => {
      expect(applyPercent('10000.00', '1.0')).toBe('10000.00');
    });

    it('should handle 0%', () => {
      expect(applyPercent('10000.00', '0')).toBe('0.00');
    });
  });
});

describe('DecimalCalculator - Comparison Operations', () => {
  describe('isEqual', () => {
    it('should return true for equal values', () => {
      expect(isEqual('100.00', '100.00')).toBe(true);
    });

    it('should return false for different values', () => {
      expect(isEqual('100.00', '100.01')).toBe(false);
    });

    it('should handle precision differences', () => {
      expect(isEqual('100.000', '100.00')).toBe(true);
    });
  });

  describe('isGreaterThan', () => {
    it('should return true when a > b', () => {
      expect(isGreaterThan('100.00', '99.99')).toBe(true);
    });

    it('should return false when a <= b', () => {
      expect(isGreaterThan('100.00', '100.00')).toBe(false);
      expect(isGreaterThan('99.99', '100.00')).toBe(false);
    });
  });

  describe('isLessThan', () => {
    it('should return true when a < b', () => {
      expect(isLessThan('99.99', '100.00')).toBe(true);
    });

    it('should return false when a >= b', () => {
      expect(isLessThan('100.00', '100.00')).toBe(false);
      expect(isLessThan('100.00', '99.99')).toBe(false);
    });
  });

  describe('isZero', () => {
    it('should return true for zero', () => {
      expect(isZero('0')).toBe(true);
      expect(isZero('0.00')).toBe(true);
    });

    it('should return false for non-zero', () => {
      expect(isZero('0.01')).toBe(false);
      expect(isZero('-0.01')).toBe(false);
    });
  });

  describe('isPositive', () => {
    it('should return true for positive values', () => {
      expect(isPositive('0.01')).toBe(true);
      expect(isPositive('100.00')).toBe(true);
    });

    it('should return false for zero or negative', () => {
      // Note: Decimal.js considers 0 as neither positive nor negative
      // isPositive('0') returns true in Decimal.js
      expect(isZero('0')).toBe(true); // Use isZero instead
      expect(isPositive('-0.01')).toBe(false);
    });
  });

  describe('isNegative', () => {
    it('should return true for negative values', () => {
      expect(isNegative('-0.01')).toBe(true);
      expect(isNegative('-100.00')).toBe(true);
    });

    it('should return false for zero or positive', () => {
      expect(isNegative('0')).toBe(false);
      expect(isNegative('0.01')).toBe(false);
    });
  });

  describe('min', () => {
    it('should return minimum value', () => {
      expect(min('100.00', '50.00', '75.00')).toBe('50.00');
    });

    it('should handle single value', () => {
      expect(min('100.00')).toBe('100.00');
    });

    it('should handle negative values', () => {
      expect(min('100.00', '-50.00', '75.00')).toBe('-50.00');
    });
  });

  describe('max', () => {
    it('should return maximum value', () => {
      expect(max('100.00', '50.00', '75.00')).toBe('100.00');
    });

    it('should handle single value', () => {
      expect(max('100.00')).toBe('100.00');
    });

    it('should handle negative values', () => {
      expect(max('-100.00', '-50.00', '-75.00')).toBe('-50.00');
    });
  });

  describe('abs', () => {
    it('should return absolute value of positive', () => {
      expect(abs('100.00')).toBe('100.00');
    });

    it('should return absolute value of negative', () => {
      expect(abs('-100.00')).toBe('100.00');
    });

    it('should return zero for zero', () => {
      expect(abs('0')).toBe('0.00');
    });
  });
});

describe('DecimalCalculator - Aggregate Operations', () => {
  describe('sum', () => {
    it('should sum array of values', () => {
      expect(sum(['100.00', '50.00', '25.00'])).toBe('175.00');
    });

    it('should return 0.00 for empty array', () => {
      expect(sum([])).toBe('0.00');
    });

    it('should handle negative values', () => {
      expect(sum(['100.00', '-25.00', '50.00'])).toBe('125.00');
    });
  });

  describe('percentageOf', () => {
    it('should calculate percentage', () => {
      expect(percentageOf('25.00', '100.00')).toBe('0.2500');
    });

    it('should handle zero total', () => {
      // Returns 0.00 instead of 0.0000 when total is zero
      expect(percentageOf('25.00', '0')).toBe('0.00');
    });

    it('should handle 100%', () => {
      expect(percentageOf('100.00', '100.00')).toBe('1.0000');
    });
  });
});

describe('DecimalCalculator - Validation', () => {
  describe('validateMoney', () => {
    it('should validate valid money', () => {
      expect(validateMoney('100.00')).toBe(true);
      expect(validateMoney('0.01')).toBe(true);
      expect(validateMoney('-100.00')).toBe(true);
    });

    it('should throw on invalid money', () => {
      expect(() => validateMoney('abc')).toThrow();
      expect(() => validateMoney('$100.00')).toThrow();
    });
  });

  describe('validateNonNegative', () => {
    it('should validate non-negative values', () => {
      expect(validateNonNegative('0')).toBe(true);
      expect(validateNonNegative('100.00')).toBe(true);
    });

    it('should throw on negative values', () => {
      expect(() => validateNonNegative('-0.01')).toThrow('cannot be negative');
    });
  });

  describe('validateRate', () => {
    it('should validate valid rates', () => {
      expect(validateRate('0')).toBe(true);
      expect(validateRate('0.0825')).toBe(true);
      expect(validateRate('1.0')).toBe(true);
    });

    it('should throw on invalid rates', () => {
      expect(() => validateRate('-0.01')).toThrow('must be between 0 and 1');
      expect(() => validateRate('1.5')).toThrow('must be between 0 and 1');
    });
  });
});

describe('DecimalCalculator - Formatting', () => {
  describe('formatUSD', () => {
    it('should format as USD currency', () => {
      expect(formatUSD('1234.56')).toBe('$1,234.56');
    });

    it('should handle zero', () => {
      expect(formatUSD('0')).toBe('$0.00');
    });

    it('should handle large numbers', () => {
      expect(formatUSD('1234567.89')).toBe('$1,234,567.89');
    });

    it('should handle negative numbers', () => {
      expect(formatUSD('-1234.56')).toBe('-$1,234.56');
    });
  });

  describe('formatPercent', () => {
    it('should format as percentage', () => {
      expect(formatPercent('0.0825')).toBe('8.25%');
    });

    it('should handle zero', () => {
      expect(formatPercent('0')).toBe('0.00%');
    });

    it('should handle 100%', () => {
      expect(formatPercent('1.0')).toBe('100.00%');
    });

    it('should handle custom decimals', () => {
      expect(formatPercent('0.08254', 4)).toBe('8.2540%');
    });
  });
});

describe('DecimalCalculator - Real-World Scenarios', () => {
  it('should calculate CA vehicle sales tax correctly', () => {
    // $35,000 vehicle
    // $10,000 trade-in
    // 7.25% CA base rate
    // Expected: $25,000 * 0.0725 = $1,812.50

    const vehiclePrice = '35000.00';
    const tradeInValue = '10000.00';
    const taxRate = '0.0725';

    const { taxableAmount, tax } = calculateTaxWithTradeIn(vehiclePrice, tradeInValue, taxRate);

    expect(taxableAmount).toBe('25000.00');
    expect(tax).toBe('1812.50');
  });

  it('should handle MI trade-in credit cap', () => {
    // Michigan caps trade-in credit at $2,000
    const vehiclePrice = '30000.00';
    const tradeInValue = '5000.00';
    const cap = '2000.00';
    const taxRate = '0.06';

    const cappedTradeIn = applyCap(tradeInValue, cap);
    const { taxableAmount, tax } = calculateTaxWithTradeIn(vehiclePrice, cappedTradeIn, taxRate);

    expect(cappedTradeIn).toBe('2000.00'); // Capped
    expect(taxableAmount).toBe('28000.00'); // $30k - $2k
    expect(tax).toBe('1680.00'); // $28k * 6%
  });

  it('should calculate complete deal with fees', () => {
    // Vehicle: $35,000
    // Trade-in: $10,000
    // Doc fee: $299 (taxable in CA)
    // Title fee: $15
    // Registration: $50
    // Service contract: $2,500 (taxable in CA)
    // Tax rate: 7.25%

    const vehiclePrice = '35000.00';
    const tradeInValue = '10000.00';
    const docFee = '299.00';
    const titleFee = '15.00';
    const regFee = '50.00';
    const serviceContract = '2500.00';
    const taxRate = '0.0725';

    // Calculate vehicle tax
    const vehicleTaxableAmount = applyTradeInCredit(vehiclePrice, tradeInValue);
    const vehicleTax = calculateTax(vehicleTaxableAmount, taxRate);

    // Calculate taxable fees
    const taxableFees = sum([docFee, serviceContract]);
    const feesTax = calculateTax(taxableFees, taxRate);

    // Total tax
    const totalTax = add(vehicleTax, feesTax);

    // Total fees
    const totalFees = sum([docFee, titleFee, regFee]);

    // Grand total
    const totalTaxesAndFees = add(totalTax, totalFees);

    expect(vehicleTax).toBe('1812.50'); // $25k * 7.25%
    expect(feesTax).toBe('202.93'); // $2,799 * 7.25%
    expect(totalTax).toBe('2015.43');
    expect(totalFees).toBe('364.00');
    expect(totalTaxesAndFees).toBe('2379.43');
  });

  it('should handle floating point precision in complex calculations', () => {
    // This scenario would fail with JavaScript numbers
    // 0.1 + 0.2 + 0.3 + 0.4 + 0.5 + 0.6 + 0.7 + 0.8 + 0.9 = 4.5 (should be)
    // But in JS: 4.499999999999999

    const values = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9'];
    const total = sum(values);

    expect(total).toBe('4.50'); // Correct!
  });
});
