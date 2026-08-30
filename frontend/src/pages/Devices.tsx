export default function Devices() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text">Connected Devices</h1>
        <p className="text-muted mt-2">Monitor devices currently associated with the lab AP.</p>
      </header>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-background/50 border-b border-border">
            <tr>
              <th className="p-4 font-medium text-muted">MAC Address</th>
              <th className="p-4 font-medium text-muted">IP Address</th>
              <th className="p-4 font-medium text-muted">First Seen</th>
              <th className="p-4 font-medium text-muted">Last Active</th>
              <th className="p-4 font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="p-8 text-center text-muted">
                No devices found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
