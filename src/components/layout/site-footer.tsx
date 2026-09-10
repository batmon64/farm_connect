export function SiteFooter() {
  return (
    <footer className="border-border/60 border-t">
      <div className="text-muted-foreground mx-auto w-full max-w-6xl px-4 py-6 text-sm">
        © {new Date().getFullYear()} FarmConnect
      </div>
    </footer>
  );
}
