// Simple centered spinner shown while RTK Query requests are in flight
const Loader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
  </div>
);

export default Loader;
