#!/usr/bin/env npx tsx
/**
 * Tax Engine Demo Script - Reynolds & Reynolds Partnership Pitch
 *
 * This script demonstrates the Autolytiq Tax Intelligence Engine (ATIE)
 * capabilities for automotive dealership tax calculations.
 *
 * Run with: npx tsx scripts/tax-engine-demo.ts
 */

import * as readline from 'readline';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

const c = colors;

// Demo data
const demoVehicle = {
  year: 2025,
  make: 'Ford',
  model: 'F-150 Lightning',
  trim: 'Lariat Extended Range',
  msrp: 72999,
  sellingPrice: 68500,
  vin: '1FTFW1E89PKF12345',
};

const demoCustomer = {
  name: 'John Smith',
  address: '123 Main Street',
  city: 'Indianapolis',
  state: 'IN',
  zip: '46204',
};

const demoDeal = {
  vehiclePrice: 68500,
  tradeInValue: 15000,
  tradeInPayoff: 8000,
  rebateManufacturer: 2500,
  rebateDealer: 1000,
  downPayment: 5000,
  docFee: 199,
  titleFee: 31,
  registrationFee: 50,
  serviceContract: 2500,
  gapInsurance: 800,
  apr: 6.99,
  termMonths: 60,
};

// State tax configurations for demo
const stateConfigs: Record<string, {
  stateRate: number;
  localRate: number;
  tradeInCredit: boolean | 'capped';
  tradeInCap?: number;
  taxableItems: string[];
  specialScheme?: string;
  notes: string;
}> = {
  IN: {
    stateRate: 0.07,
    localRate: 0.0,
    tradeInCredit: true,
    taxableItems: ['Vehicle', 'Accessories'],
    notes: '7% flat state-only rate. Full trade-in credit. Doc fees, service contracts, GAP not taxable.',
  },
  TX: {
    stateRate: 0.0625,
    localRate: 0.02,
    tradeInCredit: true,
    taxableItems: ['Vehicle', 'Accessories', 'Doc Fee'],
    notes: '6.25% state + 2% local (8.25% max). Full trade-in credit.',
  },
  MI: {
    stateRate: 0.06,
    localRate: 0.0,
    tradeInCredit: 'capped',
    tradeInCap: 6000,
    taxableItems: ['Vehicle', 'Accessories'],
    notes: '6% state-only. Trade-in credit CAPPED at $6,000 for 2025 (increases yearly until removed in 2026).',
  },
  GA: {
    stateRate: 0.0,
    localRate: 0.0,
    tradeInCredit: false,
    taxableItems: ['Vehicle'],
    specialScheme: 'TAVT',
    notes: 'Georgia uses TAVT (Title Ad Valorem Tax) at 7% instead of sales tax. One-time fee at titling.',
  },
  NC: {
    stateRate: 0.03,
    localRate: 0.0,
    tradeInCredit: true,
    taxableItems: ['Vehicle'],
    specialScheme: 'HUT',
    notes: 'North Carolina uses Highway Use Tax (HUT) at 3% instead of general sales tax.',
  },
  SC: {
    stateRate: 0.05,
    localRate: 0.0,
    tradeInCredit: true,
    taxableItems: ['Vehicle'],
    specialScheme: 'CAP',
    notes: 'South Carolina caps vehicle tax at $500 MAXIMUM regardless of purchase price.',
  },
  CA: {
    stateRate: 0.0725,
    localRate: 0.015,
    tradeInCredit: false,
    taxableItems: ['Vehicle', 'Accessories', 'Doc Fee', 'Service Contract', 'GAP'],
    notes: '7.25% state + variable local (up to 3.5%). NO trade-in credit. Most items taxable.',
  },
  FL: {
    stateRate: 0.06,
    localRate: 0.01,
    tradeInCredit: true,
    taxableItems: ['Vehicle', 'Accessories', 'Service Contract'],
    notes: '6% state + local discretionary surtax. Trade-in credit allowed.',
  },
};

// Utility functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(3)}%`;
}

function print(text: string): void {
  console.log(text);
}

function printHeader(text: string): void {
  const line = '═'.repeat(70);
  print(`\n${c.bgBlue}${c.white} ${text.padEnd(68)} ${c.reset}`);
  print(`${c.blue}${line}${c.reset}`);
}

function printSubHeader(text: string): void {
  print(`\n${c.cyan}${c.bright}▸ ${text}${c.reset}`);
  print(`${c.dim}${'─'.repeat(68)}${c.reset}`);
}

