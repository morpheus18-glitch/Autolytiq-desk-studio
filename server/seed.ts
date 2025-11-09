import { db } from './db';
import { users, customers, vehicles, taxJurisdictions, deals, dealScenarios } from '@shared/schema';

async function seed() {
  console.log('🌱 Seeding database...');
  
  try {
    // Create users
    const [salesperson] = await db.insert(users).values({
      username: 'john.smith',
      fullName: 'John Smith',
      role: 'salesperson',
    }).returning();
    
    const [manager] = await db.insert(users).values({
      username: 'sarah.johnson',
      fullName: 'Sarah Johnson',
      role: 'sales_manager',
    }).returning();
    
    console.log('✓ Created users');
    
    // Create customers
    const customersData = [
      {
        firstName: 'Michael',
        lastName: 'Anderson',
        email: 'michael.anderson@email.com',
        phone: '(555) 123-4567',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
      },
      {
        firstName: 'Jennifer',
        lastName: 'Williams',
        email: 'jennifer.williams@email.com',
        phone: '(555) 234-5678',
        address: '456 Oak Ave',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
      {
        firstName: 'David',
        lastName: 'Martinez',
        email: 'david.martinez@email.com',
        phone: '(555) 345-6789',
        address: '789 Elm St',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92101',
      },
    ];
    
    const insertedCustomers = await db.insert(customers).values(customersData).returning();
    console.log('✓ Created customers');
    
    // Create vehicles
    const vehiclesData = [
      {
        stockNumber: 'V2024-001',
        vin: '1HGBH41JXMN109186',
        year: 2024,
        make: 'Honda',
        model: 'Accord',
        trim: 'EX-L',
        mileage: 12,
        exteriorColor: 'Modern Steel Metallic',
        interiorColor: 'Black Leather',
        price: '32500',
        msrp: '35000',
        invoice: '30000',
        isNew: true,
      },
      {
        stockNumber: 'V2023-045',
        vin: '5YJSA1E26KF123456',
        year: 2023,
        make: 'Tesla',
        model: 'Model 3',
        trim: 'Long Range',
        mileage: 8500,
        exteriorColor: 'Midnight Silver',
        interiorColor: 'White Premium',
        price: '42900',
        msrp: '47000',
        invoice: '40000',
        isNew: false,
      },
      {
        stockNumber: 'V2024-012',
        vin: '3VWDX7AJ5KM123789',
        year: 2024,
        make: 'Volkswagen',
        model: 'Atlas',
        trim: 'SEL Premium',
        mileage: 5,
        exteriorColor: 'Pure White',
        interiorColor: 'Titan Black',
        price: '45800',
        msrp: '48500',
        invoice: '43000',
        isNew: true,
      },
    ];
    
    const insertedVehicles = await db.insert(vehicles).values(vehiclesData).returning();
    console.log('✓ Created vehicles');
    
    // Create tax jurisdictions
    const jurisdictionsData = [
      {
        state: 'CA',
        county: 'Los Angeles',
        city: null,
        stateTaxRate: '0.0725',
        countyTaxRate: '0.0025',
        cityTaxRate: '0',
        tradeInCreditType: 'tax_on_difference',
        registrationFee: '65.00',
        titleFee: '15.00',
        plateFee: '30.00',
        docFeeMax: '85.00',
      },
      {
        state: 'CA',
        county: 'San Francisco',
        city: null,
        stateTaxRate: '0.0725',
        countyTaxRate: '0.0025',
        cityTaxRate: '0.005',
        tradeInCreditType: 'tax_on_difference',
        registrationFee: '65.00',
        titleFee: '15.00',
        plateFee: '30.00',
        docFeeMax: '85.00',
      },
      {
        state: 'CA',
        county: 'San Diego',
        city: null,
        stateTaxRate: '0.0725',
        countyTaxRate: '0.0025',
        cityTaxRate: '0',
        tradeInCreditType: 'tax_on_difference',
        registrationFee: '65.00',
        titleFee: '15.00',
        plateFee: '30.00',
        docFeeMax: '85.00',
      },
    ];
    
    const insertedJurisdictions = await db.insert(taxJurisdictions).values(jurisdictionsData).returning();
    console.log('✓ Created tax jurisdictions');
    
    // Create sample deals with scenarios
    const [deal1] = await db.insert(deals).values({
      dealNumber: '2024-11-0001',
      salespersonId: salesperson.id,
      salesManagerId: manager.id,
      customerId: insertedCustomers[0].id,
      vehicleId: insertedVehicles[0].id,
      dealState: 'IN_PROGRESS',
    }).returning();
    
    await db.insert(dealScenarios).values({
      dealId: deal1.id,
      scenarioType: 'FINANCE_DEAL',
      name: 'Finance - 60 Month',
      vehiclePrice: '32500',
      downPayment: '5000',
      apr: '4.99',
      term: 60,
      tradeAllowance: '0',
      tradePayoff: '0',
      dealerFees: [
        { name: 'Doc Fee', amount: 85, taxable: false },
        { name: 'Registration', amount: 65, taxable: false },
      ],
      accessories: [],
      taxJurisdictionId: insertedJurisdictions[0].id,
      totalTax: '2106.88',
      totalFees: '150',
      amountFinanced: '29756.88',
      monthlyPayment: '559.17',
      totalCost: '33550.20',
    });
    
    await db.insert(dealScenarios).values({
      dealId: deal1.id,
      scenarioType: 'LEASE_DEAL',
      name: 'Lease - 36 Month',
      vehiclePrice: '32500',
      downPayment: '3000',
      moneyFactor: '0.00125',
      term: 36,
      residualValue: '19500',
      residualPercent: '60',
      tradeAllowance: '0',
      tradePayoff: '0',
      dealerFees: [
        { name: 'Doc Fee', amount: 85, taxable: false },
      ],
      accessories: [],
      taxJurisdictionId: insertedJurisdictions[0].id,
      totalTax: '2106.88',
      totalFees: '85',
      amountFinanced: '31691.88',
      monthlyPayment: '427.50',
      totalCost: '15390.00',
    });
    
    console.log('✓ Created sample deal with scenarios');
    
    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
