const customers = [
  { name: "Astra Manufacturing", plan: "Enterprise", devices: 42 },
  { name: "Nova Energy", plan: "Pro", devices: 18 },
  { name: "Pioneer Logistics", plan: "Enterprise", devices: 31 },
]

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Demo customer table shell for admin section.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Devices</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((customer) => (
              <tr key={customer.name}>
                <td className="px-4 py-3">{customer.name}</td>
                <td className="px-4 py-3">{customer.plan}</td>
                <td className="px-4 py-3">{customer.devices}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