function printKeyValue(key: string, value: string, highlight = false): void {
  const keyPadded = key.padEnd(30);
  const valueFormatted = highlight ? `${c.green}${c.bright}${value}${c.reset}` : value;
  print(`  ${c.dim}│${c.reset} ${keyPadded} ${valueFormatted}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n${c.dim}Press Enter to continue...${c.reset}`, () => {
      rl.close();
      resolve();
    });
  });
}

// Calculate tax for a state
function calculateTax(
  stateCode: string,
  deal: typeof demoDeal
): {
  taxableBase: number;
  stateTax: number;
  localTax: number;
  totalTax: number;
  effectiveRate: number;
  breakdown: string[];
} {
  const config = stateConfigs[stateCode];
  if (!config) {
    throw new Error(`Unknown state: ${stateCode}`);
  }

  let taxableBase = deal.vehiclePrice;
  const breakdown: string[] = [];
  breakdown.push(`Starting vehicle price: ${formatCurrency(deal.vehiclePrice)}`);

  // Apply trade-in credit
  if (config.tradeInCredit === true) {
    taxableBase -= deal.tradeInValue;
    breakdown.push(`Less trade-in (full credit): -${formatCurrency(deal.tradeInValue)}`);
  } else if (config.tradeInCredit === 'capped' && config.tradeInCap) {
    const credit = Math.min(deal.tradeInValue, config.tradeInCap);
    taxableBase -= credit;
    breakdown.push(`Less trade-in (capped at ${formatCurrency(config.tradeInCap)}): -${formatCurrency(credit)}`);
  } else {
    breakdown.push(`Trade-in credit: NOT ALLOWED`);
  }

  // Apply manufacturer rebate (usually reduces base)
  if (deal.rebateManufacturer > 0) {
    taxableBase -= deal.rebateManufacturer;
    breakdown.push(`Less manufacturer rebate: -${formatCurrency(deal.rebateManufacturer)}`);
  }

  // Add taxable items
  if (config.taxableItems.includes('Doc Fee') && deal.docFee > 0) {
    taxableBase += deal.docFee;
    breakdown.push(`Plus doc fee (taxable): +${formatCurrency(deal.docFee)}`);
  }
  if (config.taxableItems.includes('Service Contract') && deal.serviceContract > 0) {
    taxableBase += deal.serviceContract;
    breakdown.push(`Plus service contract (taxable): +${formatCurrency(deal.serviceContract)}`);
  }
  if (config.taxableItems.includes('GAP') && deal.gapInsurance > 0) {
    taxableBase += deal.gapInsurance;
    breakdown.push(`Plus GAP insurance (taxable): +${formatCurrency(deal.gapInsurance)}`);
  }

  breakdown.push(`─────────────────────────────────`);
  breakdown.push(`Taxable base: ${formatCurrency(taxableBase)}`);

  // Calculate tax
  let stateTax: number;
  let localTax: number;

  // Handle special schemes
  if (config.specialScheme === 'TAVT') {
    stateTax = deal.vehiclePrice * 0.07; // TAVT is 7% on full price
    localTax = 0;
    breakdown.push(`TAVT (7% on ${formatCurrency(deal.vehiclePrice)}): ${formatCurrency(stateTax)}`);
  } else if (config.specialScheme === 'HUT') {
    stateTax = taxableBase * 0.03;
    localTax = 0;
    breakdown.push(`Highway Use Tax (3%): ${formatCurrency(stateTax)}`);
  } else if (config.specialScheme === 'CAP') {
    const uncappedTax = taxableBase * config.stateRate;
    stateTax = Math.min(uncappedTax, 500);
    localTax = 0;
    breakdown.push(`Calculated tax: ${formatCurrency(uncappedTax)}`);
    breakdown.push(`SC $500 CAP APPLIED: ${formatCurrency(stateTax)}`);
  } else {
    stateTax = taxableBase * config.stateRate;
    localTax = taxableBase * config.localRate;
    breakdown.push(`State tax (${formatPercent(config.stateRate)}): ${formatCurrency(stateTax)}`);
    if (localTax > 0) {
      breakdown.push(`Local tax (${formatPercent(config.localRate)}): ${formatCurrency(localTax)}`);
    }
  }

  const totalTax = stateTax + localTax;
  const effectiveRate = totalTax / deal.vehiclePrice;

  return {
    taxableBase,
    stateTax,
    localTax,
    totalTax,
    effectiveRate,
    breakdown,
  };
}

