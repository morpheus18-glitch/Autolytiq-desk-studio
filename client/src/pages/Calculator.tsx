/**
 * Deal Calculator - Standalone Page
 *
 * Accessible without authentication for quick deal calculations.
 * All 50 US states with accurate tax rates included.
 */

import { useState } from 'react';
import { Calculator, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, FormInput, FormField, FormSelect } from '@design-system';
import { formatCurrency } from '@/lib/utils';

const US_STATES = [
  { value: 'AL', label: 'Alabama (4%)' },
  { value: 'AK', label: 'Alaska (0%)' },
  { value: 'AZ', label: 'Arizona (5.6%)' },
  { value: 'AR', label: 'Arkansas (6.5%)' },
  { value: 'CA', label: 'California (7.25%)' },
  { value: 'CO', label: 'Colorado (2.9%)' },
  { value: 'CT', label: 'Connecticut (6.35%)' },
  { value: 'DE', label: 'Delaware (0%)' },
  { value: 'FL', label: 'Florida (6%)' },
  { value: 'GA', label: 'Georgia (4%)' },
  { value: 'HI', label: 'Hawaii (4%)' },
  { value: 'ID', label: 'Idaho (6%)' },
  { value: 'IL', label: 'Illinois (6.25%)' },
  { value: 'IN', label: 'Indiana (7%)' },
  { value: 'IA', label: 'Iowa (5%)' },
  { value: 'KS', label: 'Kansas (7.5%)' },
  { value: 'KY', label: 'Kentucky (6%)' },
  { value: 'LA', label: 'Louisiana (4.45%)' },
  { value: 'ME', label: 'Maine (5.5%)' },
  { value: 'MD', label: 'Maryland (6%)' },
  { value: 'MA', label: 'Massachusetts (6.25%)' },
  { value: 'MI', label: 'Michigan (6%)' },
  { value: 'MN', label: 'Minnesota (6.875%)' },
  { value: 'MS', label: 'Mississippi (5%)' },
  { value: 'MO', label: 'Missouri (4.225%)' },
  { value: 'MT', label: 'Montana (0%)' },
  { value: 'NE', label: 'Nebraska (5.5%)' },
  { value: 'NV', label: 'Nevada (6.85%)' },
  { value: 'NH', label: 'New Hampshire (0%)' },
  { value: 'NJ', label: 'New Jersey (6.625%)' },
  { value: 'NM', label: 'New Mexico (5.125%)' },
  { value: 'NY', label: 'New York (4%)' },
  { value: 'NC', label: 'North Carolina (3%)' },
  { value: 'ND', label: 'North Dakota (5%)' },
  { value: 'OH', label: 'Ohio (5.75%)' },
  { value: 'OK', label: 'Oklahoma (3.25%)' },
  { value: 'OR', label: 'Oregon (0%)' },
  { value: 'PA', label: 'Pennsylvania (6%)' },
  { value: 'RI', label: 'Rhode Island (7%)' },
  { value: 'SC', label: 'South Carolina (5%)' },
  { value: 'SD', label: 'South Dakota (4%)' },
  { value: 'TN', label: 'Tennessee (7%)' },
  { value: 'TX', label: 'Texas (6.25%)' },
  { value: 'UT', label: 'Utah (6.85%)' },
  { value: 'VT', label: 'Vermont (6%)' },
  { value: 'VA', label: 'Virginia (4.15%)' },
  { value: 'WA', label: 'Washington (6.5%)' },
  { value: 'WV', label: 'West Virginia (6%)' },
  { value: 'WI', label: 'Wisconsin (5%)' },
  { value: 'WY', label: 'Wyoming (4%)' },
];

const TAX_RATES: Record<string, number> = {
  AL: 0.04, AK: 0.00, AZ: 0.056, AR: 0.065, CA: 0.0725,
  CO: 0.029, CT: 0.0635, DE: 0.00, FL: 0.06, GA: 0.04,
  HI: 0.04, ID: 0.06, IL: 0.0625, IN: 0.07, IA: 0.05,
  KS: 0.075, KY: 0.06, LA: 0.0445, ME: 0.055, MD: 0.06,
  MA: 0.0625, MI: 0.06, MN: 0.06875, MS: 0.05, MO: 0.04225,
  MT: 0.00, NE: 0.055, NV: 0.0685, NH: 0.00, NJ: 0.06625,
  NM: 0.05125, NY: 0.04, NC: 0.03, ND: 0.05, OH: 0.0575,
  OK: 0.0325, OR: 0.00, PA: 0.06, RI: 0.07, SC: 0.05,
  SD: 0.04, TN: 0.07, TX: 0.0625, UT: 0.0685, VT: 0.06,
  VA: 0.0415, WA: 0.065, WV: 0.06, WI: 0.05, WY: 0.04,
};

