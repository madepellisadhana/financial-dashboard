import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Lazy import dependencies at runtime
    const postgres = (await import('postgres')).default;
    const bcrypt = (await import('bcryptjs')).default;

    // Connect to the database using environment variable
    const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

    // Sample placeholder data — import or define your real data here
    // If you already have them in ../lib/placeholder-data, import dynamically
    const { users, customers, invoices, revenue } = await import('../lib/placeholder-data');

    async function seedUsers() {
      await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL
        );
      `;

      const insertedUsers = await Promise.all(
        users.map(async (user) => {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          return sql`
            INSERT INTO users (id, name, email, password)
            VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
            ON CONFLICT (id) DO NOTHING;
          `;
        }),
      );

      return insertedUsers;
    }

    async function seedCustomers() {
      await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
      await sql`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          image_url VARCHAR(255) NOT NULL
        );
      `;

      const insertedCustomers = await Promise.all(
        customers.map(
          (customer) => sql`
            INSERT INTO customers (id, name, email, image_url)
            VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
            ON CONFLICT (id) DO NOTHING;
          `,
        ),
      );

      return insertedCustomers;
    }

    async function seedInvoices() {
      await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
      await sql`
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          customer_id UUID NOT NULL,
          amount INT NOT NULL,
          status VARCHAR(255) NOT NULL,
          date DATE NOT NULL
        );
      `;

      const insertedInvoices = await Promise.all(
        invoices.map(
          (invoice) => sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
            ON CONFLICT (id) DO NOTHING;
          `,
        ),
      );

      return insertedInvoices;
    }

    async function seedRevenue() {
      await sql`
        CREATE TABLE IF NOT EXISTS revenue (
          month VARCHAR(4) NOT NULL UNIQUE,
          revenue INT NOT NULL
        );
      `;

      const insertedRevenue = await Promise.all(
        revenue.map(
          (rev) => sql`
            INSERT INTO revenue (month, revenue)
            VALUES (${rev.month}, ${rev.revenue})
            ON CONFLICT (month) DO NOTHING;
          `,
        ),
      );

      return insertedRevenue;
    }

    // Run all seed functions inside a transaction
    await sql.begin(async (sql) => {
      await seedUsers();
      await seedCustomers();
      await seedInvoices();
      await seedRevenue();
    });

    return new Response(JSON.stringify({ message: 'Database seeded successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || error.toString() }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}