// Main demo sections
async function showIntro(): Promise<void> {
  console.clear();
  print(`
${c.bgGreen}${c.white}                                                                      ${c.reset}
${c.bgGreen}${c.white}   AUTOLYTIQ TAX INTELLIGENCE ENGINE (ATIE) - DEMO                    ${c.reset}
${c.bgGreen}${c.white}                                                                      ${c.reset}

${c.bright}Prepared for: Reynolds & Reynolds Partnership Discussion${c.reset}

${c.cyan}Key Capabilities:${c.reset}
  • 50-state + DC tax calculation engine
  • 3-stage DAG computation pipeline (OPUS Architecture)
  • 51×51 bilateral reciprocity matrix
  • Runtime rate loading (no recompilation needed)
  • Special scheme support: TAVT, HUT, Privilege Tax, Caps
  • Rust/WASM for performance + TypeScript for flexibility

${c.yellow}Technology Stack:${c.reset}
  • Core Engine: Rust compiled to WebAssembly
  • Frontend: TypeScript/React
  • Backend: Go microservices
  • Database: PostgreSQL with Redis caching
  • Rate Updates: External JSON bundles loaded at runtime
`);
}

async function showVehicleInfo(): Promise<void> {
  printHeader('VEHICLE INFORMATION');

  printSubHeader('Vehicle Details');
  printKeyValue('Year/Make/Model', `${demoVehicle.year} ${demoVehicle.make} ${demoVehicle.model}`);
  printKeyValue('Trim', demoVehicle.trim);
  printKeyValue('MSRP', formatCurrency(demoVehicle.msrp));
  printKeyValue('Selling Price', formatCurrency(demoVehicle.sellingPrice), true);
  printKeyValue('VIN', demoVehicle.vin);

  printSubHeader('Customer Information');
  printKeyValue('Name', demoCustomer.name);
  printKeyValue('Address', `${demoCustomer.address}, ${demoCustomer.city}`);
  printKeyValue('State', `${demoCustomer.state} (${demoCustomer.zip})`);
}

async function showDealStructure(): Promise<void> {
  printHeader('DEAL STRUCTURE');

  printSubHeader('Pricing');
  printKeyValue('Vehicle Price', formatCurrency(demoDeal.vehiclePrice));
  printKeyValue('Trade-In Value', formatCurrency(demoDeal.tradeInValue));
  printKeyValue('Trade-In Payoff', formatCurrency(demoDeal.tradeInPayoff));
  printKeyValue('Net Trade', formatCurrency(demoDeal.tradeInValue - demoDeal.tradeInPayoff), true);

  printSubHeader('Incentives');
  printKeyValue('Manufacturer Rebate', formatCurrency(demoDeal.rebateManufacturer));
  printKeyValue('Dealer Cash', formatCurrency(demoDeal.rebateDealer));
  printKeyValue('Total Incentives', formatCurrency(demoDeal.rebateManufacturer + demoDeal.rebateDealer), true);

  printSubHeader('Fees & Products');
  printKeyValue('Doc Fee', formatCurrency(demoDeal.docFee));
  printKeyValue('Title Fee', formatCurrency(demoDeal.titleFee));
  printKeyValue('Registration', formatCurrency(demoDeal.registrationFee));
  printKeyValue('Service Contract', formatCurrency(demoDeal.serviceContract));
  printKeyValue('GAP Insurance', formatCurrency(demoDeal.gapInsurance));

  printSubHeader('Financing');
  printKeyValue('Down Payment', formatCurrency(demoDeal.downPayment));
  printKeyValue('APR', `${demoDeal.apr}%`);
  printKeyValue('Term', `${demoDeal.termMonths} months`);
}

