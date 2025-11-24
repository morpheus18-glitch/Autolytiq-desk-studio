# Design System Quick Start

Get up and running with the Autolytiq Design System in 5 minutes.

## Step 1: Import Global Styles

In your main entry point (`main.tsx` or `App.tsx`):

```tsx
import '@/design-system/globals.css';
```

## Step 2: Wrap with Theme Provider

```tsx
import { ThemeProvider } from '@/design-system';

function App() {
  return <ThemeProvider defaultTheme="light">{/* Your app */}</ThemeProvider>;
}
```

## Step 3: Build Your First Page

```tsx
import {
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  ThemeToggle,
} from '@/design-system';

function DashboardPage() {
  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back to Autolytiq"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]}
        actions={
          <>
            <ThemeToggle />
            <Button variant="primary">New Deal</Button>
          </>
        }
      />

      {/* Page Content */}
      <PageContent layout="grid" columns={3}>
        <Card>
          <CardHeader>
            <CardTitle>Total Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">1,234</p>
            <p className="text-sm text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">567</p>
            <p className="text-sm text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">$2.4M</p>
            <p className="text-sm text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}

export default DashboardPage;
```

## Step 4: Add Interactive Elements

```tsx
import { Button, Card, CardContent } from '@/design-system';
import { useState } from 'react';

function InteractiveExample() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <Card hoverable>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Interactive Card</h3>
        <Button variant="primary" loading={loading} onClick={handleClick}>
          Click Me
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Common Patterns

### Form Layout

```tsx
<Card>
  <CardHeader>
    <CardTitle>Create Deal</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Form fields */}
    <div>
      <label className="text-sm font-medium">Customer Name</label>
      <input
        type="text"
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </div>
  </CardContent>
  <CardFooter className="justify-end gap-3">
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>
```

### Empty State

```tsx
import { PageContentEmpty } from '@/design-system';

<PageContentEmpty
  icon={<InboxIcon className="h-6 w-6" />}
  title="No deals found"
  description="Get started by creating your first deal"
  action={<Button variant="primary">Create Deal</Button>}
/>;
```

### Stats Grid

```tsx
import { CardStats } from '@/design-system';

<PageContent layout="grid" columns={4}>
  <CardStats
    label="Total Deals"
    value="1,234"
    change={{ value: 12, trend: 'up' }}
    icon={<DollarIcon />}
  />
  <CardStats
    label="Active Customers"
    value="567"
    change={{ value: 8, trend: 'up' }}
    icon={<UsersIcon />}
  />
  <CardStats
    label="Pending Approvals"
    value="23"
    change={{ value: 5, trend: 'down' }}
    icon={<ClockIcon />}
  />
  <CardStats
    label="Completed Today"
    value="42"
    change={{ value: 0, trend: 'neutral' }}
    icon={<CheckIcon />}
  />
</PageContent>;
```

## Tips

1. **Use semantic variants** - Choose the right variant for the action (primary for main CTA, destructive for delete, etc.)

2. **Leverage Tailwind** - Combine design system components with Tailwind utilities:

   ```tsx
   <Button className="mt-4">Custom spacing</Button>
   ```

3. **Responsive design** - Components are mobile-first by default:

   ```tsx
   <PageContent layout="grid" columns={3}>
     {/* Auto-responsive: 1 col on mobile, 2 on tablet, 3 on desktop */}
   </PageContent>
   ```

4. **Dark mode** - Components automatically adapt to theme:

   ```tsx
   <Card className="bg-card text-card-foreground">{/* Colors change with theme */}</Card>
   ```

5. **Loading states** - Always provide feedback for async actions:
   ```tsx
   <Button loading={isLoading}>Save</Button>
   ```

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore design tokens in [tokens.ts](./tokens.ts)
- Check component props with TypeScript autocomplete
- Review accessibility guidelines in README

## Need Help?

- Check TypeScript types for available props
- Look at JSDoc comments in component files
- Review examples in README.md
- Ask the team!
