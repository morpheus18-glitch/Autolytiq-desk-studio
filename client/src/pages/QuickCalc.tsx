/**
 * Quick Deal Calculator - Standalone Page
 *
 * Accessible without authentication for quick deal calculations.
 * Uses Indiana tax defaults if no customer/vehicle specified.
 */

import { useState } from 'react';
import { Calculator, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, FormInput, FormField, FormSelect } from '@design-system';
import { formatCurrency } from '@/lib/utils';

const US_STATES = [
  { value: 'IN', label: 'Indiana (7%)' },
  { value: 'CA', label: 'California (7.25%)' },
  { value: 'TX', label: 'Texas (6.25%)' },
  { value: 'FL', label: 'Florida (6%)' },
  { value: 'NY', label: 'New York (4%)' },
];

const TAX_RATES: Record<string, number> = {
  IN: 0.07,
  CA: 0.0725,
  TX: 0.0625,
  FL: 0.06,
  NY: 0.04,
};

export function QuickCalcPage() {
  const [salePrice, setSalePrice] = useState<number>(25000);
  const [tradeValue, setTradeValue] = useState<number>(0);
  const [tradePayoff, setTradePayoff] = useState<number>(0);
  const [cashDown, setCashDown] = useState<number>(0);
  const [apr, setApr] = useState<number>(5.9);
  const [term, setTerm] = useState<number>(60);
  const [stateCode, setStateCode] = useState<string>('IN');

  // Calculations
  const taxRate = TAX_RATES[stateCode] || 0.07;
  const netTrade = tradeValue - tradePayoff;
  const taxableAmount = salePrice - tradeValue;
  const taxAmount = taxableAmount * taxRate;
  const docFee = 199;
  const totalFees = docFee + 190; // doc + reg/title
  const amountFinanced = salePrice - netTrade - cashDown + taxAmount + totalFees;

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
            Quick Deal Calculator
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
                  <div className={`p-3 rounded-lg ${netTrade >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Trade Equity</span>
                      <span className={`font-bold ${netTrade >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(netTrade)}
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
