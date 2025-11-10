import { db } from './db';
import { vehicles, type InsertVehicle } from '@shared/schema';

const vehicleData: InsertVehicle[] = [
  {
    vin: 'JH4KA7560NC000001',
    year: 2024,
    make: 'Toyota',
    model: 'Camry',
    trim: 'XLE',
    mileage: 150,
    exteriorColor: 'Midnight Black Metallic',
    interiorColor: 'Black Leather',
    engineType: '2.5L 4-Cylinder',
    transmission: 'Automatic',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    mpgCity: 28,
    mpgHighway: 39,
    price: '32990',
    msrp: '35500',
    invoicePrice: '31000',
    internetPrice: '31990',
    condition: 'new',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
      'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800'
    ],
    features: [
      'Apple CarPlay', 'Android Auto', 'Blind Spot Monitoring', 
      'Lane Keep Assist', 'Adaptive Cruise Control', 'Leather Seats',
      'Panoramic Sunroof', 'Premium Audio System'
    ],
    isNew: true
  },
  {
    vin: 'WBA3B5C52EF000002',
    year: 2024,
    make: 'BMW',
    model: '3 Series',
    trim: '330i xDrive',
    mileage: 250,
    exteriorColor: 'Alpine White',
    interiorColor: 'Cognac Leather',
    engineType: '2.0L TwinPower Turbo',
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuelType: 'Gasoline',
    mpgCity: 26,
    mpgHighway: 36,
    price: '48990',
    msrp: '52000',
    invoicePrice: '47000',
    internetPrice: '47990',
    condition: 'new',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1555215858-9dc80a68b51f?w=800',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800'
    ],
    features: [
      'M Sport Package', 'Harman Kardon Sound', 'Gesture Control',
      'Wireless Charging', 'Head-Up Display', 'Navigation Professional',
      'Active Driving Assistant', 'Parking Assistant Plus'
    ],
    isNew: true
  },
  {
    vin: '1G1ZD5ST2LF000003',
    year: 2023,
    make: 'Chevrolet',
    model: 'Malibu',
    trim: 'LT',
    mileage: 12500,
    exteriorColor: 'Summit White',
    interiorColor: 'Jet Black',
    engineType: '1.5L Turbo',
    transmission: 'CVT',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    mpgCity: 29,
    mpgHighway: 36,
    price: '22990',
    msrp: '28500',
    invoicePrice: '21000',
    internetPrice: '21990',
    condition: 'certified',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800'
    ],
    features: [
      'Teen Driver Technology', 'Chevrolet Infotainment 3',
      'Wireless Apple CarPlay', 'Android Auto', 'Remote Start',
      'Dual-Zone Climate Control', 'Power Driver Seat'
    ],
    isNew: false
  },
  {
    vin: '2HGFC2F59MH000004',
    year: 2023,
    make: 'Honda',
    model: 'Civic',
    trim: 'Sport',
    mileage: 8200,
    exteriorColor: 'Sonic Gray Pearl',
    interiorColor: 'Black Sport',
    engineType: '2.0L 4-Cylinder',
    transmission: 'Manual',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    mpgCity: 30,
    mpgHighway: 37,
    price: '24990',
    msrp: '28000',
    invoicePrice: '23500',
    internetPrice: '23990',
    condition: 'used',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800'
    ],
    features: [
      'Honda Sensing Suite', 'Sport Pedals', '18-inch Alloy Wheels',
      'Apple CarPlay', 'Android Auto', 'Sport Exhaust',
      'LED Headlights', 'Smart Entry'
    ],
    isNew: false
  },
  {
    vin: '5YJ3E1EA5KF000005',
    year: 2024,
    make: 'Tesla',
    model: 'Model 3',
    trim: 'Long Range',
    mileage: 100,
    exteriorColor: 'Pearl White Multi-Coat',
    interiorColor: 'Black Premium',
    engineType: 'Dual Motor Electric',
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuelType: 'Electric',
    mpgCity: 142,
    mpgHighway: 123,
    price: '47990',
    msrp: '50990',
    invoicePrice: '46000',
    internetPrice: '46990',
    condition: 'new',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
      'https://images.unsplash.com/photo-1571987937324-a9d59e4de2f4?w=800'
    ],
    features: [
      'Autopilot', 'Full Self-Driving Capability', '15-inch Touchscreen',
      'Premium Connectivity', 'Heated Seats', 'Glass Roof',
      'Power Liftgate', 'Wireless Phone Chargers'
    ],
    isNew: true
  },
  {
    vin: '1FTFW1ET5DF000006',
    year: 2023,
    make: 'Ford',
    model: 'F-150',
    trim: 'XLT SuperCrew',
    mileage: 15000,
    exteriorColor: 'Oxford White',
    interiorColor: 'Medium Light Camel',
    engineType: '3.5L V6 EcoBoost',
    transmission: 'Automatic',
    drivetrain: '4WD',
    fuelType: 'Gasoline',
    mpgCity: 18,
    mpgHighway: 24,
    price: '48990',
    msrp: '55000',
    invoicePrice: '47000',
    internetPrice: '47990',
    condition: 'used',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1544829828-2043559486342?w=800'
    ],
    features: [
      'SYNC 4', 'FordPass Connect', 'Pro Trailer Backup Assist',
      'BoxLink Cargo System', 'LED Box Lighting', 'Remote Start',
      '20-inch Wheels', 'Tow Package'
    ],
    isNew: false
  },
  {
    vin: 'JN1AZ4EH7LM000007',
    year: 2024,
    make: 'Nissan',
    model: 'Altima',
    trim: 'SV',
    mileage: 50,
    exteriorColor: 'Gun Metallic',
    interiorColor: 'Charcoal Leather',
    engineType: '2.5L 4-Cylinder',
    transmission: 'CVT',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    mpgCity: 28,
    mpgHighway: 39,
    price: '28990',
    msrp: '31500',
    invoicePrice: '27500',
    internetPrice: '27990',
    condition: 'new',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800'
    ],
    features: [
      'ProPILOT Assist', 'Nissan Safety Shield 360',
      'Remote Engine Start', 'Dual Zone Climate Control',
      'Blind Spot Warning', 'Rear Cross Traffic Alert'
    ],
    isNew: true
  },
  {
    vin: 'WAUENAF45KN000008',
    year: 2023,
    make: 'Audi',
    model: 'A4',
    trim: '45 TFSI Premium Plus',
    mileage: 6800,
    exteriorColor: 'Mythos Black Metallic',
    interiorColor: 'Black Leather',
    engineType: '2.0L TFSI',
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuelType: 'Gasoline',
    mpgCity: 24,
    mpgHighway: 32,
    price: '39990',
    msrp: '45000',
    invoicePrice: '38000',
    internetPrice: '38990',
    condition: 'certified',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1606664515524-ed9f786329ac?w=800'
    ],
    features: [
      'Virtual Cockpit', 'Bang & Olufsen Sound', 'Matrix LED Headlights',
      'Audi Pre Sense', 'Parking System Plus', 'Heated Front Seats',
      'Power Tailgate', 'Navigation Plus'
    ],
    isNew: false
  },
  {
    vin: '3VWEB7AJ0MM000009',
    year: 2024,
    make: 'Volkswagen',
    model: 'Jetta',
    trim: 'SEL',
    mileage: 200,
    exteriorColor: 'Pure White',
    interiorColor: 'Titan Black',
    engineType: '1.5L TSI',
    transmission: 'Automatic',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    mpgCity: 31,
    mpgHighway: 41,
    price: '26990',
    msrp: '29000',
    invoicePrice: '25500',
    internetPrice: '25990',
    condition: 'new',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1609520778163-a16fb3862efa?w=800'
    ],
    features: [
      'Digital Cockpit Pro', 'BeatsAudio Premium',
      'IQ.DRIVE Driver Assistance', 'Wireless App Connect',
      'Remote Start', 'Ventilated Front Seats'
    ],
    isNew: true
  },
  {
    vin: 'WAUZZZ4M6ND000010',
    year: 2022,
    make: 'Mercedes-Benz',
    model: 'C-Class',
    trim: 'C 300 4MATIC',
    mileage: 18500,
    exteriorColor: 'Polar White',
    interiorColor: 'Macchiato Beige',
    engineType: '2.0L Turbo',
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuelType: 'Gasoline',
    mpgCity: 23,
    mpgHighway: 33,
    price: '42990',
    msrp: '48000',
    invoicePrice: '41000',
    internetPrice: '41990',
    condition: 'used',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800'
    ],
    features: [
      'MBUX Infotainment', 'Burmester Sound System',
      'Driver Assistance Package', 'AMG Line', 'Panoramic Roof',
      'Wireless Charging', '64-Color Ambient Lighting'
    ],
    isNew: false
  },
  {
    vin: '7FARW2H55NE000011',
    year: 2023,
    make: 'Ford',
    model: 'Mustang Mach-E',
    trim: 'Premium AWD',
    mileage: 3200,
    exteriorColor: 'Grabber Blue Metallic',
    interiorColor: 'Black ActiveX',
    engineType: 'Dual Motor Electric',
    transmission: 'Automatic',
    drivetrain: 'AWD',
    fuelType: 'Electric',
    mpgCity: 90,
    mpgHighway: 85,
    price: '52990',
    msrp: '57000',
    invoicePrice: '51000',
    internetPrice: '51990',
    condition: 'certified',
    status: 'available',
    images: [
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'
    ],
    features: [
      'BlueCruise Hands-Free', 'B&O Sound System',
      'Panoramic Fixed-Glass Roof', 'Phone As A Key',
      'Intelligent Adaptive Cruise', 'FordPass Charging Network'
    ],
    isNew: false
  },
  {
    vin: 'JTDKAMFU0N3000012',
    year: 2023,
    make: 'Toyota',
    model: 'Prius',
    trim: 'Limited',
    mileage: 4500,
    exteriorColor: 'Wind Chill Pearl',
    interiorColor: 'Black SofTex',
    engineType: '2.0L Hybrid',
    transmission: 'CVT',
    drivetrain: 'FWD',
    fuelType: 'Hybrid',
    mpgCity: 57,
    mpgHighway: 56,
    price: '33990',
    msrp: '35500',
    invoicePrice: '32000',
    internetPrice: '32990',
    condition: 'used',
    status: 'hold',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800'
    ],
    features: [
      'Toyota Safety Sense 3.0', 'JBL Premium Audio',
      'Digital Rearview Mirror', 'Wireless Charging',
      'Heads-Up Display', 'Parking Assist'
    ],
    isNew: false
  }
];

async function seedVehicles() {
  try {
    console.log('Seeding vehicles...');
    
    for (const vehicle of vehicleData) {
      await db.insert(vehicles).values(vehicle);
      console.log(`Added ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    }
    
    console.log('Successfully seeded vehicles!');
  } catch (error) {
    console.error('Error seeding vehicles:', error);
  }
  process.exit(0);
}

seedVehicles();