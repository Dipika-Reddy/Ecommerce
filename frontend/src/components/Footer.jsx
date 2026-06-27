const Footer = () => {
  const year = new Date().getFullYear();

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="hidden md:flex mt-16 flex-col font-sans border-t border-slate-200">
      {/* Back to top bar */}
      <button
        onClick={handleBackToTop}
        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-650 text-center py-3.5 text-xs font-bold transition-colors duration-150 border-b border-slate-200/60"
      >
        Back to top
      </button>



      {/* Legal Bottom row */}
      <div className="bg-slate-100 text-slate-400 py-8 px-4 text-center text-xs leading-relaxed border-t border-slate-200">
        <div className="mx-auto max-w-5xl flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4 text-[11px] text-slate-500 font-semibold">
            <a href="#" className="hover:underline">Conditions of Use &amp; Sale</a>
            <a href="#" className="hover:underline">Privacy Notice</a>
            <a href="#" className="hover:underline">Interest-Based Ads</a>
          </div>
          <p className="text-slate-450">
            &copy; 2026-{year}, Buybee.in, Inc. or its affiliates. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
