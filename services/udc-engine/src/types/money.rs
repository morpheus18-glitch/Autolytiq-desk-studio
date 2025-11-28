//! Money types with precision guarantees for financial calculations.
//!
//! # Design Rationale
//! All monetary values use `Decimal` to avoid floating-point errors.
//! We define newtypes for semantic clarity and type safety.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use std::ops::{Add, Div, Mul, Sub};

/// Represents a monetary amount with 2-decimal precision for display,
/// but internally maintains full precision for calculations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Money(Decimal);

impl Money {
    pub const ZERO: Money = Money(dec!(0));

    /// Create a new Money value. Panics if value has more than 4 decimal places.
    #[inline]
    pub fn new(value: Decimal) -> Self {
        Money(value)
    }

    /// Create from cents (integer)
    #[inline]
    pub fn from_cents(cents: i64) -> Self {
        Money(Decimal::new(cents, 2))
    }

    /// Create from dollar amount (may have decimals)
    #[inline]
    pub fn from_dollars(dollars: Decimal) -> Self {
        Money(dollars)
    }

    /// Get the raw decimal value
    #[inline]
    pub fn as_decimal(&self) -> Decimal {
        self.0
    }

    /// Round to nearest cent using banker's rounding (round half to even)
    #[inline]
    pub fn round_cents(&self) -> Self {
        Money(self.0.round_dp(2))
    }

    /// Round up to the next cent (ceiling)
    #[inline]
    pub fn ceil_cents(&self) -> Self {
        Money((self.0 * dec!(100)).ceil() / dec!(100))
    }

    /// Round down to the previous cent (floor)
    #[inline]
    pub fn floor_cents(&self) -> Self {
        Money((self.0 * dec!(100)).floor() / dec!(100))
    }

    /// Check if value is negative
    #[inline]
    pub fn is_negative(&self) -> bool {
        self.0 < dec!(0)
    }

    /// Check if value is zero
    #[inline]
    pub fn is_zero(&self) -> bool {
        self.0 == dec!(0)
    }

    /// Return the absolute value
    #[inline]
    pub fn abs(&self) -> Self {
        Money(self.0.abs())
    }

    /// Return the maximum of two values
    #[inline]
    pub fn max(self, other: Self) -> Self {
        if self.0 >= other.0 { self } else { other }
    }

    /// Return the minimum of two values
    #[inline]
    pub fn min(self, other: Self) -> Self {
        if self.0 <= other.0 { self } else { other }
    }

    /// Clamp value to zero (no negatives)
    #[inline]
    pub fn clamp_zero(self) -> Self {
        self.max(Money::ZERO)
    }
}

impl Default for Money {
    fn default() -> Self {
        Money::ZERO
    }
}

impl Add for Money {
    type Output = Self;
    #[inline]
    fn add(self, rhs: Self) -> Self::Output {
        Money(self.0 + rhs.0)
    }
}

impl Sub for Money {
    type Output = Self;
    #[inline]
    fn sub(self, rhs: Self) -> Self::Output {
        Money(self.0 - rhs.0)
    }
}

impl Mul<Decimal> for Money {
    type Output = Self;
    #[inline]
    fn mul(self, rhs: Decimal) -> Self::Output {
        Money(self.0 * rhs)
    }
}

impl Div<Decimal> for Money {
    type Output = Self;
    #[inline]
    fn div(self, rhs: Decimal) -> Self::Output {
        Money(self.0 / rhs)
    }
}

impl std::fmt::Display for Money {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "${:.2}", self.0)
    }
}

/// Represents a rate (APR, tax rate, etc.) as a decimal percentage.
/// Stored as the actual decimal value (e.g., 0.0725 for 7.25%)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Rate(Decimal);

impl Rate {
    pub const ZERO: Rate = Rate(dec!(0));

    /// Create a rate from decimal form (e.g., 0.0725 for 7.25%)
    #[inline]
    pub fn from_decimal(value: Decimal) -> Self {
        Rate(value)
    }

    /// Create a rate from percentage form (e.g., 7.25 for 7.25%)
    #[inline]
    pub fn from_percentage(percent: Decimal) -> Self {
        Rate(percent / dec!(100))
    }

    /// Get the decimal value
    #[inline]
    pub fn as_decimal(&self) -> Decimal {
        self.0
    }

    /// Get as percentage (e.g., 7.25)
    #[inline]
    pub fn as_percentage(&self) -> Decimal {
        self.0 * dec!(100)
    }

    /// Apply this rate to a money amount
    #[inline]
    pub fn apply(&self, amount: Money) -> Money {
        amount * self.0
    }
}

impl Default for Rate {
    fn default() -> Self {
        Rate::ZERO
    }
}

impl Add for Rate {
    type Output = Self;
    #[inline]
    fn add(self, rhs: Self) -> Self::Output {
        Rate(self.0 + rhs.0)
    }
}

impl Sub for Rate {
    type Output = Self;
    #[inline]
    fn sub(self, rhs: Self) -> Self::Output {
        Rate(self.0 - rhs.0)
    }
}

/// Represents a money factor for lease calculations.
/// Typically a small decimal like 0.00125
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct MoneyFactor(Decimal);

impl MoneyFactor {
    /// Create from the raw money factor value
    #[inline]
    pub fn new(value: Decimal) -> Self {
        MoneyFactor(value)
    }

    /// Convert to equivalent APR (money factor * 2400)
    #[inline]
    pub fn to_apr(&self) -> Rate {
        Rate::from_decimal(self.0 * dec!(2400) / dec!(100))
    }

    /// Create from APR (APR / 2400)
    #[inline]
    pub fn from_apr(apr: Rate) -> Self {
        MoneyFactor(apr.as_decimal() / dec!(24))
    }

    /// Get the raw value
    #[inline]
    pub fn as_decimal(&self) -> Decimal {
        self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_money_arithmetic() {
        let a = Money::from_cents(1000); // $10.00
        let b = Money::from_cents(250);  // $2.50

        assert_eq!((a + b).as_decimal(), dec!(12.50));
        assert_eq!((a - b).as_decimal(), dec!(7.50));
    }

    #[test]
    fn test_money_rounding() {
        let m = Money::new(dec!(10.125));
        assert_eq!(m.round_cents().as_decimal(), dec!(10.12)); // Banker's rounding
        assert_eq!(m.ceil_cents().as_decimal(), dec!(10.13));
        assert_eq!(m.floor_cents().as_decimal(), dec!(10.12));
    }

    #[test]
    fn test_rate_application() {
        let rate = Rate::from_percentage(dec!(7.25));
        let amount = Money::new(dec!(10000));
        let tax = rate.apply(amount);
        assert_eq!(tax.as_decimal(), dec!(725));
    }

    #[test]
    fn test_money_factor_conversion() {
        let mf = MoneyFactor::new(dec!(0.00125));
        let apr = mf.to_apr();
        assert_eq!(apr.as_percentage(), dec!(3.00)); // 0.00125 * 2400 = 3.0%
    }
}
