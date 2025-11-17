import { useState } from 'react';
import type { Customer } from '@shared/schema';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerHistoryTimeline } from './customer-history-timeline';
import { CustomerNotes } from './customer-notes';
import { CustomerActionMenu } from './customer-action-menu';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Briefcase,
  DollarSign,
  FileText,
  Camera,
  Edit,
  X,
  History,
  MessageSquare,
  Car,
} from 'lucide-react';

interface CustomerDetailSheetProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (customer: Customer) => void;
}

export function CustomerDetailSheet({ customer, open, onOpenChange, onEdit }: CustomerDetailSheetProps) {
  if (!customer) return null;

  const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg overflow-y-auto"
        data-testid="sheet-customer-detail"
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Customer Details</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-sheet"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <SheetDescription>
            View and manage customer information
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="py-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <User className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="notes">
              <MessageSquare className="w-4 h-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Customer Header */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border-2 border-primary/30 overflow-hidden">
              {customer.photoUrl ? (
                <img 
                  src={customer.photoUrl} 
                  alt={`${customer.firstName} ${customer.lastName}`} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">{initials}</span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">
                {customer.firstName} {customer.lastName}
              </h2>
              {customer.customerNumber && (
                <p className="text-sm text-muted-foreground font-mono">
                  {customer.customerNumber}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="space-y-2 text-sm">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.preferredContactMethod && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Preferred: {customer.preferredContactMethod}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Address */}
          {(customer.address || customer.city || customer.state || customer.zipCode) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </h3>
                <div className="text-sm space-y-1">
                  {customer.address && <p>{customer.address}</p>}
                  {(customer.city || customer.state || customer.zipCode) && (
                    <p>
                      {customer.city && `${customer.city}, `}
                      {customer.state && `${customer.state} `}
                      {customer.zipCode}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Driver's License */}
          {(customer.driversLicenseNumber || customer.driversLicenseState || customer.dateOfBirth) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Identification
                </h3>
                <div className="space-y-2 text-sm">
                  {customer.dateOfBirth && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>DOB: {new Date(customer.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                  )}
                  {customer.driversLicenseNumber && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span>
                        DL: {customer.driversLicenseNumber}
                        {customer.driversLicenseState && ` (${customer.driversLicenseState})`}
                      </span>
                    </div>
                  )}
                  {customer.ssnLast4 && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>SSN: ***-**-{customer.ssnLast4}</span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Employment */}
          {(customer.employer || customer.occupation || customer.monthlyIncome) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Employment
                </h3>
                <div className="space-y-2 text-sm">
                  {customer.employer && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.employer}</span>
                    </div>
                  )}
                  {customer.occupation && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.occupation}</span>
                    </div>
                  )}
                  {customer.monthlyIncome && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span>Monthly Income: ${Number(customer.monthlyIncome).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Credit Score */}
          {customer.creditScore && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Credit Information
                </h3>
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Credit Score:</span>
                    <Badge variant={customer.creditScore >= 700 ? 'default' : 'secondary'}>
                      {customer.creditScore}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Current Vehicle & Trade */}
          {(customer.currentVehicleYear || customer.currentVehicleMake || customer.currentVehicleModel || customer.tradeAllowance) && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Vehicle & Trade Information
                </h3>
                
                {/* Current Vehicle */}
                {(customer.currentVehicleYear || customer.currentVehicleMake || customer.currentVehicleModel) && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Vehicle</p>
                    <div className="text-sm space-y-1">
                      {customer.currentVehicleYear && customer.currentVehicleMake && customer.currentVehicleModel && (
                        <p className="font-medium">
                          {customer.currentVehicleYear} {customer.currentVehicleMake} {customer.currentVehicleModel}
                          {customer.currentVehicleTrim && ` ${customer.currentVehicleTrim}`}
                        </p>
                      )}
                      {customer.currentVehicleVin && (
                        <p className="text-muted-foreground font-mono text-xs">VIN: {customer.currentVehicleVin}</p>
                      )}
                      <div className="flex gap-3 text-muted-foreground">
                        {customer.currentVehicleMileage && (
                          <span>{customer.currentVehicleMileage.toLocaleString()} miles</span>
                        )}
                        {customer.currentVehicleColor && (
                          <span>• {customer.currentVehicleColor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Trade-In Information */}
                {(customer.tradeAllowance || customer.tradeACV || customer.tradePayoff) && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trade-In</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {customer.tradeAllowance && (
                        <div>
                          <span className="text-muted-foreground">Allowance:</span>
                          <p className="font-medium">${Number(customer.tradeAllowance).toLocaleString()}</p>
                        </div>
                      )}
                      {customer.tradeACV && (
                        <div>
                          <span className="text-muted-foreground">ACV:</span>
                          <p className="font-medium">${Number(customer.tradeACV).toLocaleString()}</p>
                        </div>
                      )}
                      {customer.tradePayoff && (
                        <div>
                          <span className="text-muted-foreground">Payoff:</span>
                          <p className="font-medium">${Number(customer.tradePayoff).toLocaleString()}</p>
                        </div>
                      )}
                      {customer.tradePayoffTo && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Lender:</span>
                          <p className="font-medium">{customer.tradePayoffTo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {customer.notes && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Marketing Preferences */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Marketing Preferences
            </h3>
            <div className="text-sm">
              <Badge variant={customer.marketingOptIn ? 'default' : 'secondary'}>
                {customer.marketingOptIn ? 'Opted In' : 'Opted Out'}
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <Separator className="my-4" />
          <CustomerActionMenu customer={customer} variant="default" />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1 gap-2"
              onClick={() => onEdit?.(customer)}
              data-testid="button-edit-customer"
            >
              <Edit className="w-4 h-4" />
              Edit Customer
            </Button>
          </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Customer activity timeline showing deals, interactions, and history.
              </p>
              <CustomerHistoryTimeline customerId={customer.id} />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add and view notes about this customer.
              </p>
              <CustomerNotes customerId={customer.id} />
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
