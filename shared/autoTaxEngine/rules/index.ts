import { TaxRulesConfig } from "../types";

// Import all state rules
import AL from "./US_AL";
import AK from "./US_AK";
import AZ from "./US_AZ";
import AR from "./US_AR";
import CA from "./US_CA";
import CO from "./US_CO";
import CT from "./US_CT";
import DE from "./US_DE";
import FL from "./US_FL";
import GA from "./US_GA";
import HI from "./US_HI";
import ID from "./US_ID";
import IL from "./US_IL";
import IN from "./US_IN";
import IA from "./US_IA";
import KS from "./US_KS";
import KY from "./US_KY";
import LA from "./US_LA";
import ME from "./US_ME";
import MD from "./US_MD";
import MA from "./US_MA";
import MI from "./US_MI";
import MN from "./US_MN";
import MS from "./US_MS";
import MO from "./US_MO";
import MT from "./US_MT";
import NE from "./US_NE";
import NV from "./US_NV";
import NH from "./US_NH";
import NJ from "./US_NJ";
import NM from "./US_NM";
import NY from "./US_NY";
import NC from "./US_NC";
import ND from "./US_ND";
import OH from "./US_OH";
import OK from "./US_OK";
import OR from "./US_OR";
import PA from "./US_PA";
import RI from "./US_RI";
import SC from "./US_SC";
import SD from "./US_SD";
import TN from "./US_TN";
import TX from "./US_TX";
import UT from "./US_UT";
import VT from "./US_VT";
import VA from "./US_VA";
import WA from "./US_WA";
import WV from "./US_WV";
import WI from "./US_WI";
import WY from "./US_WY";

/**
 * State Rules Map - All 50 US States
 *
 * Fully Implemented (18 states, ~65% US auto market coverage):
 *
 * TOP 10 AUTOMOTIVE MARKETS:
 * - CA (California): 7.25% + local, doc cap $85, no reciprocity
 * - TX (Texas): 6.25% + local, VSC/GAP not taxed, reciprocity YES
 * - FL (Florida): 6% + local, doc cap $995, reciprocity YES
 * - NY (New York): 4% + local + MCTD, doc cap $175, no reciprocity
 * - PA (Pennsylvania): 6% state-only, doc cap $195, reciprocity YES
 * - IL (Illinois): 6.25% + local (Chicago 10.25%), reciprocity YES
 * - OH (Ohio): 5.75% + local, doc cap $250, reciprocity YES
 * - MI (Michigan): 6% state-only, doc cap $200, reciprocity YES
 * - NJ (New Jersey): 6.625% state-only, luxury surcharge 0.4%, reciprocity YES
 * - GA (Georgia): TAVT special scheme (7% one-time)
 *
 * ADDITIONAL MAJOR MARKETS (8 states):
 * - NC (North Carolina): HUT special scheme (3%, 90-day window)
 * - WV (West Virginia): Privilege Tax (5%, vehicle classes)
 * - IN (Indiana): 7% state-only, reciprocity YES
 * - TN (Tennessee): 7% + local, single article cap ($1,600/$3,200), doc cap $495
 * - MA (Massachusetts): 6.25% state-only, no doc cap (avg $340), both rebates non-taxable
 * - MO (Missouri): 4.225% + local, doc cap $604.47, 90-day reciprocity rule
 * - MN (Minnesota): 6.875% state (no local on purchases), upfront lease taxation
 * - WI (Wisconsin): 5% + local, manufacturer rebates taxable (unusual)
 *
 * WESTERN STATES (5 states):
 * - AZ (Arizona): 5.6% TPT + local, no doc cap, 21 reciprocal states
 * - CO (Colorado): 2.9% + local, home-rule cities, 36-month lease threshold
 * - MD (Maryland): Excise tax structure, titling tax
 * - VA (Virginia): 4.15% + local, reciprocity YES
 * - WA (Washington): 6.5% + local + RTA, B&O tax
 *
 * Stubs (need research): 32 other states
 */
export const STATE_RULES_MAP: Record<string, TaxRulesConfig> = {
  AL,
  AK,
  AZ,
  AR,
  CA,
  CO,
  CT,
  DE,
  FL,
  GA,
  HI,
  ID,
  IL,
  IN,
  IA,
  KS,
  KY,
  LA,
  ME,
  MD,
  MA,
  MI,
  MN,
  MS,
  MO,
  MT,
  NE,
  NV,
  NH,
  NJ,
  NM,
  NY,
  NC,
  ND,
  OH,
  OK,
  OR,
  PA,
  RI,
  SC,
  SD,
  TN,
  TX,
  UT,
  VT,
  VA,
  WA,
  WV,
  WI,
  WY,
};

/**
 * Get tax rules for a specific state
 *
 * @param stateCode - Two-letter state code (e.g., "IN", "MI")
 * @returns TaxRulesConfig or undefined if state not found
 *
 * @example
 * const rules = getRulesForState("IN");
 * if (!rules) throw new Error("Unsupported state");
 */
export function getRulesForState(stateCode: string): TaxRulesConfig | undefined {
  return STATE_RULES_MAP[stateCode.toUpperCase()];
}

/**
 * Get all available state codes
 */
export function getAllStateCodes(): string[] {
  return Object.keys(STATE_RULES_MAP);
}

/**
 * Check if a state is fully implemented (not a stub)
 */
export function isStateImplemented(stateCode: string): boolean {
  const rules = getRulesForState(stateCode);
  if (!rules) return false;
  return rules.extras?.status !== "STUB";
}

/**
 * Get list of fully implemented states
 */
export function getImplementedStates(): string[] {
  return getAllStateCodes().filter((code) => isStateImplemented(code));
}

/**
 * Get list of stub states (need research)
 */
export function getStubStates(): string[] {
  return getAllStateCodes().filter((code) => !isStateImplemented(code));
}