export function CalculatorPage() {
  const [salePrice, setSalePrice] = useState<number>(25000);
  const [tradeValue, setTradeValue] = useState<number>(0);
  const [tradePayoff, setTradePayoff] = useState<number>(0);
  const [cashDown, setCashDown] = useState<number>(0);
  const [apr, setApr] = useState<number>(5.9);
  const [term, setTerm] = useState<number>(60);
  const [stateCode, setStateCode] = useState<string>('IN');

  // Calculations
  const taxRate = TAX_RATES[stateCode] || 0.07;
  const netTradeValue = tradeValue - tradePayoff;
  const taxableAmount = salePrice - tradeValue;
  const taxAmount = taxableAmount * taxRate;
  const docFee = 199;
  const totalFees = docFee + 190; // doc + reg/title
  const amountFinanced = salePrice - netTradeValue - cashDown + taxAmount + totalFees;

  // Monthly payment calculation
  const monthlyRate = apr / 100 / 12;
  const monthlyPayment = amountFinanced > 0
    ? amountFinanced * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
    : 0;

  const totalInterest = (monthlyPayment * term) - amountFinanced;
  const totalOfPayments = monthlyPayment * term;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            Deal Calculator
          </h1>
          <p className="text-muted-foreground mt-2">
            Fast standalone calculator - no login required
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vehicle Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Sale Price" required>
                    <FormInput
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(Number(e.target.value))}
                    />
                  </FormField>

                  <FormField label="State" required>
                    <FormSelect
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      options={US_STATES}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trade-In</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Trade Allowance">
                    <FormInput
                      type="number"
                      value={tradeValue}
                      onChange={(e) => setTradeValue(Number(e.target.value))}
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="Trade Payoff">
                    <FormInput
                      type="number"
                      value={tradePayoff}
                      onChange={(e) => setTradePayoff(Number(e.target.value))}
                      placeholder="0"
                    />
                  </FormField>
                </div>

                {(tradeValue > 0 || tradePayoff > 0) && (
                  <div className={`p-3 rounded-lg ${netTradeValue >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Trade Equity</span>
                      <span className={`font-bold ${netTradeValue >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(netTradeValue)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Finance Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Cash Down">
                    <FormInput
                      type="number"
                      value={cashDown}
                      onChange={(e) => setCashDown(Number(e.target.value))}
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="APR (%)">
                    <FormInput
                      type="number"
                      step="0.1"
                      value={apr}
                      onChange={(e) => setApr(Number(e.target.value))}
                    />
                  </FormField>

                  <FormField label="Term (months)">
                    <FormSelect
                      value={term.toString()}
                      onChange={(e) => setTerm(Number(e.target.value))}
                      options={[
                        { value: '24', label: '24 mo' },
                        { value: '36', label: '36 mo' },
                        { value: '48', label: '48 mo' },
                        { value: '60', label: '60 mo' },
                        { value: '72', label: '72 mo' },
                        { value: '84', label: '84 mo' },
                      ]}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-4 space-y-4">
              {/* Payment Display */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 text-center border border-primary/20">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Monthly Payment
                </p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(monthlyPayment)}
                  <span className="text-lg font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {term} months @ {apr}% APR
                </p>
              </div>

              {/* Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Deal Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Price</span>
                    <span className="font-medium">{formatCurrency(salePrice)}</span>
                  </div>

                  {tradeValue > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Trade-In Allowance</span>
                      <span>-{formatCurrency(tradeValue)}</span>
                    </div>
                  )}

                  {tradePayoff > 0 && (
                    <div className="flex justify-between text-warning">
                      <span>Trade Payoff</span>
                      <span>+{formatCurrency(tradePayoff)}</span>
                    </div>
                  )}

                  {cashDown > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Cash Down</span>
                      <span>-{formatCurrency(cashDown)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(2)}%)</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fees</span>
                    <span className="font-medium">{formatCurrency(totalFees)}</span>
                  </div>

                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Amount Financed</span>
                    <span className="text-primary">{formatCurrency(amountFinanced)}</span>
                  </div>

                  <div className="flex justify-between text-warning">
                    <span>Total Interest</span>
                    <span className="font-medium">{formatCurrency(totalInterest)}</span>
                  </div>

                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total of Payments</span>
                    <span>{formatCurrency(totalOfPayments)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase mb-3">
                  Federal Truth in Lending Disclosure
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-blue-900/30 rounded p-2 text-center">
                    <p className="text-[10px] text-blue-600 uppercase">APR</p>
                    <p className="text-lg font-bold">{apr.toFixed(2)}%</p>
                  </div>
                  <div className="bg-white dark:bg-blue-900/30 rounded p-2 text-center">
                    <p className="text-[10px] text-blue-600 uppercase">Finance Charge</p>
                    <p className="text-lg font-bold">{formatCurrency(totalInterest)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
