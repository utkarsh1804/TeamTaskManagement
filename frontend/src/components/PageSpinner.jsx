const PageSpinner = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-background"
    role="status"
    aria-label="Loading"
  >
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
  </div>
);

export default PageSpinner;
