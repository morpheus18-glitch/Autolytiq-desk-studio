import { describe, it, expect } from "vitest";
import {
  resolveTaxContext,
  createSimpleRooftopConfig,
  createMultiStateRooftopConfig,
  isMultiStateDeal,
  getInvolvedStates,
} from "../../shared/autoTaxEngine/engine/stateResolver";
import type { RooftopConfig, DealPartyInfo } from "../../shared/autoTaxEngine/types";

describe("State Resolver", () => {
  // ============================================================================
  // SIMPLE SINGLE-STATE SCENARIOS
  // ============================================================================

  describe("Simple Single-State Deals", () => {
    it("should resolve Indiana dealer, Indiana buyer, Indiana registration", () => {
      const rooftop = createSimpleRooftopConfig("IN", "Indianapolis Motors");
      const deal: DealPartyInfo = {
        buyerResidenceState: "IN",
        registrationState: "IN",
      };

      const context = resolveTaxContext(rooftop, deal);

      expect(context.primaryStateCode).toBe("IN");
      expect(context.dealerStateCode).toBe("IN");
      expect(context.buyerResidenceStateCode).toBe("IN");
      expect(context.registrationStateCode).toBe("IN");
    });

    it("should default to dealer state when buyer/registration not provided", () => {
      const rooftop = createSimpleRooftopConfig("MI");
      const deal: DealPartyInfo = {};

      const context = resolveTaxContext(rooftop, deal);

      expect(context.primaryStateCode).toBe("MI");
      expect(context.dealerStateCode).toBe("MI");
      expect(context.buyerResidenceStateCode).toBe("MI");
      expect(context.registrationStateCode).toBe("MI");
    });

    it("should default buyer state to registration state if only registration provided", () => {
      const rooftop = createSimpleRooftopConfig("OH");
      const deal: DealPartyInfo = {
        registrationState: "OH",
      };

      const context = resolveTaxContext(rooftop, deal);

      expect(context.buyerResidenceStateCode).toBe("OH");
      expect(context.registrationStateCode).toBe("OH");
    });
  });

  // ============================================================================
  // DEALER_STATE PERSPECTIVE
  // ============================================================================

  describe("Dealer State Perspective", () => {
    it("should use dealer state when perspective is DEALER_STATE", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-ky",
        name: "Kentucky Dealer",
        dealerStateCode: "KY",
        defaultTaxPerspective: "DEALER_STATE",
        allowedRegistrationStates: ["KY", "IN", "OH"],
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "IN",
        registrationState: "IN",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Dealer perspective wins - KY dealer collects KY tax
      expect(context.primaryStateCode).toBe("KY");
      expect(context.buyerResidenceStateCode).toBe("IN");
      expect(context.registrationStateCode).toBe("IN");
    });

    it("should fall back to registration state if dealer state is disallowed", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-ky",
        name: "Kentucky Border Dealer",
        dealerStateCode: "KY",
        defaultTaxPerspective: "DEALER_STATE",
        allowedRegistrationStates: ["KY", "IN", "OH"],
        stateOverrides: {
          IN: { disallowPrimary: true }, // Never use KY rules for IN registrations
        },
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "IN",
        registrationState: "IN",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Falls back to registration state due to override
      expect(context.primaryStateCode).toBe("IN");
    });
  });

  // ============================================================================
  // REGISTRATION_STATE PERSPECTIVE
  // ============================================================================

  describe("Registration State Perspective", () => {
    it("should use registration state when perspective is REGISTRATION_STATE", () => {
      const rooftop = createMultiStateRooftopConfig(
        "OH",
        ["IN", "MI", "KY"],
        "REGISTRATION_STATE",
        "Ohio Multi-State Dealer"
      );
      const deal: DealPartyInfo = {
        buyerResidenceState: "IN",
        registrationState: "IN",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Registration state wins
      expect(context.primaryStateCode).toBe("IN");
      expect(context.dealerStateCode).toBe("OH");
    });

    it("should fall back to dealer state if registration state is disallowed", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-oh",
        name: "Ohio Dealer",
        dealerStateCode: "OH",
        defaultTaxPerspective: "REGISTRATION_STATE",
        allowedRegistrationStates: ["OH", "MI"],
        stateOverrides: {
          MI: { disallowPrimary: true }, // Don't use MI rules
        },
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "MI",
        registrationState: "MI",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Falls back to dealer state
      expect(context.primaryStateCode).toBe("OH");
    });

    it("should handle Florida snowbird scenario", () => {
      const rooftop = createMultiStateRooftopConfig(
        "FL",
        ["MI", "OH", "NY"],
        "REGISTRATION_STATE",
        "Florida Snowbird Dealer"
      );
      const deal: DealPartyInfo = {
        buyerResidenceState: "MI", // Michigan snowbird
        registrationState: "FL", // Registering in Florida
      };

      const context = resolveTaxContext(rooftop, deal);

      expect(context.primaryStateCode).toBe("FL");
      expect(context.buyerResidenceStateCode).toBe("MI");
      expect(context.registrationStateCode).toBe("FL");
    });
  });

  // ============================================================================
  // BUYER_STATE PERSPECTIVE (Rare)
  // ============================================================================

  describe("Buyer State Perspective", () => {
    it("should use buyer state when in allowed list", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-in",
        name: "Indiana Dealer (Buyer Perspective)",
        dealerStateCode: "IN",
        defaultTaxPerspective: "BUYER_STATE",
        allowedRegistrationStates: ["IN", "MI", "OH", "KY"],
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "MI",
        registrationState: "OH",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Buyer state wins (MI is in allowed list)
      expect(context.primaryStateCode).toBe("MI");
    });

    it("should fall back to registration state if buyer state not in allowed list", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-in",
        name: "Indiana Dealer",
        dealerStateCode: "IN",
        defaultTaxPerspective: "BUYER_STATE",
        allowedRegistrationStates: ["IN", "OH"], // MI not allowed
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "MI",
        registrationState: "OH",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Falls back to registration state
      expect(context.primaryStateCode).toBe("OH");
    });

    it("should fall back to registration state if buyer state same as dealer", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-in",
        name: "Indiana Dealer",
        dealerStateCode: "IN",
        defaultTaxPerspective: "BUYER_STATE",
        allowedRegistrationStates: ["IN", "MI", "OH"],
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "IN", // Same as dealer
        registrationState: "OH",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Falls back to registration state (buyer = dealer)
      expect(context.primaryStateCode).toBe("OH");
    });
  });

  // ============================================================================
  // STATE OVERRIDES
  // ============================================================================

  describe("State Overrides", () => {
    it("should force registration state as primary with forcePrimary override", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-oh",
        name: "Ohio Border Dealer",
        dealerStateCode: "OH",
        defaultTaxPerspective: "DEALER_STATE",
        allowedRegistrationStates: ["OH", "IN", "MI"],
        stateOverrides: {
          IN: { forcePrimary: true }, // Always use IN rules for IN registrations
        },
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "IN",
        registrationState: "IN",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Force override wins over dealer perspective
      expect(context.primaryStateCode).toBe("IN");
    });

    it("should force buyer state as primary with forcePrimary override", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-oh",
        name: "Ohio Dealer",
        dealerStateCode: "OH",
        defaultTaxPerspective: "REGISTRATION_STATE",
        allowedRegistrationStates: ["OH", "MI"],
        stateOverrides: {
          MI: { forcePrimary: true }, // Force MI rules for MI buyers
        },
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "MI",
        registrationState: "OH",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Buyer override takes second priority
      expect(context.primaryStateCode).toBe("MI");
    });

    it("should prioritize registration forcePrimary over buyer forcePrimary", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-oh",
        name: "Ohio Dealer",
        dealerStateCode: "OH",
        defaultTaxPerspective: "DEALER_STATE",
        allowedRegistrationStates: ["OH", "IN", "MI"],
        stateOverrides: {
          IN: { forcePrimary: true }, // Registration state
          MI: { forcePrimary: true }, // Buyer state
        },
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "MI",
        registrationState: "IN",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Registration override takes highest priority
      expect(context.primaryStateCode).toBe("IN");
    });
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  describe("Helper Functions", () => {
    describe("createSimpleRooftopConfig", () => {
      it("should create config with dealer state perspective", () => {
        const config = createSimpleRooftopConfig("IN", "Indy Motors");

        expect(config.dealerStateCode).toBe("IN");
        expect(config.defaultTaxPerspective).toBe("DEALER_STATE");
        expect(config.allowedRegistrationStates).toEqual(["IN"]);
        expect(config.name).toBe("Indy Motors");
      });

      it("should use default name if not provided", () => {
        const config = createSimpleRooftopConfig("MI");

        expect(config.name).toBe("MI Dealership");
      });
    });

    describe("createMultiStateRooftopConfig", () => {
      it("should create config with registration state perspective by default", () => {
        const config = createMultiStateRooftopConfig("OH", ["IN", "MI"]);

        expect(config.dealerStateCode).toBe("OH");
        expect(config.defaultTaxPerspective).toBe("REGISTRATION_STATE");
        expect(config.allowedRegistrationStates).toContain("OH");
        expect(config.allowedRegistrationStates).toContain("IN");
        expect(config.allowedRegistrationStates).toContain("MI");
      });

      it("should respect custom perspective", () => {
        const config = createMultiStateRooftopConfig(
          "OH",
          ["IN"],
          "DEALER_STATE"
        );

        expect(config.defaultTaxPerspective).toBe("DEALER_STATE");
      });
    });

    describe("isMultiStateDeal", () => {
      it("should return false for single-state deal", () => {
        const context = resolveTaxContext(
          createSimpleRooftopConfig("IN"),
          { buyerResidenceState: "IN", registrationState: "IN" }
        );

        expect(isMultiStateDeal(context)).toBe(false);
      });

      it("should return true when states differ", () => {
        const context = resolveTaxContext(
          createMultiStateRooftopConfig("OH", ["IN"]),
          { buyerResidenceState: "IN", registrationState: "IN" }
        );

        expect(isMultiStateDeal(context)).toBe(true);
      });

      it("should return true for snowbird scenario", () => {
        const context = resolveTaxContext(
          createMultiStateRooftopConfig("FL", ["MI"]),
          { buyerResidenceState: "MI", registrationState: "FL" }
        );

        expect(isMultiStateDeal(context)).toBe(true);
      });
    });

    describe("getInvolvedStates", () => {
      it("should return unique sorted states", () => {
        const context = resolveTaxContext(
          createMultiStateRooftopConfig("OH", ["IN", "MI"]),
          { buyerResidenceState: "MI", registrationState: "IN" }
        );

        const states = getInvolvedStates(context);

        expect(states).toContain("OH");
        expect(states).toContain("MI");
        expect(states).toContain("IN");
        expect(states.length).toBe(3);
        // Should be sorted
        expect(states).toEqual([...states].sort());
      });

      it("should deduplicate when all same state", () => {
        const context = resolveTaxContext(
          createSimpleRooftopConfig("IN"),
          { buyerResidenceState: "IN", registrationState: "IN" }
        );

        const states = getInvolvedStates(context);

        expect(states).toEqual(["IN"]);
      });
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIOS
  // ============================================================================

  describe("Real-World Scenarios", () => {
    it("Border City: Cincinnati dealer sells to Kentucky buyer registering in KY", () => {
      const rooftop = createMultiStateRooftopConfig(
        "OH",
        ["KY", "IN"],
        "REGISTRATION_STATE",
        "Cincinnati Border Dealer"
      );
      const deal: DealPartyInfo = {
        buyerResidenceState: "KY",
        registrationState: "KY",
      };

      const context = resolveTaxContext(rooftop, deal);

      expect(context.primaryStateCode).toBe("KY");
      expect(context.dealerStateCode).toBe("OH");
      expect(isMultiStateDeal(context)).toBe(true);
    });

    it("Snowbird: Florida dealer sells to Michigan resident registering in FL", () => {
      const rooftop = createMultiStateRooftopConfig(
        "FL",
        ["MI", "NY", "OH"],
        "REGISTRATION_STATE",
        "Sarasota Snowbird Motors"
      );
      const deal: DealPartyInfo = {
        buyerResidenceState: "MI",
        registrationState: "FL",
      };

      const context = resolveTaxContext(rooftop, deal);

      expect(context.primaryStateCode).toBe("FL");
      expect(context.buyerResidenceStateCode).toBe("MI");
    });

    it("Dealer Group: OH dealer uses dealer perspective (customer pays OH tax)", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-oh-main",
        name: "AutoNation Ohio",
        dealerStateCode: "OH",
        defaultTaxPerspective: "DEALER_STATE",
        allowedRegistrationStates: ["OH", "IN", "MI", "KY", "PA", "WV"],
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "PA",
        registrationState: "PA",
      };

      const context = resolveTaxContext(rooftop, deal);

      // Dealer perspective: customer pays OH tax, then PA use tax at registration
      expect(context.primaryStateCode).toBe("OH");
      expect(context.registrationStateCode).toBe("PA");
    });

    it("Commercial Fleet: Multi-state registration with special overrides", () => {
      const rooftop: RooftopConfig = {
        id: "rooftop-fleet",
        name: "National Fleet Sales",
        dealerStateCode: "IN",
        defaultTaxPerspective: "REGISTRATION_STATE",
        allowedRegistrationStates: ["IN", "OH", "MI", "IL", "KY"],
        stateOverrides: {
          IL: { forcePrimary: true }, // Always use IL rules for IL fleet
        },
      };
      const deal: DealPartyInfo = {
        buyerResidenceState: "IN", // Fleet HQ in Indiana
        registrationState: "IL", // Vehicles registered in Illinois
      };

      const context = resolveTaxContext(rooftop, deal);

      expect(context.primaryStateCode).toBe("IL");
    });
  });
});