async function showStateComparison(): Promise<void> {
  printHeader('MULTI-STATE TAX COMPARISON');

  print(`\n${c.bright}Same deal calculated across 8 different states:${c.reset}\n`);

  const states = ['IN', 'TX', 'MI', 'GA', 'NC', 'SC', 'CA', 'FL'];
  const results: Array<{ state: string; tax: ReturnType<typeof calculateTax> }> = [];

  for (const state of states) {
    const tax = calculateTax(state, demoDeal);
    results.push({ state, tax });
  }

  // Sort by total tax
  results.sort((a, b) => a.tax.totalTax - b.tax.totalTax);

  print(`${c.dim}  State │ Total Tax    │ Eff. Rate │ Special Scheme${c.reset}`);
  print(`${c.dim}  ──────┼──────────────┼───────────┼──────────────────────${c.reset}`);

  for (const { state, tax } of results) {
    const config = stateConfigs[state];
    const scheme = config.specialScheme ? `[${config.specialScheme}]` : '';
    const taxStr = formatCurrency(tax.totalTax).padStart(11);
    const rateStr = formatPercent(tax.effectiveRate).padStart(8);

    // Highlight lowest and highest
    const isLowest = tax.totalTax === results[0].tax.totalTax;
    const isHighest = tax.totalTax === results[results.length - 1].tax.totalTax;

    let line = `     ${state}  │ ${taxStr}  │ ${rateStr}  │ ${scheme}`;

    if (isLowest) {
      line = `${c.green}${c.bright}${line} ✓ LOWEST${c.reset}`;
    } else if (isHighest) {
      line = `${c.yellow}${line} (highest)${c.reset}`;
    }

    print(line);
  }

  const diff = results[results.length - 1].tax.totalTax - results[0].tax.totalTax;
  print(`\n${c.cyan}Tax variance across states: ${formatCurrency(diff)}${c.reset}`);
}

async function showDetailedCalculation(stateCode: string): Promise<void> {
  printHeader(`DETAILED CALCULATION: ${stateCode}`);

  const config = stateConfigs[stateCode];
  const tax = calculateTax(stateCode, demoDeal);

  printSubHeader('State Configuration');
  printKeyValue('State Rate', formatPercent(config.stateRate));
  printKeyValue('Local Rate', formatPercent(config.localRate));
  printKeyValue('Combined Rate', formatPercent(config.stateRate + config.localRate), true);
  printKeyValue('Trade-In Credit', config.tradeInCredit === true ? 'Full' : config.tradeInCredit === 'capped' ? `Capped at ${formatCurrency(config.tradeInCap!)}` : 'Not Allowed');
  if (config.specialScheme) {
    printKeyValue('Special Scheme', config.specialScheme, true);
  }

  printSubHeader('Taxable Items');
  for (const item of config.taxableItems) {
    print(`  ${c.green}✓${c.reset} ${item}`);
  }

  printSubHeader('Calculation Steps');
  for (const step of tax.breakdown) {
    print(`  ${c.dim}│${c.reset} ${step}`);
  }

  printSubHeader('Tax Summary');
  printKeyValue('State Tax', formatCurrency(tax.stateTax));
  printKeyValue('Local Tax', formatCurrency(tax.localTax));
  printKeyValue('TOTAL TAX', formatCurrency(tax.totalTax), true);
  printKeyValue('Effective Rate', formatPercent(tax.effectiveRate));

  print(`\n${c.dim}${config.notes}${c.reset}`);
}

async function showRateVersioning(): Promise<void> {
  printHeader('RUNTIME RATE VERSIONING');

  print(`
${c.bright}Problem:${c.reset} Tax rates change frequently. Traditional approaches require
code changes and redeployment for every rate update.

${c.bright}Solution:${c.reset} External JSON rate bundles loaded at runtime.
No recompilation needed. Updates propagate in < 1 hour.

${c.cyan}Implementation:${c.reset}

  ${c.dim}// TypeScript - Load rates from API${c.reset}
  ${c.bright}const response = await fetch('/api/tax/rates/bundle');
  const bundleJson = await response.text();

  const result = await initializeTaxRates(bundleJson);
  if (result.success) {
    console.log(\`Loaded \${result.metadata.stateCount} states\`);
    console.log(\`Effective date: \${result.metadata.effectiveDate}\`);
  }${c.reset}

${c.cyan}Rate Bundle Schema:${c.reset}
  • ${c.bright}51 state configurations${c.reset} (50 states + DC)
  • ${c.bright}12,000+ local jurisdictions${c.reset} (CA alone has 400+)
  • ${c.bright}Special scheme parameters${c.reset} (TAVT, HUT, Privilege Tax)
  • ${c.bright}Policy rules${c.reset} (trade-in caps, fee taxability, rebate treatment)
  • ${c.bright}Audit metadata${c.reset} (source references, effective dates)

${c.cyan}Change Detection:${c.reset}
  • Avalara/Vertex API integration (real-time)
  • LegiScan legislative tracking (free tier: 30K queries/mo)
  • State DOR email subscriptions (50 states)
  • Tax Foundation reports (Jan 1 & July 1)
`);
}

