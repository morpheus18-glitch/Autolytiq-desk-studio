/**
 * END-TO-END USER JOURNEY TESTS
 *
 * Tests complete user workflows from start to finish:
 * 1. Complete Deal Creation Flow (customer → vehicle → financing → deal)
 * 2. Email Workflow (fetch → organize → respond)
 * 3. Reporting Dashboard (data aggregation → visualization)
 *
 * CRITICAL: These tests verify the entire system works together.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../database/db-service';
import { customers, vehicles, deals, dealScenarios, emailMessages, emailAccounts } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import {
  setupTestDatabase,
  cleanupTestData,
  teardownTestDatabase,
  getTestContext,
} from './setup';
import {
  createCustomerData,
  createVehicleData,
} from './helpers/test-data';
import { createDeal } from '../database/atomic-operations';
import {
  assertValidCustomer,
  assertValidVehicle,
  assertValidDeal,
  assertValidScenario,
  assertEmailFormat,
  assertRecentDate,
} from './helpers/assertions';

describe('E2E User Journey Tests', () => {
  let testContext: ReturnType<typeof getTestContext>;

  beforeAll(async () => {
    await setupTestDatabase();
    testContext = getTestContext();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // ============================================================================
  // JOURNEY 1: COMPLETE DEAL CREATION FLOW
  // ============================================================================

  describe('Journey 1: Complete Deal Creation Flow', () => {
    it('should complete full deal creation from customer to sold', async () => {
      console.log('E2E Test: Starting complete deal creation journey...');

      // STEP 1: Create new customer
      console.log('  Step 1: Creating customer...');
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@example.com',
          phone: '555-1234',
          address: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
        }))
        .returning();

      assertValidCustomer(customer);
      expect(customer.firstName).toBe('John');
      console.log(`    ✓ Customer created: ${customer.customerNumber}`);

      // STEP 2: Add vehicle to inventory
      console.log('  Step 2: Adding vehicle to inventory...');
      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          year: 2024,
          make: 'Toyota',
          model: 'Camry',
          vin: 'TEST12345VIN67890',
          condition: 'new',
          status: 'available',
          internetPrice: '32000',
        }))
        .returning();

      assertValidVehicle(vehicle);
      expect(vehicle.status).toBe('available');
      console.log(`    ✓ Vehicle added: ${vehicle.stockNumber} - ${vehicle.year} ${vehicle.make} ${vehicle.model}`);

      // STEP 3: Create draft deal
      console.log('  Step 3: Creating draft deal...');
      const draftResult = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        initialState: 'DRAFT',
      });

      assertValidDeal(draftResult.deal);
      assertValidScenario(draftResult.scenario);
      expect(draftResult.deal.dealState).toBe('DRAFT');
      expect(draftResult.deal.customerId).toBe(customer.id);
      console.log(`    ✓ Draft deal created: ${draftResult.deal.id}`);

      // STEP 4: Configure financing
      console.log('  Step 4: Configuring financing...');
      const [updatedScenario] = await db
        .update(dealScenarios)
        .set({
          scenarioType: 'finance',
          vehiclePrice: '32000',
          downPayment: '5000',
          term: 60,
          apr: '6.99',
          tradeAllowance: '0',
          tradePayoff: '0',
          rebates: '1000',
          updatedAt: new Date(),
        })
        .where(eq(dealScenarios.id, draftResult.scenario.id))
        .returning();

      expect(updatedScenario.scenarioType).toBe('finance');
      expect(updatedScenario.vehiclePrice).toBe('32000');
      console.log(`    ✓ Financing configured: $${updatedScenario.vehiclePrice} @ ${updatedScenario.apr}% APR`);

      // STEP 5: Mark deal as pending (awaiting approval)
      console.log('  Step 5: Moving deal to pending...');
      const [pendingDeal] = await db
        .update(deals)
        .set({
          dealState: 'PENDING',
          updatedAt: new Date(),
        })
        .where(eq(deals.id, draftResult.deal.id))
        .returning();

      expect(pendingDeal.dealState).toBe('PENDING');
      console.log(`    ✓ Deal moved to pending: ${pendingDeal.dealNumber}`);

      // STEP 6: Finalize and mark as sold
      console.log('  Step 6: Finalizing deal as sold...');
      const [soldDeal] = await db
        .update(deals)
        .set({
          dealState: 'SOLD',
          closedDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deals.id, draftResult.deal.id))
        .returning();

      expect(soldDeal.dealState).toBe('SOLD');
      expect(soldDeal.closedDate).toBeDefined();
      console.log(`    ✓ Deal sold! Closed on ${soldDeal.closedDate}`);

      // STEP 7: Update vehicle status to sold
      console.log('  Step 7: Updating vehicle status...');
      const [soldVehicle] = await db
        .update(vehicles)
        .set({
          status: 'sold',
          soldDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id))
        .returning();

      expect(soldVehicle.status).toBe('sold');
      expect(soldVehicle.soldDate).toBeDefined();
      console.log(`    ✓ Vehicle marked as sold`);

      // STEP 8: Verify complete deal in database
      console.log('  Step 8: Verifying complete deal...');
      const completeDeal = await db.query.deals.findFirst({
        where: eq(deals.id, soldDeal.id),
        with: {
          customer: true,
          salesperson: true,
          scenarios: true,
        },
      });

      expect(completeDeal).toBeDefined();
      expect(completeDeal?.customer?.id).toBe(customer.id);
      expect(completeDeal?.scenarios?.length).toBeGreaterThan(0);
      expect(completeDeal?.dealState).toBe('SOLD');
      console.log(`    ✓ Complete deal verified`);

      console.log('✓ E2E Test: Complete deal creation journey PASSED');
    });

    it('should handle deal with trade-in', async () => {
      console.log('E2E Test: Deal with trade-in journey...');

      // Create customer
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      // Create new vehicle
      const [newVehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          internetPrice: '35000',
        }))
        .returning();

      // Create deal with trade-in
      const dealResult = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
        vehicleId: newVehicle.id,
        scenarioData: {
          vehiclePrice: '35000',
          downPayment: '3000',
          tradeAllowance: '10000',
          tradePayoff: '8000', // $2k positive equity
          term: 60,
          apr: '6.99',
        },
      });

      // Verify trade-in values
      expect(dealResult.scenario.tradeAllowance).toBe('10000');
      expect(dealResult.scenario.tradePayoff).toBe('8000');

      console.log(`    ✓ Trade-in deal created with $2,000 positive equity`);
      console.log('✓ E2E Test: Trade-in journey PASSED');
    });

    it('should handle lease deal', async () => {
      console.log('E2E Test: Lease deal journey...');

      // Create customer and vehicle
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId))
        .returning();

      const [vehicle] = await db
        .insert(vehicles)
        .values(createVehicleData(testContext.dealershipId, {
          internetPrice: '45000',
        }))
        .returning();

      // Create lease deal
      const leaseResult = await createDeal({
        dealershipId: testContext.dealershipId,
        salespersonId: testContext.userId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        scenarioData: {
          scenarioType: 'lease',
          vehiclePrice: '45000',
          downPayment: '3000',
          term: 36,
          moneyFactor: '0.00125',
          residualValue: '27000', // 60% residual
        },
      });

      // Verify lease parameters
      expect(leaseResult.scenario.scenarioType).toBe('lease');
      expect(leaseResult.scenario.moneyFactor).toBe('0.00125');
      expect(leaseResult.scenario.residualValue).toBe('27000');

      console.log(`    ✓ Lease deal created for 36 months`);
      console.log('✓ E2E Test: Lease journey PASSED');
    });
  });

  // ============================================================================
  // JOURNEY 2: EMAIL WORKFLOW
  // ============================================================================

  describe('Journey 2: Email Workflow', () => {
    let emailAccount: any;

    beforeEach(async () => {
      // Setup email account
      const [account] = await db
        .insert(emailAccounts)
        .values({
          dealershipId: testContext.dealershipId,
          userId: testContext.userId,
          email: 'sales@dealership.com',
          provider: 'resend',
          isActive: true,
          isPrimary: true,
        })
        .returning()
        .onConflictDoNothing();

      emailAccount = account || (await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.email, 'sales@dealership.com'),
      }));
    });

    it('should complete email workflow: draft → send → track', async () => {
      console.log('E2E Test: Starting email workflow journey...');

      // STEP 1: Create customer
      console.log('  Step 1: Creating customer...');
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          email: 'customer@example.com',
        }))
        .returning();

      console.log(`    ✓ Customer created: ${customer.email}`);

      // STEP 2: Create draft email
      console.log('  Step 2: Creating draft email...');
      const [draft] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: emailAccount.id,
          customerId: customer.id,
          fromAddress: 'sales@dealership.com',
          toAddress: customer.email!,
          subject: 'Great deal on your Toyota Camry',
          body: 'Hi John, I wanted to follow up on the vehicle you were interested in...',
          htmlBody: '<p>Hi John, I wanted to follow up on the vehicle you were interested in...</p>',
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        })
        .returning();

      expect(draft.isDraft).toBe(true);
      expect(draft.isSent).toBe(false);
      assertEmailFormat(draft.toAddress);
      console.log(`    ✓ Draft email created: "${draft.subject}"`);

      // STEP 3: Update draft (edit)
      console.log('  Step 3: Editing draft...');
      const [edited] = await db
        .update(emailMessages)
        .set({
          body: 'Hi John, Great news! The price just dropped on the Camry you loved...',
          htmlBody: '<p>Hi John, <strong>Great news!</strong> The price just dropped on the Camry you loved...</p>',
          updatedAt: new Date(),
        })
        .where(eq(emailMessages.id, draft.id))
        .returning();

      console.log(`    ✓ Draft edited`);

      // STEP 4: Send email
      console.log('  Step 4: Sending email...');
      const [sent] = await db
        .update(emailMessages)
        .set({
          isDraft: false,
          isSent: true,
          sentAt: new Date(),
          providerMessageId: 're_mock_email_id_123',
          updatedAt: new Date(),
        })
        .where(eq(emailMessages.id, draft.id))
        .returning();

      expect(sent.isDraft).toBe(false);
      expect(sent.isSent).toBe(true);
      expect(sent.sentAt).toBeDefined();
      assertRecentDate(sent.sentAt!);
      console.log(`    ✓ Email sent at ${sent.sentAt}`);

      // STEP 5: Simulate customer reply (inbound)
      console.log('  Step 5: Receiving customer reply...');
      const [reply] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: emailAccount.id,
          customerId: customer.id,
          fromAddress: customer.email!,
          toAddress: 'sales@dealership.com',
          subject: 'Re: Great deal on your Toyota Camry',
          body: 'Thanks for letting me know! When can I come in to test drive?',
          htmlBody: '<p>Thanks for letting me know! When can I come in to test drive?</p>',
          isDraft: false,
          isSent: true,
          sentAt: new Date(),
          messageType: 'inbound',
          inReplyTo: sent.providerMessageId,
        })
        .returning();

      expect(reply.messageType).toBe('inbound');
      expect(reply.inReplyTo).toBe(sent.providerMessageId);
      console.log(`    ✓ Customer reply received`);

      // STEP 6: Load email thread
      console.log('  Step 6: Loading email thread...');
      const thread = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.dealershipId, testContext.dealershipId),
          eq(emailMessages.customerId, customer.id)
        ),
        orderBy: [desc(emailMessages.sentAt)],
      });

      expect(thread.length).toBe(2); // Original + reply
      expect(thread[0].messageType).toBe('inbound'); // Most recent
      expect(thread[1].messageType).toBe('outbound'); // Original
      console.log(`    ✓ Email thread loaded: ${thread.length} messages`);

      // STEP 7: Send follow-up
      console.log('  Step 7: Sending follow-up...');
      const [followup] = await db
        .insert(emailMessages)
        .values({
          dealershipId: testContext.dealershipId,
          emailAccountId: emailAccount.id,
          customerId: customer.id,
          fromAddress: 'sales@dealership.com',
          toAddress: customer.email!,
          subject: 'Re: Great deal on your Toyota Camry',
          body: 'Perfect! How about tomorrow at 2pm?',
          htmlBody: '<p>Perfect! How about tomorrow at 2pm?</p>',
          isDraft: false,
          isSent: true,
          sentAt: new Date(),
          messageType: 'outbound',
          inReplyTo: reply.providerMessageId,
        })
        .returning();

      console.log(`    ✓ Follow-up sent`);

      // STEP 8: Verify complete thread
      const completeThread = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.dealershipId, testContext.dealershipId),
          eq(emailMessages.customerId, customer.id)
        ),
        orderBy: [desc(emailMessages.sentAt)],
      });

      expect(completeThread.length).toBe(3);
      console.log(`    ✓ Complete thread verified: 3 messages`);

      console.log('✓ E2E Test: Email workflow journey PASSED');
    });

    it('should track drafts vs sent emails', async () => {
      // Create mix of drafts and sent
      const [customer] = await db
        .insert(customers)
        .values(createCustomerData(testContext.dealershipId, {
          email: 'test@example.com',
        }))
        .returning();

      // Create 3 drafts
      for (let i = 0; i < 3; i++) {
        await db.insert(emailMessages).values({
          dealershipId: testContext.dealershipId,
          emailAccountId: emailAccount.id,
          customerId: customer.id,
          fromAddress: 'sales@dealership.com',
          toAddress: customer.email!,
          subject: `Draft ${i + 1}`,
          body: 'Draft content',
          isDraft: true,
          isSent: false,
          messageType: 'outbound',
        });
      }

      // Create 2 sent
      for (let i = 0; i < 2; i++) {
        await db.insert(emailMessages).values({
          dealershipId: testContext.dealershipId,
          emailAccountId: emailAccount.id,
          customerId: customer.id,
          fromAddress: 'sales@dealership.com',
          toAddress: customer.email!,
          subject: `Sent ${i + 1}`,
          body: 'Sent content',
          isDraft: false,
          isSent: true,
          sentAt: new Date(),
          messageType: 'outbound',
        });
      }

      // Query drafts
      const drafts = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.dealershipId, testContext.dealershipId),
          eq(emailMessages.isDraft, true)
        ),
      });

      // Query sent
      const sentMessages = await db.query.emailMessages.findMany({
        where: and(
          eq(emailMessages.dealershipId, testContext.dealershipId),
          eq(emailMessages.isSent, true)
        ),
      });

      expect(drafts.length).toBeGreaterThanOrEqual(3);
      expect(sentMessages.length).toBeGreaterThanOrEqual(2);

      console.log(`✓ Email tracking: ${drafts.length} drafts, ${sentMessages.length} sent`);
    });
  });

  // ============================================================================
  // JOURNEY 3: REPORTING DASHBOARD
  // ============================================================================

  describe('Journey 3: Reporting Dashboard', () => {
    beforeEach(async () => {
      // Create comprehensive test data for reporting
      console.log('  Setup: Creating test data for reporting...');

      // Create 10 customers
      for (let i = 0; i < 10; i++) {
        const [customer] = await db
          .insert(customers)
          .values(createCustomerData(testContext.dealershipId, {
            state: i % 3 === 0 ? 'CA' : i % 3 === 1 ? 'TX' : 'NY',
          }))
          .returning();

        // Create 1-2 deals per customer
        const dealCount = i % 2 === 0 ? 2 : 1;
        for (let j = 0; j < dealCount; j++) {
          const [vehicle] = await db
            .insert(vehicles)
            .values(createVehicleData(testContext.dealershipId, {
              internetPrice: String(25000 + i * 2000),
            }))
            .returning();

          await createDeal({
            dealershipId: testContext.dealershipId,
            salespersonId: testContext.userId,
            customerId: customer.id,
            vehicleId: vehicle.id,
            initialState: i % 4 === 0 ? 'SOLD' : i % 4 === 1 ? 'PENDING' : 'DRAFT',
            scenarioData: {
              vehiclePrice: String(25000 + i * 2000),
              downPayment: '5000',
              term: 60,
              apr: '6.99',
            },
          });
        }
      }

      console.log('    ✓ Test data created');
    });

    it('should generate complete sales dashboard', async () => {
      console.log('E2E Test: Generating sales dashboard...');

      // METRIC 1: Total deals
      const totalDeals = await db.query.deals.findMany({
        where: eq(deals.dealershipId, testContext.dealershipId),
      });

      console.log(`    Metric 1: Total Deals = ${totalDeals.length}`);
      expect(totalDeals.length).toBeGreaterThan(0);

      // METRIC 2: Deals by state
      const dealsByState = totalDeals.reduce(
        (acc, deal) => {
          acc[deal.dealState] = (acc[deal.dealState] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log(`    Metric 2: Deals by State =`, dealsByState);

      // METRIC 3: Total inventory
      const totalVehicles = await db.query.vehicles.findMany({
        where: eq(vehicles.dealershipId, testContext.dealershipId),
      });

      console.log(`    Metric 3: Total Inventory = ${totalVehicles.length}`);
      expect(totalVehicles.length).toBeGreaterThan(0);

      // METRIC 4: Available inventory
      const availableVehicles = totalVehicles.filter(v => v.status === 'available');
      console.log(`    Metric 4: Available Inventory = ${availableVehicles.length}`);

      // METRIC 5: Total customers
      const totalCustomers = await db.query.customers.findMany({
        where: eq(customers.dealershipId, testContext.dealershipId),
      });

      console.log(`    Metric 5: Total Customers = ${totalCustomers.length}`);
      expect(totalCustomers.length).toBeGreaterThanOrEqual(10);

      // METRIC 6: Customers by state
      const customersByState = totalCustomers.reduce(
        (acc, customer) => {
          if (customer.state) {
            acc[customer.state] = (acc[customer.state] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      console.log(`    Metric 6: Customers by State =`, customersByState);

      // METRIC 7: Recent activity
      const recentDeals = totalDeals
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      console.log(`    Metric 7: Recent Activity = ${recentDeals.length} recent deals`);

      console.log('✓ E2E Test: Sales dashboard PASSED');
    });

    it('should drill down into specific metrics', async () => {
      console.log('E2E Test: Drilling down into metrics...');

      // Drill down: Sold deals only
      const soldDeals = await db.query.deals.findMany({
        where: and(
          eq(deals.dealershipId, testContext.dealershipId),
          eq(deals.dealState, 'SOLD')
        ),
        with: {
          customer: true,
          scenarios: true,
        },
      });

      console.log(`    Sold deals: ${soldDeals.length}`);

      // Drill down: Pending deals with customers
      const pendingDeals = await db.query.deals.findMany({
        where: and(
          eq(deals.dealershipId, testContext.dealershipId),
          eq(deals.dealState, 'PENDING')
        ),
        with: {
          customer: true,
        },
      });

      console.log(`    Pending deals: ${pendingDeals.length}`);

      // Drill down: Inventory by status
      const vehiclesByStatus = await db.query.vehicles.findMany({
        where: eq(vehicles.dealershipId, testContext.dealershipId),
      });

      const statusBreakdown = vehiclesByStatus.reduce(
        (acc, v) => {
          acc[v.status] = (acc[v.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log(`    Inventory by status:`, statusBreakdown);

      console.log('✓ E2E Test: Metric drill-down PASSED');
    });
  });
});
