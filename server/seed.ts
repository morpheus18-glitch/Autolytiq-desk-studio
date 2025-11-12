import { db } from './db';
import { users, customers, vehicles, taxJurisdictions, deals, dealScenarios } from '@shared/schema';
import { hashPassword } from './auth';

async function seed() {
  console.log('🌱 Seeding database...');
  
  try {
    // Create demo admin user with password (DEVELOPMENT ONLY)
    // WARNING: Never run this seed in production environments
    if (process.env.NODE_ENV === 'development') {
      const demoPassword = await hashPassword('Demo123!');
      const [demo] = await db.insert(users).values({
        id: '00000000-0000-0000-0000-000000000001',
        username: 'demo',
        fullName: 'Demo Admin',
        email: 'demo@example.com',
        password: demoPassword,
        role: 'admin',
      }).returning();
      console.log('✓ Created demo admin user (development only)');
    }
    
    // Create users
    const salespersonPassword = await hashPassword('Password123!');
    const [salesperson] = await db.insert(users).values({
      username: 'john.smith',
      fullName: 'John Smith',
      email: 'john.smith@dealership.com',
      password: salespersonPassword,
      role: 'salesperson',
    }).returning();
    
    const managerPassword = await hashPassword('Password123!');
    const [manager] = await db.insert(users).values({
      username: 'sarah.johnson',
      fullName: 'Sarah Johnson',
      email: 'sarah.johnson@dealership.com',
      password: managerPassword,
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
    
    // Create vehicles with comprehensive data
    const vehiclesData = [
      // New vehicles
      {
        vin: '1HGBH41JXMN109186',
        year: 2024,
        make: 'Honda',
        model: 'Accord',
        trim: 'EX-L',
        mileage: 12,
        exteriorColor: 'Modern Steel Metallic',
        interiorColor: 'Black Leather',
        engineType: '1.5L Turbo I4',
        transmission: 'CVT',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        mpgCity: 32,
        mpgHighway: 42,
        price: '32500',
        msrp: '35000',
        invoicePrice: '30000',
        internetPrice: '31900',
        condition: 'new',
        status: 'available',
        isNew: true,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Honda%20Accord',
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/Interior',
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/Dashboard',
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/Engine'
        ]),
        features: JSON.stringify([
          { category: 'Safety', name: 'Honda Sensing®', description: 'Collision Mitigation Braking System™' },
          { category: 'Technology', name: 'Apple CarPlay®', description: 'Wireless connectivity' },
          { category: 'Comfort', name: 'Leather-Trimmed Seats', description: 'Premium leather upholstery' },
          { category: 'Technology', name: '12-Speaker Bose® Audio', description: 'Premium sound system' }
        ])
      },
      {
        vin: '1N4BL4CV1NC456789',
        year: 2024,
        make: 'Nissan',
        model: 'Altima',
        trim: 'SL',
        mileage: 8,
        exteriorColor: 'Pearl White',
        interiorColor: 'Tan Leather',
        engineType: '2.0L VC-Turbo I4',
        transmission: 'CVT',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        mpgCity: 25,
        mpgHighway: 34,
        price: '31200',
        msrp: '32900',
        invoicePrice: '29500',
        internetPrice: '30900',
        condition: 'new',
        status: 'available',
        isNew: true,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Nissan%20Altima'
        ]),
        features: JSON.stringify([
          { category: 'Safety', name: 'ProPILOT Assist', description: 'Semi-autonomous driving' },
          { category: 'Technology', name: '9" Touch Screen', description: 'Navigation system included' }
        ])
      },
      {
        vin: '1FTFW1E89NFA12345',
        year: 2024,
        make: 'Ford',
        model: 'F-150',
        trim: 'XLT',
        mileage: 15,
        exteriorColor: 'Race Red',
        interiorColor: 'Black Cloth',
        engineType: '3.5L EcoBoost V6',
        transmission: 'Automatic',
        drivetrain: '4WD',
        fuelType: 'Gasoline',
        mpgCity: 18,
        mpgHighway: 25,
        price: '52900',
        msrp: '55000',
        invoicePrice: '50000',
        internetPrice: '52500',
        condition: 'new',
        status: 'available',
        isNew: true,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Ford%20F-150',
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/Truck%20Bed'
        ]),
        features: JSON.stringify([
          { category: 'Performance', name: 'Max Towing Package', description: '13,000 lbs capacity' },
          { category: 'Technology', name: 'SYNC® 4', description: '12" touchscreen with navigation' },
          { category: 'Safety', name: 'Co-Pilot360™', description: 'Advanced driver assistance' }
        ])
      },
      // Used/Certified vehicles
      {
        vin: '5YJSA1E26KF123456',
        year: 2023,
        make: 'Tesla',
        model: 'Model 3',
        trim: 'Long Range',
        mileage: 8500,
        exteriorColor: 'Midnight Silver',
        interiorColor: 'White Premium',
        engineType: 'Dual Motor Electric',
        transmission: 'Single-Speed',
        drivetrain: 'AWD',
        fuelType: 'Electric',
        mpgCity: 142,
        mpgHighway: 132,
        price: '42900',
        msrp: '47000',
        invoicePrice: '40000',
        internetPrice: '42500',
        condition: 'used',
        status: 'available',
        isNew: false,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2023%20Tesla%20Model%203',
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/Tesla%20Interior',
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/Tesla%20Frunk'
        ]),
        features: JSON.stringify([
          { category: 'Technology', name: 'Full Self-Driving', description: 'Advanced Autopilot features' },
          { category: 'Performance', name: 'Long Range Battery', description: '353 miles EPA range' },
          { category: 'Technology', name: 'Premium Connectivity', description: 'Streaming and live traffic' }
        ])
      },
      {
        vin: '1C4HJXDG5MW567890',
        year: 2022,
        make: 'Jeep',
        model: 'Wrangler',
        trim: 'Rubicon',
        mileage: 18500,
        exteriorColor: 'Sting-Gray',
        interiorColor: 'Black Leather',
        engineType: '3.6L V6',
        transmission: 'Automatic',
        drivetrain: '4WD',
        fuelType: 'Gasoline',
        mpgCity: 17,
        mpgHighway: 23,
        price: '45900',
        msrp: '52000',
        invoicePrice: '43000',
        internetPrice: '45500',
        condition: 'certified',
        status: 'available',
        isNew: false,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2022%20Jeep%20Wrangler'
        ]),
        features: JSON.stringify([
          { category: 'Performance', name: 'Rock-Trac® 4WD', description: 'Heavy-duty off-road system' },
          { category: 'Technology', name: 'Uconnect® 5', description: '8.4" touchscreen display' }
        ])
      },
      {
        vin: '2C3CDXBG5NH123456',
        year: 2023,
        make: 'Dodge',
        model: 'Charger',
        trim: 'R/T',
        mileage: 12300,
        exteriorColor: 'Pitch Black',
        interiorColor: 'Red/Black Sport',
        engineType: '5.7L HEMI V8',
        transmission: 'Automatic',
        drivetrain: 'RWD',
        fuelType: 'Gasoline',
        mpgCity: 16,
        mpgHighway: 25,
        price: '38900',
        msrp: '42000',
        invoicePrice: '36000',
        internetPrice: '38500',
        condition: 'used',
        status: 'available',
        isNew: false,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2023%20Dodge%20Charger'
        ]),
        features: JSON.stringify([
          { category: 'Performance', name: 'HEMI® V8', description: '370 horsepower' },
          { category: 'Technology', name: 'Harman Kardon® Audio', description: 'Premium 19-speaker system' }
        ])
      },
      {
        vin: '1G1YY2D78P5678901',
        year: 2023,
        make: 'Chevrolet',
        model: 'Corvette',
        trim: 'Stingray 2LT',
        mileage: 3200,
        exteriorColor: 'Torch Red',
        interiorColor: 'Jet Black Leather',
        engineType: '6.2L V8',
        transmission: 'Automatic',
        drivetrain: 'RWD',
        fuelType: 'Gasoline',
        mpgCity: 15,
        mpgHighway: 27,
        price: '72900',
        msrp: '75000',
        invoicePrice: '68000',
        internetPrice: '72500',
        condition: 'used',
        status: 'available',
        isNew: false,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2023%20Chevrolet%20Corvette',
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/Corvette%20Engine'
        ]),
        features: JSON.stringify([
          { category: 'Performance', name: 'LT2 V8 Engine', description: '495 horsepower' },
          { category: 'Technology', name: 'Performance Data Recorder', description: 'Track telemetry system' },
          { category: 'Performance', name: 'Magnetic Ride Control', description: 'Adaptive suspension' }
        ])
      },
      {
        vin: '4JGFB4KB9PA789012',
        year: 2023,
        make: 'Mercedes-Benz',
        model: 'GLC',
        trim: '300 4MATIC',
        mileage: 6800,
        exteriorColor: 'Polar White',
        interiorColor: 'Macchiato Beige',
        engineType: '2.0L Turbo I4',
        transmission: 'Automatic',
        drivetrain: 'AWD',
        fuelType: 'Gasoline',
        mpgCity: 23,
        mpgHighway: 31,
        price: '48900',
        msrp: '52000',
        invoicePrice: '46000',
        internetPrice: '48500',
        condition: 'certified',
        status: 'available',
        isNew: false,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2023%20Mercedes-Benz%20GLC'
        ]),
        features: JSON.stringify([
          { category: 'Technology', name: 'MBUX Infotainment', description: 'Voice-activated controls' },
          { category: 'Comfort', name: 'Panoramic Sunroof', description: 'Dual-pane glass roof' },
          { category: 'Safety', name: 'Driver Assistance Package', description: 'Active brake assist' }
        ])
      },
      {
        vin: 'WBA13BJ09PCB23456',
        year: 2022,
        make: 'BMW',
        model: '330i',
        trim: 'xDrive',
        mileage: 22000,
        exteriorColor: 'Alpine White',
        interiorColor: 'Black SensaTec',
        engineType: '2.0L TwinPower Turbo I4',
        transmission: 'Automatic',
        drivetrain: 'AWD',
        fuelType: 'Gasoline',
        mpgCity: 26,
        mpgHighway: 36,
        price: '39900',
        msrp: '45000',
        invoicePrice: '37000',
        internetPrice: '39500',
        condition: 'certified',
        status: 'available',
        isNew: false,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2022%20BMW%20330i'
        ]),
        features: JSON.stringify([
          { category: 'Technology', name: 'iDrive 7.0', description: 'Latest infotainment system' },
          { category: 'Performance', name: 'Sport Package', description: 'Sport suspension and steering' }
        ])
      },
      {
        vin: 'JTDBAMDE0PJ345678',
        year: 2024,
        make: 'Toyota',
        model: 'Camry',
        trim: 'XSE',
        mileage: 5,
        exteriorColor: 'Supersonic Red',
        interiorColor: 'Black Sport',
        engineType: '2.5L I4',
        transmission: 'Automatic',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        mpgCity: 28,
        mpgHighway: 39,
        price: '32900',
        msrp: '34500',
        invoicePrice: '31000',
        internetPrice: '32500',
        condition: 'new',
        status: 'available',
        isNew: true,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Toyota%20Camry'
        ]),
        features: JSON.stringify([
          { category: 'Safety', name: 'Toyota Safety Sense 2.5+', description: 'Pre-collision system' },
          { category: 'Technology', name: '9" Touch Screen', description: 'JBL® premium audio' }
        ])
      },
      {
        vin: 'KMHLN4AG3PU456789',
        year: 2024,
        make: 'Hyundai',
        model: 'Elantra',
        trim: 'Limited',
        mileage: 10,
        exteriorColor: 'Phantom Black',
        interiorColor: 'Gray Leather',
        engineType: '1.6L Turbo I4',
        transmission: 'Automatic',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        mpgCity: 28,
        mpgHighway: 37,
        price: '27900',
        msrp: '29500',
        invoicePrice: '26000',
        internetPrice: '27500',
        condition: 'new',
        status: 'available',
        isNew: true,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Hyundai%20Elantra'
        ]),
        features: JSON.stringify([
          { category: 'Technology', name: 'Digital Key 2', description: 'Smartphone car key' },
          { category: 'Comfort', name: 'Heated & Ventilated Seats', description: 'Front seats' }
        ])
      },
      // In-transit vehicle
      {
        vin: '3VW2B7AJ8PM567890',
        year: 2024,
        make: 'Volkswagen',
        model: 'Jetta',
        trim: 'GLI',
        mileage: 0,
        exteriorColor: 'Pure Gray',
        interiorColor: 'Titan Black',
        engineType: '2.0L Turbo I4',
        transmission: 'Manual',
        drivetrain: 'FWD',
        fuelType: 'Gasoline',
        mpgCity: 25,
        mpgHighway: 33,
        price: '31900',
        msrp: '33500',
        invoicePrice: '30000',
        internetPrice: '31500',
        condition: 'new',
        status: 'in_transit',
        isNew: true,
        images: JSON.stringify([
          'https://placeholder.pics/svg/800x600/DEDEDE/555555/2024%20Volkswagen%20Jetta%20GLI'
        ]),
        features: JSON.stringify([
          { category: 'Performance', name: 'DCC® Adaptive Chassis', description: 'Adjustable suspension' },
          { category: 'Technology', name: 'Digital Cockpit Pro', description: 'Fully digital gauges' }
        ])
      }
    ];
    
    const insertedVehicles = await db.insert(vehicles).values(vehiclesData).returning();
    console.log('✓ Created vehicles');
    
    // Create tax jurisdictions with multi-level support
    const jurisdictionsData = [
      {
        state: 'CA',
        county: 'Los Angeles',
        city: null,
        township: null,
        specialDistrict: null,
        zipCode: null,
        stateTaxRate: '0.0725',
        countyTaxRate: '0.0025',
        cityTaxRate: '0',
        townshipTaxRate: '0',
        specialDistrictTaxRate: '0',
        tradeInCreditType: 'tax_on_difference',
        registrationFee: '65.00',
        titleFee: '15.00',
        plateFee: '30.00',
        docFeeMax: '85.00',
      },
      {
        state: 'CA',
        county: 'San Francisco',
        city: 'San Francisco',
        township: null,
        specialDistrict: 'BART District',
        zipCode: '94102',
        stateTaxRate: '0.0725',
        countyTaxRate: '0.0025',
        cityTaxRate: '0.005',
        townshipTaxRate: '0',
        specialDistrictTaxRate: '0.0025',
        tradeInCreditType: 'tax_on_difference',
        registrationFee: '65.00',
        titleFee: '15.00',
        plateFee: '30.00',
        docFeeMax: '85.00',
      },
      {
        state: 'CA',
        county: 'San Diego',
        city: 'San Diego',
        township: null,
        specialDistrict: null,
        zipCode: '92101',
        stateTaxRate: '0.0725',
        countyTaxRate: '0.0025',
        cityTaxRate: '0.0075',
        townshipTaxRate: '0',
        specialDistrictTaxRate: '0',
        tradeInCreditType: 'tax_on_difference',
        registrationFee: '65.00',
        titleFee: '15.00',
        plateFee: '30.00',
        docFeeMax: '85.00',
      },
      {
        state: 'IL',
        county: 'Cook',
        city: 'Chicago',
        township: 'Evanston Township',
        specialDistrict: 'Metropolitan Pier & Exposition Authority',
        zipCode: '60601',
        stateTaxRate: '0.0625',
        countyTaxRate: '0.0175',
        cityTaxRate: '0.0125',
        townshipTaxRate: '0.0025',
        specialDistrictTaxRate: '0.0100',
        tradeInCreditType: 'none',
        registrationFee: '151.00',
        titleFee: '155.00',
        plateFee: '20.00',
        docFeeMax: '300.00',
      },
      {
        state: 'TX',
        county: 'Harris',
        city: 'Houston',
        township: null,
        specialDistrict: 'Metro Transit Authority',
        zipCode: '77002',
        stateTaxRate: '0.0625',
        countyTaxRate: '0',
        cityTaxRate: '0.01',
        townshipTaxRate: '0',
        specialDistrictTaxRate: '0.0100',
        tradeInCreditType: 'none',
        registrationFee: '50.75',
        titleFee: '33.00',
        plateFee: '6.00',
        docFeeMax: '150.00',
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