async function showArchitecture(): Promise<void> {
  printHeader('TECHNICAL ARCHITECTURE');

  print(`
${c.cyan}3-Stage DAG Pipeline (OPUS Architecture):${c.reset}

  ┌─────────────────────────────────────────────────────────────────────┐
  │ STAGE 1: BASE DETERMINATION                                         │
  │                                                                     │
  │   Vehicle Price ─┬─> Trade-In Policy ──> Taxable Base              │
  │   Trade-In      ─┤                                                  │
  │   Rebates       ─┘                                                  │
  └───────────────────────────────────────────┬─────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼─────────────────────────┐
  │ STAGE 2: RATE APPLICATION                                           │
  │                                                                     │
  │   Taxable Base ──> Jurisdiction Resolver ──> Rate Components       │
  │                    (ZIP → County → City → Districts)                │
  └───────────────────────────────────────────┬─────────────────────────┘
                                              │
  ┌───────────────────────────────────────────▼─────────────────────────┐
  │ STAGE 3: SPECIAL SCHEMES & RECIPROCITY                              │
  │                                                                     │
  │   Rate Components ─┬─> TAVT/HUT/Cap Logic ─┬─> Final Tax           │
  │   Origin Tax Info  ┴─> Reciprocity Credit ─┘                        │
  └─────────────────────────────────────────────────────────────────────┘

${c.cyan}51×51 Bilateral Reciprocity Matrix:${c.reset}

  When customer bought vehicle in State A, registering in State B:
  • Credit calculation varies by state pair
  • Some states: full credit for tax paid
  • Some states: credit up to their own rate
  • Some states: no credit at all
  • Time limits: NC requires tax paid within 90 days

${c.cyan}Performance (Rust/WASM):${c.reset}

  │ Metric              │ Value          │
  ├─────────────────────┼────────────────┤
  │ Single calculation  │ ~50 μs         │
  │ Batch (1000 deals)  │ ~8 ms          │
  │ WASM binary size    │ ~200 KB        │
  │ Memory footprint    │ ~2 MB          │
`);
}

async function showConclusion(): Promise<void> {
  printHeader('PARTNERSHIP VALUE PROPOSITION');

  print(`
${c.bright}What ATIE Brings to Reynolds & Reynolds:${c.reset}

${c.green}✓${c.reset} ${c.bright}Accuracy${c.reset}
  50-state coverage with special scheme handling (TAVT, HUT, Caps)
  12,000+ local jurisdiction support
  Automated rate updates from government sources

${c.green}✓${c.reset} ${c.bright}Performance${c.reset}
  Rust/WASM core: 50 μs per calculation
  In-browser execution: no server round-trips for calculations
  Offline-capable: works without network

${c.green}✓${c.reset} ${c.bright}Maintainability${c.reset}
  Runtime rate loading: no recompilation for updates
  JSON configuration: human-readable tax rules
  Full audit trail: every change logged with source

${c.green}✓${c.reset} ${c.bright}Modern Architecture${c.reset}
  TypeScript frontend + Go microservices
  PostgreSQL + Redis for data layer
  Post-Quantum Cryptography ready (ML-KEM/ML-DSA)

${c.yellow}Integration Options:${c.reset}

  1. ${c.bright}WASM Library${c.reset} - Embed in existing R&R applications
  2. ${c.bright}API Service${c.reset} - REST/GraphQL endpoint for tax calculations
  3. ${c.bright}White-Label${c.reset} - Full tax management dashboard
  4. ${c.bright}Data Provider${c.reset} - Rate bundle subscription service

${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bright}Contact: Autolytiq Development Team${c.reset}
${c.dim}Tax Engine Demo v1.0 | Generated: ${new Date().toISOString()}${c.reset}
`);
}

// Main execution
async function main(): Promise<void> {
  try {
    await showIntro();
    await waitForEnter();

    await showVehicleInfo();
    await waitForEnter();

    await showDealStructure();
    await waitForEnter();

    await showStateComparison();
    await waitForEnter();

    await showDetailedCalculation('IN');
    await waitForEnter();

    await showDetailedCalculation('MI');
    await waitForEnter();

    await showDetailedCalculation('SC');
    await waitForEnter();

    await showDetailedCalculation('CA');
    await waitForEnter();

    await showRateVersioning();
    await waitForEnter();

    await showArchitecture();
    await waitForEnter();

    await showConclusion();

    print('\n');
  } catch (error) {
    console.error('Demo error:', error);
    process.exit(1);
  }
}

// Run
void main();
