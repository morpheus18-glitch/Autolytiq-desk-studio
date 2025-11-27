/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { db } from '../server/db';
import { customers, deals } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function backfillCustomerDealershipIds() {
  console.log('Starting backfill of customer dealershipIds based on deal relationships...');

  // Update customers to match their associated deal's dealership
  const result = await db.execute(sql`
    UPDATE customers c
    SET dealership_id = d.dealership_id
    FROM deals d
    WHERE c.id = d.customer_id
      AND d.customer_id IS NOT NULL
      AND c.dealership_id != d.dealership_id
  `);

  console.log(`Updated ${result.rowCount} customers to match their deal's dealership`);

  // Verify the results
  const stats = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT c.dealership_id) as unique_dealerships,
      COUNT(*) as total_customers
    FROM customers c
  `);

  console.log('Backfill complete!');
  console.log(`Total customers: ${stats.rows[0]?.total_customers || 0}`);
  console.log(`Unique dealerships: ${stats.rows[0]?.unique_dealerships || 0}`);
}

backfillCustomerDealershipIds()
  .then(() => {
    console.log('Success!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during backfill:', error);
    process.exit(1);
  });
