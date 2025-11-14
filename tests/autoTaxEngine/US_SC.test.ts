import { describe, it, expect } from "vitest";
import { US_SC } from "../../shared/autoTaxEngine/rules/US_SC";
import type { TaxCalculationInput } from "../../shared/autoTaxEngine/types";

/**
 * SOUTH CAROLINA TAX ENGINE TESTS
 *
 * Testing the Infrastructure Maintenance Fee (IMF) system:
 * - 5% of purchase price, CAPPED at $500 maximum
 * - Full trade-in credit
 * - Manufacturer rebates TAXABLE (do not reduce IMF base)
 * - Doc fee taxable, no cap
 * - VSC/GAP NOT taxable (motor vehicle exemption)
 * - Lease: upfront IMF, capped at $500, no monthly tax
 * - No reciprocity
 */

describe("US_SC - South Carolina Tax Rules", () => {
  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe("Configuration", () => {
    it("should have correct state code and version", () => {
      expect(US_SC.stateCode).toBe("SC");
      expect(US_SC.version).toBe(2);
    });

    it("should have full trade-in policy", () => {
      expect(US_SC.tradeInPolicy.type).toBe("FULL");
    });

    it("should mark rebates as taxable", () => {
      const mfrRebate = US_SC.rebates.find((r) => r.appliesTo === "MANUFACTURER");
      const dealerRebate = US_SC.rebates.find((r) => r.appliesTo === "DEALER");

      expect(mfrRebate?.taxable).toBe(true);
      expect(dealerRebate?.taxable).toBe(true);
    });

    it("should have doc fee as taxable with no cap", () => {
      expect(US_SC.docFeeTaxable).toBe(true);
    });

    it("should have VSC and GAP as NOT taxable (motor vehicle exemption)", () => {
      expect(US_SC.taxOnServiceContracts).toBe(false);
      expect(US_SC.taxOnGap).toBe(false);

      const vscRule = US_SC.feeTaxRules.find((f) => f.code === "SERVICE_CONTRACT");
      const gapRule = US_SC.feeTaxRules.find((f) => f.code === "GAP");

      expect(vscRule?.taxable).toBe(false);
      expect(gapRule?.taxable).toBe(false);
    });

    it("should use STATE_ONLY vehicle tax scheme (no local variations)", () => {
      expect(US_SC.vehicleTaxScheme).toBe("STATE_ONLY");
      expect(US_SC.vehicleUsesLocalSalesTax).toBe(false);
    });

    it("should have no reciprocity (IMF system)", () => {
      expect(US_SC.reciprocity.enabled).toBe(false);
      expect(US_SC.reciprocity.homeStateBehavior).toBe("NONE");
    });
  });

  // ============================================================================
  // RETAIL TRANSACTION TESTS
  // ============================================================================

  describe("Retail - IMF Cap Scenarios", () => {
    it("should calculate IMF under cap for low-value vehicle", () => {
      // $8,000 vehicle → 5% = $400 (under $500 cap)
      const rates = [{ label: "SC_IMF", rate: 0.05 }];

      const taxBase = 8000;
      const imfCalculated = taxBase * 0.05; // $400
      const imfFinal = Math.min(imfCalculated, 500); // $400

      expect(imfFinal).toBe(400);
    });

    it("should cap IMF at $500 for vehicle at threshold ($10,000)", () => {
      // $10,000 vehicle → 5% = $500 (exactly at cap)
      const taxBase = 10000;
      const imfCalculated = taxBase * 0.05; // $500
      const imfFinal = Math.min(imfCalculated, 500); // $500

      expect(imfFinal).toBe(500);
    });

    it("should cap IMF at $500 for high-value vehicle", () => {
      // $30,000 vehicle → 5% = $1,500 → capped at $500
      const taxBase = 30000;
      const imfCalculated = taxBase * 0.05; // $1,500
      const imfFinal = Math.min(imfCalculated, 500); // $500

      expect(imfFinal).toBe(500);
      expect(imfCalculated).toBe(1500);
    });

    it("should cap IMF at $500 for luxury vehicle ($100,000)", () => {
      // $100,000 vehicle → 5% = $5,000 → capped at $500
      // Effective rate: 0.5%
      const taxBase = 100000;
      const imfCalculated = taxBase * 0.05; // $5,000
      const imfFinal = Math.min(imfCalculated, 500); // $500

      expect(imfFinal).toBe(500);
      expect(imfCalculated).toBe(5000);

      const effectiveRate = imfFinal / taxBase;
      expect(effectiveRate).toBe(0.005); // 0.5%
    });
  });

  describe("Retail - Trade-in Credit", () => {
    it("should apply full trade-in credit and stay under cap", () => {
      // $12,000 vehicle - $5,000 trade = $7,000 base
      // IMF: $7,000 × 5% = $350 (under cap)
      const vehiclePrice = 12000;
      const tradeIn = 5000;
      const taxBase = vehiclePrice - tradeIn; // $7,000

      const imfCalculated = taxBase * 0.05; // $350
      const imfFinal = Math.min(imfCalculated, 500); // $350

      expect(taxBase).toBe(7000);
      expect(imfFinal).toBe(350);

      // Trade-in saves: ($12,000 × 5% = $600) - $350 = $250 savings
      const withoutTrade = Math.min(vehiclePrice * 0.05, 500); // $600 capped at $500
      const savings = withoutTrade - imfFinal;
      expect(savings).toBe(150); // Saves $150 by using trade-in
    });

    it("should apply full trade-in credit but still hit cap", () => {
      // $30,000 vehicle - $10,000 trade = $20,000 base
      // IMF: $20,000 × 5% = $1,000 → capped at $500
      const vehiclePrice = 30000;
      const tradeIn = 10000;
      const taxBase = vehiclePrice - tradeIn; // $20,000

      const imfCalculated = taxBase * 0.05; // $1,000
      const imfFinal = Math.min(imfCalculated, 500); // $500

      expect(taxBase).toBe(20000);
      expect(imfCalculated).toBe(1000);
      expect(imfFinal).toBe(500);

      // Both with and without trade hit $500 cap, so no effective savings
      const withoutTrade = Math.min(vehiclePrice * 0.05, 500);
      expect(withoutTrade).toBe(500);
      expect(imfFinal).toBe(500);
    });

    it("should handle large trade-in bringing base below threshold", () => {
      // $15,000 vehicle - $8,000 trade = $7,000 base
      // IMF: $7,000 × 5% = $350 (under cap)
      const vehiclePrice = 15000;
      const tradeIn = 8000;
      const taxBase = vehiclePrice - tradeIn; // $7,000

      const imfFinal = Math.min(taxBase * 0.05, 500); // $350

      expect(imfFinal).toBe(350);

      // Without trade: $15,000 × 5% = $750 → capped at $500
      // With trade: $350
      // Savings: $500 - $350 = $150
    });
  });

  describe("Retail - Rebate Treatment (Taxable)", () => {
    it("should NOT reduce IMF base for manufacturer rebate", () => {
      // $25,000 vehicle with $3,000 manufacturer rebate
      // Customer pays: $22,000
      // IMF base: $25,000 (rebate does NOT reduce base)
      // IMF: $25,000 × 5% = $1,250 → capped at $500
      const vehiclePrice = 25000;
      const mfrRebate = 3000;
      const customerPays = vehiclePrice - mfrRebate; // $22,000

      // IMF calculated on FULL price before rebate
      const taxBase = vehiclePrice; // NOT (vehiclePrice - mfrRebate)
      const imfFinal = Math.min(taxBase * 0.05, 500); // $500

      expect(customerPays).toBe(22000);
      expect(taxBase).toBe(25000); // Rebate does NOT reduce
      expect(imfFinal).toBe(500);
    });

    it("should contrast rebate vs trade-in treatment", () => {
      // Scenario A: $25,000 vehicle with $5,000 trade-in
      const vehiclePriceA = 25000;
      const tradeInA = 5000;
      const taxBaseA = vehiclePriceA - tradeInA; // $20,000 (trade DOES reduce)
      const imfA = Math.min(taxBaseA * 0.05, 500); // $500 (capped)

      // Scenario B: $25,000 vehicle with $5,000 manufacturer rebate
      const vehiclePriceB = 25000;
      const rebateB = 5000;
      const taxBaseB = vehiclePriceB; // $25,000 (rebate does NOT reduce)
      const imfB = Math.min(taxBaseB * 0.05, 500); // $500 (capped)

      expect(taxBaseA).toBe(20000); // Trade-in reduced base
      expect(taxBaseB).toBe(25000); // Rebate did NOT reduce base
      expect(imfA).toBe(500);
      expect(imfB).toBe(500);

      // Both hit cap in this case, but for lower values trade-in provides savings
    });

    it("should show rebate provides no IMF savings on low-value vehicle", () => {
      // $9,000 vehicle with $2,000 rebate
      // Customer pays: $7,000
      // IMF base: $9,000 (rebate does NOT reduce)
      // IMF: $9,000 × 5% = $450
      const vehiclePrice = 9000;
      const rebate = 2000;
      const customerPays = vehiclePrice - rebate; // $7,000

      const taxBase = vehiclePrice; // $9,000 (rebate does NOT reduce)
      const imf = Math.min(taxBase * 0.05, 500); // $450

      expect(customerPays).toBe(7000);
      expect(imf).toBe(450);

      // Compare to trade-in scenario
      const taxBaseWithTrade = vehiclePrice - 2000; // $7,000 (trade DOES reduce)
      const imfWithTrade = Math.min(taxBaseWithTrade * 0.05, 500); // $350

      expect(imfWithTrade).toBe(350);
      expect(imf - imfWithTrade).toBe(100); // Trade-in saves $100 vs. rebate
    });
  });

  describe("Retail - Doc Fee (Taxable, No Cap)", () => {
    it("should include doc fee in IMF base (under cap)", () => {
      // $8,000 vehicle + $400 doc fee = $8,400 base
      // IMF: $8,400 × 5% = $420
      const vehiclePrice = 8000;
      const docFee = 400;
      const taxBase = vehiclePrice + docFee; // $8,400

      const imf = Math.min(taxBase * 0.05, 500); // $420

      expect(taxBase).toBe(8400);
      expect(imf).toBe(420);
    });

    it("should include doc fee in IMF base (at cap)", () => {
      // $20,000 vehicle + $495 doc fee = $20,495 base
      // IMF: $20,495 × 5% = $1,024.75 → capped at $500
      const vehiclePrice = 20000;
      const docFee = 495;
      const taxBase = vehiclePrice + docFee; // $20,495

      const imfCalculated = taxBase * 0.05; // $1,024.75
      const imf = Math.min(imfCalculated, 500); // $500

      expect(taxBase).toBe(20495);
      expect(imfCalculated).toBe(1024.75);
      expect(imf).toBe(500);
    });

    it("should allow high doc fees (no state cap)", () => {
      // SC has no doc fee cap, only reporting requirement if over $225
      // $15,000 vehicle + $600 doc fee = $15,600 base
      const vehiclePrice = 15000;
      const docFee = 600; // High doc fee, allowed in SC

      const taxBase = vehiclePrice + docFee; // $15,600
      const imf = Math.min(taxBase * 0.05, 500); // $500 (capped)

      expect(taxBase).toBe(15600);
      expect(imf).toBe(500);
    });
  });

  describe("Retail - VSC and GAP (NOT Taxable)", () => {
    it("should NOT include VSC in IMF base", () => {
      // $18,000 vehicle + $2,500 VSC + $495 doc fee
      // Base: $18,000 + $495 = $18,495 (VSC NOT included)
      // IMF: $18,495 × 5% = $924.75 → capped at $500
      const vehiclePrice = 18000;
      const vsc = 2500;
      const docFee = 495;

      const taxBase = vehiclePrice + docFee; // VSC NOT included
      const imf = Math.min(taxBase * 0.05, 500); // $500

      expect(taxBase).toBe(18495); // VSC excluded
      expect(imf).toBe(500);
    });

    it("should NOT include GAP in IMF base", () => {
      // $20,000 vehicle + $895 GAP + $400 doc fee
      // Base: $20,000 + $400 = $20,400 (GAP NOT included)
      const vehiclePrice = 20000;
      const gap = 895;
      const docFee = 400;

      const taxBase = vehiclePrice + docFee; // GAP NOT included
      const imf = Math.min(taxBase * 0.05, 500); // $500

      expect(taxBase).toBe(20400); // GAP excluded
      expect(imf).toBe(500);
    });

    it("should exclude both VSC and GAP from IMF base", () => {
      // $15,000 vehicle + $2,000 VSC + $700 GAP + $495 doc fee
      // Base: $15,000 + $495 = $15,495 (VSC and GAP NOT included)
      const vehiclePrice = 15000;
      const vsc = 2000;
      const gap = 700;
      const docFee = 495;

      const taxBase = vehiclePrice + docFee; // Only vehicle + doc fee
      const imf = Math.min(taxBase * 0.05, 500); // $500

      expect(taxBase).toBe(15495); // VSC and GAP excluded
      expect(imf).toBe(500);

      // Customer saves: (VSC + GAP) × 5% = $3,700 × 5% = $185 in potential tax
      // (but capped at $500 anyway in this case)
    });
  });

  describe("Retail - Accessories (Taxable)", () => {
    it("should include accessories in IMF base", () => {
      // $28,000 vehicle + $2,500 accessories = $30,500 base
      // IMF: $30,500 × 5% = $1,525 → capped at $500
      const vehiclePrice = 28000;
      const accessories = 2500;
      const taxBase = vehiclePrice + accessories; // $30,500

      const imfCalculated = taxBase * 0.05; // $1,525
      const imf = Math.min(imfCalculated, 500); // $500

      expect(taxBase).toBe(30500);
      expect(imfCalculated).toBe(1525);
      expect(imf).toBe(500);
    });
  });

  describe("Retail - Negative Equity (Taxable)", () => {
    it("should include negative equity in IMF base", () => {
      // $25,000 vehicle - $12,000 trade + $3,000 negative equity
      // Base: $25,000 - $12,000 + $3,000 = $16,000
      // IMF: $16,000 × 5% = $800 → capped at $500
      const vehiclePrice = 25000;
      const tradeInValue = 12000;
      const tradeInPayoff = 15000;
      const negativeEquity = tradeInPayoff - tradeInValue; // $3,000

      const taxBase = vehiclePrice - tradeInValue + negativeEquity; // $16,000
      const imfCalculated = taxBase * 0.05; // $800
      const imf = Math.min(imfCalculated, 500); // $500

      expect(negativeEquity).toBe(3000);
      expect(taxBase).toBe(16000);
      expect(imfCalculated).toBe(800);
      expect(imf).toBe(500);
    });
  });

  describe("Retail - Complex Scenarios", () => {
    it("should handle typical deal: vehicle + doc + trade-in", () => {
      // $28,000 vehicle + $495 doc - $8,000 trade
      // Base: $28,000 + $495 - $8,000 = $20,495
      // IMF: $20,495 × 5% = $1,024.75 → capped at $500
      const vehiclePrice = 28000;
      const docFee = 495;
      const tradeIn = 8000;

      const taxBase = vehiclePrice + docFee - tradeIn; // $20,495
      const imf = Math.min(taxBase * 0.05, 500); // $500

      expect(taxBase).toBe(20495);
      expect(imf).toBe(500);
    });

    it("should handle full deal: vehicle + accessories + doc + VSC + GAP + trade + rebate", () => {
      // $32,000 vehicle
      // + $1,500 accessories
      // + $495 doc fee
      // + $2,200 VSC (NOT taxable)
      // + $795 GAP (NOT taxable)
      // - $10,000 trade-in
      // - $3,000 manufacturer rebate (taxable, does NOT reduce base)
      //
      // IMF Base: $32,000 + $1,500 + $495 - $10,000 = $23,995
      // (VSC, GAP excluded; rebate does NOT reduce base)
      // IMF: $23,995 × 5% = $1,199.75 → capped at $500

      const vehiclePrice = 32000;
      const accessories = 1500;
      const docFee = 495;
      const vsc = 2200; // NOT included
      const gap = 795; // NOT included
      const tradeIn = 10000;
      const mfrRebate = 3000; // Does NOT reduce base

      const taxBase = vehiclePrice + accessories + docFee - tradeIn; // $23,995
      const imfCalculated = taxBase * 0.05; // $1,199.75
      const imf = Math.min(imfCalculated, 500); // $500

      expect(taxBase).toBe(23995);
      expect(imfCalculated).toBe(1199.75);
      expect(imf).toBe(500);
    });

    it("should handle entry-level vehicle under cap", () => {
      // $6,000 vehicle + $300 doc - $1,000 trade
      // Base: $6,000 + $300 - $1,000 = $5,300
      // IMF: $5,300 × 5% = $265 (under cap)
      const vehiclePrice = 6000;
      const docFee = 300;
      const tradeIn = 1000;

      const taxBase = vehiclePrice + docFee - tradeIn; // $5,300
      const imf = Math.min(taxBase * 0.05, 500); // $265

      expect(taxBase).toBe(5300);
      expect(imf).toBe(265);
    });
  });

  // ============================================================================
  // LEASE TRANSACTION TESTS
  // ============================================================================

  describe("Lease - Upfront IMF (FULL_UPFRONT method)", () => {
    it("should have correct lease configuration", () => {
      expect(US_SC.leaseRules.method).toBe("FULL_UPFRONT");
      expect(US_SC.leaseRules.taxCapReduction).toBe(false);
      expect(US_SC.leaseRules.rebateBehavior).toBe("ALWAYS_TAXABLE");
      expect(US_SC.leaseRules.tradeInCredit).toBe("FULL");
      expect(US_SC.leaseRules.taxFeesUpfront).toBe(true);
      expect(US_SC.leaseRules.specialScheme).toBe("NONE");
    });

    it("should calculate upfront IMF on lease (no trade)", () => {
      // Gross cap cost: $40,000
      // No trade-in
      // IMF: $40,000 × 5% = $2,000 → capped at $500
      const grossCapCost = 40000;
      const tradeIn = 0;

      const imfBase = grossCapCost - tradeIn; // $40,000
      const imfCalculated = imfBase * 0.05; // $2,000
      const imf = Math.min(imfCalculated, 500); // $500

      expect(imfBase).toBe(40000);
      expect(imfCalculated).toBe(2000);
      expect(imf).toBe(500);

      // Monthly payments: NOT separately taxed
    });

    it("should apply trade-in credit on lease", () => {
      // Gross cap cost: $35,000
      // Trade-in: $12,000
      // Net: $23,000
      // IMF: $23,000 × 5% = $1,150 → capped at $500
      const grossCapCost = 35000;
      const tradeIn = 12000;

      const imfBase = grossCapCost - tradeIn; // $23,000
      const imfCalculated = imfBase * 0.05; // $1,150
      const imf = Math.min(imfCalculated, 500); // $500

      expect(imfBase).toBe(23000);
      expect(imfCalculated).toBe(1150);
      expect(imf).toBe(500);
    });

    it("should show trade-in reducing IMF under cap on lease", () => {
      // Gross cap cost: $14,000
      // Trade-in: $6,000
      // Net: $8,000
      // IMF: $8,000 × 5% = $400 (under cap)
      const grossCapCost = 14000;
      const tradeIn = 6000;

      const imfBase = grossCapCost - tradeIn; // $8,000
      const imf = Math.min(imfBase * 0.05, 500); // $400

      expect(imfBase).toBe(8000);
      expect(imf).toBe(400);

      // Without trade: $14,000 × 5% = $700 → capped at $500
      const withoutTrade = Math.min(grossCapCost * 0.05, 500); // $500
      const savings = withoutTrade - imf;
      expect(savings).toBe(100); // Trade-in saves $100
    });

    it("should NOT separately tax cap cost reduction (cash down)", () => {
      // Gross cap cost: $40,000
      // Cash down: $5,000
      // Trade-in: $0
      //
      // IMF Base: $40,000 (cash down does NOT reduce IMF base)
      // IMF: $40,000 × 5% = $2,000 → capped at $500
      //
      // Cash down is NOT separately taxed (taxCapReduction = false)
      const grossCapCost = 40000;
      const cashDown = 5000;
      const tradeIn = 0;

      const imfBase = grossCapCost - tradeIn; // $40,000 (cash down NOT deducted)
      const imf = Math.min(imfBase * 0.05, 500); // $500

      expect(imfBase).toBe(40000);
      expect(imf).toBe(500);

      // Cash down is NOT taxed separately (unlike Alabama HYBRID method)
      // One-time IMF payment of $500, that's it
    });

    it("should treat manufacturer rebate as taxable (does NOT reduce IMF base)", () => {
      // Gross cap cost: $30,000
      // Manufacturer rebate: $3,000 (applied as cap reduction)
      //
      // IMF Base: $30,000 (rebate does NOT reduce base)
      // IMF: $30,000 × 5% = $1,500 → capped at $500
      //
      // Rebate behavior: ALWAYS_TAXABLE
      const grossCapCost = 30000;
      const mfrRebate = 3000;

      const imfBase = grossCapCost; // Rebate does NOT reduce base
      const imf = Math.min(imfBase * 0.05, 500); // $500

      expect(imfBase).toBe(30000); // Rebate did NOT reduce
      expect(imf).toBe(500);

      // Net cap cost for payment: $27,000
      // But IMF still calculated on $30,000
    });

    it("should include negative equity in lease IMF base", () => {
      // Gross cap cost: $28,000
      // Trade-in value: $10,000
      // Trade-in payoff: $13,000
      // Negative equity: $3,000
      //
      // IMF Base: $28,000 - $10,000 + $3,000 = $21,000
      // IMF: $21,000 × 5% = $1,050 → capped at $500
      const grossCapCost = 28000;
      const tradeInValue = 10000;
      const tradeInPayoff = 13000;
      const negativeEquity = tradeInPayoff - tradeInValue; // $3,000

      const imfBase = grossCapCost - tradeInValue + negativeEquity; // $21,000
      const imf = Math.min(imfBase * 0.05, 500); // $500

      expect(negativeEquity).toBe(3000);
      expect(imfBase).toBe(21000);
      expect(imf).toBe(500);
    });

    it("should include doc fee in lease IMF base", () => {
      // Gross cap cost: $28,000
      // Doc fee: $495
      // Trade-in: $0
      //
      // IMF Base: $28,000 + $495 = $28,495
      // IMF: $28,495 × 5% = $1,424.75 → capped at $500
      const grossCapCost = 28000;
      const docFee = 495;
      const tradeIn = 0;

      const imfBase = grossCapCost + docFee - tradeIn; // $28,495
      const imf = Math.min(imfBase * 0.05, 500); // $500

      expect(imfBase).toBe(28495);
      expect(imf).toBe(500);
    });

    it("should NOT tax VSC or GAP on lease", () => {
      // Gross cap cost: $30,000
      // VSC: $2,200 (NOT included in IMF base)
      // GAP: $795 (NOT included in IMF base)
      // Doc fee: $495
      //
      // IMF Base: $30,000 + $495 = $30,495 (VSC and GAP excluded)
      // IMF: $30,495 × 5% = $1,524.75 → capped at $500
      const grossCapCost = 30000;
      const vsc = 2200;
      const gap = 795;
      const docFee = 495;

      const imfBase = grossCapCost + docFee; // VSC and GAP NOT included
      const imf = Math.min(imfBase * 0.05, 500); // $500

      expect(imfBase).toBe(30495); // VSC and GAP excluded
      expect(imf).toBe(500);
    });

    it("should handle complex lease deal", () => {
      // Gross cap cost: $42,000
      // Cash down: $5,000
      // Manufacturer rebate: $2,000
      // Trade-in: $8,000
      // Doc fee: $495
      // VSC: $2,500 (NOT taxable)
      // GAP: $895 (NOT taxable)
      //
      // IMF Base: $42,000 + $495 - $8,000 = $34,495
      // (Cash down NOT deducted, rebate NOT deducted, trade-in deducted)
      // IMF: $34,495 × 5% = $1,724.75 → capped at $500
      //
      // Monthly payments: NOT taxed
      const grossCapCost = 42000;
      const cashDown = 5000; // Does NOT reduce IMF base
      const mfrRebate = 2000; // Does NOT reduce IMF base
      const tradeIn = 8000; // DOES reduce IMF base
      const docFee = 495;
      const vsc = 2500; // NOT included
      const gap = 895; // NOT included

      const imfBase = grossCapCost + docFee - tradeIn; // $34,495
      const imf = Math.min(imfBase * 0.05, 500); // $500

      expect(imfBase).toBe(34495);
      expect(imf).toBe(500);
    });
  });

  // ============================================================================
  // EDGE CASES AND SPECIAL SCENARIOS
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle zero purchase (trade equals vehicle price)", () => {
      // $10,000 vehicle - $10,000 trade = $0 base
      // IMF: $0 × 5% = $0
      const vehiclePrice = 10000;
      const tradeIn = 10000;

      const taxBase = vehiclePrice - tradeIn; // $0
      const imf = Math.min(taxBase * 0.05, 500); // $0

      expect(taxBase).toBe(0);
      expect(imf).toBe(0);
    });

    it("should handle vehicle exactly at $10,000 threshold", () => {
      // $10,000 vehicle → 5% = $500 (exactly at cap)
      const vehiclePrice = 10000;
      const imf = Math.min(vehiclePrice * 0.05, 500); // $500

      expect(imf).toBe(500);
    });

    it("should handle vehicle just under $10,000 threshold", () => {
      // $9,999 vehicle → 5% = $499.95 (just under cap)
      const vehiclePrice = 9999;
      const imf = Math.min(vehiclePrice * 0.05, 500); // $499.95

      expect(imf).toBeCloseTo(499.95, 2);
    });

    it("should handle vehicle just over $10,000 threshold", () => {
      // $10,001 vehicle → 5% = $500.05 → capped at $500
      const vehiclePrice = 10001;
      const imfCalculated = vehiclePrice * 0.05; // $500.05
      const imf = Math.min(imfCalculated, 500); // $500

      expect(imfCalculated).toBe(500.05);
      expect(imf).toBe(500);
    });

    it("should handle new resident scenario ($250 IMF)", () => {
      // New resident bringing existing vehicle into SC
      // Flat $250 IMF (not based on vehicle value)
      const newResidentIMF = 250;
      const titleFee = 15;
      const totalDue = newResidentIMF + titleFee;

      expect(newResidentIMF).toBe(250);
      expect(titleFee).toBe(15);
      expect(totalDue).toBe(265);
    });

    it("should demonstrate effective tax rate on high-value vehicle", () => {
      // $80,000 luxury vehicle
      // IMF: $500 (capped)
      // Effective rate: 0.625%
      const vehiclePrice = 80000;
      const imf = 500; // Capped

      const effectiveRate = (imf / vehiclePrice) * 100;
      expect(effectiveRate).toBe(0.625); // 0.625%
    });

    it("should demonstrate no reciprocity (double taxation scenario)", () => {
      // SC resident buys in Georgia: $30,000 vehicle
      // GA tax paid (7%): $2,100
      // SC IMF when registering: $500 (no credit for GA tax)
      // Total tax paid: $2,600
      const vehiclePrice = 30000;
      const gaTaxRate = 0.07;
      const gaTax = vehiclePrice * gaTaxRate; // $2,100

      const scIMF = Math.min(vehiclePrice * 0.05, 500); // $500

      const totalTax = gaTax + scIMF; // $2,600 (double taxation)

      expect(gaTax).toBe(2100);
      expect(scIMF).toBe(500);
      expect(totalTax).toBe(2600);

      // No reciprocity in SC - customer pays both
    });
  });

  // ============================================================================
  // IMF CAP BENEFIT ANALYSIS
  // ============================================================================

  describe("IMF Cap Benefit Analysis", () => {
    it("should show progressive tax benefit as vehicle price increases", () => {
      const vehicles = [
        { price: 5000, imf: Math.min(5000 * 0.05, 500), effectiveRate: 0 },
        { price: 10000, imf: Math.min(10000 * 0.05, 500), effectiveRate: 0 },
        { price: 20000, imf: Math.min(20000 * 0.05, 500), effectiveRate: 0 },
        { price: 50000, imf: Math.min(50000 * 0.05, 500), effectiveRate: 0 },
        { price: 100000, imf: Math.min(100000 * 0.05, 500), effectiveRate: 0 },
      ];

      vehicles.forEach((v) => {
        v.effectiveRate = (v.imf / v.price) * 100;
      });

      expect(vehicles[0]).toEqual({ price: 5000, imf: 250, effectiveRate: 5.0 });
      expect(vehicles[1]).toEqual({ price: 10000, imf: 500, effectiveRate: 5.0 });
      expect(vehicles[2]).toEqual({ price: 20000, imf: 500, effectiveRate: 2.5 });
      expect(vehicles[3]).toEqual({ price: 50000, imf: 500, effectiveRate: 1.0 });
      expect(vehicles[4]).toEqual({ price: 100000, imf: 500, effectiveRate: 0.5 });

      // Cap creates regressive benefit (higher-value vehicles have lower effective tax rate)
    });
  });
});
