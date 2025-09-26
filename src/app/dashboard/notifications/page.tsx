export default function NotificationsPage() {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>
      <div className="p-4">
        <p className="text-center text-muted-foreground py-8">You have no new notifications.</p>
      </div>
    </div>
  );
}
