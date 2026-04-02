export default function CustomerProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Simple profile shell page for the customer side.</p>
      </div>

      <div className="max-w-2xl rounded-2xl border bg-card p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Name</dt>
            <dd className="mt-1 text-sm font-medium">Demo Customer</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Plan</dt>
            <dd className="mt-1 text-sm font-medium">Enterprise</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm font-medium">customer@technode.com</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Company</dt>
            <dd className="mt-1 text-sm font-medium">Technode Client</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
