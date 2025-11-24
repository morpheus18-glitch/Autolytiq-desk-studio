import { faker } from '@faker-js/faker';

export function createMockUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'salesperson' as const,
    dealershipId: faker.string.uuid(),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockCustomer(overrides = {}) {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: 'CA',
    zipCode: faker.location.zipCode(),
    dealershipId: faker.string.uuid(),
    ...overrides,
  };
}

export function createMockDeal(overrides = {}) {
  return {
    id: faker.string.uuid(),
    customerId: faker.string.uuid(),
    vehiclePrice: 50000_00,
    tradeInValue: 10000_00,
    downPayment: 5000_00,
    dealType: 'finance' as const,
    status: 'pending' as const,
    ...overrides,
  };
}
