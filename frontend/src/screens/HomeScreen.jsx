import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useGetProductsQuery, useGetProductCategoriesQuery } from '../features/api/productsApiSlice';
import Product from '../components/Product';
import Loader from '../components/Loader';
import Message from '../components/Message';
import CustomSelect from '../components/CustomSelect';

const BANNER_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&auto=format&fit=crop&q=80',
    title: 'Up to 60% off | Styles for You',
    subtitle: 'Explore the ultimate fashion and apparel collection',
    category: 'Fashion'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1600&auto=format&fit=crop&q=80',
    title: 'Handcrafted Ceramics & Creative Goods',
    subtitle: 'Up to 50% off on ceramics, decor, and handcrafted furniture',
    category: 'Creative'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1600&auto=format&fit=crop&q=80',
    title: 'Smart Tech & Gadget Deals',
    subtitle: 'Latest mobile phones and accessory releases',
    category: 'Electronics'
  }
];

const HomeScreen = () => {
  const { keyword } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read filters from URL query string (reactive — updates on URL change)
  const category = searchParams.get('category') || 'All';
  const subCategory = searchParams.get('subCategory') || 'All';
  const sortBy   = searchParams.get('sortBy')   || 'newest';

  // ── Infinite scroll state ──────────────────────────────────────
  const [page, setPage]             = useState(1);
  const [allProducts, setAllProducts] = useState([]);
  const [hasMore, setHasMore]       = useState(true);
  const sentinelRef                 = useRef(null);
  // Track the filter key so we know when to reset
  const filterKey = `${keyword || ''}|${category}|${subCategory}|${sortBy}`;
  const prevFilterKey = useRef(filterKey);

  // ── API ────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, error } = useGetProductsQuery({
    keyword,
    category,
    subCategory,
    sortBy,
    pageNumber: page,
  });
  const { data: categories } = useGetProductCategoriesQuery(category);

  // ── Reset accumulator when any filter / search / sort changes ──
  useEffect(() => {
    if (filterKey !== prevFilterKey.current) {
      prevFilterKey.current = filterKey;
      setPage(1);
      setAllProducts([]);
      setHasMore(true);
    }
  }, [filterKey]);

  // ── Append incoming page of products ──────────────────────────
  useEffect(() => {
    if (!data?.products) return;
    setAllProducts((prev) => {
      if (page === 1) return data.products;
      const existingIds = new Set(prev.map((p) => p._id));
      const newProducts = data.products.filter((p) => !existingIds.has(p._id));
      return [...prev, ...newProducts];
    });
    setHasMore(data.page < data.pages);
  }, [data, page]);

  // ── IntersectionObserver – fires when sentinel scrolls into view
  const handleIntersect = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && !isFetching && hasMore) {
        setPage((prev) => prev + 1);
      }
    },
    [isFetching, hasMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px', // start loading 200 px before sentinel is visible
    });
    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => { if (sentinel) observer.unobserve(sentinel); };
  }, [handleIntersect]);

  // ── Banner carousel ────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const extendedSlides = [
    BANNER_SLIDES[BANNER_SLIDES.length - 1],
    ...BANNER_SLIDES,
    BANNER_SLIDES[0]
  ];

  const handleNextBanner = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrevBanner = () => {
    setCurrentIndex((prev) => prev - 1);
  };

  const handleTransitionEnd = () => {
    if (currentIndex >= extendedSlides.length - 1) {
      setIsTransitioning(false);
      setCurrentIndex(1);
    } else if (currentIndex <= 0) {
      setIsTransitioning(false);
      setCurrentIndex(extendedSlides.length - 2);
    }
  };

  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  useEffect(() => {
    const timer = setInterval(() => {
      handleNextBanner();
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const activeDot = (currentIndex - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length;

  const updateQuery = (key, value) => {
    const params = new URLSearchParams(window.location.search);
    if (key === 'category') {
      params.delete('subCategory');
      if (value === 'All') {
        params.delete('category');
      } else {
        params.set('category', value);
      }
    } else {
      if (value === 'All') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    navigate(`${window.location.pathname}?${params.toString()}`);
  };

  const isUnfiltered = !keyword && category === 'All';

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-12 bg-transparent">

      {/* ── Sliding Hero Banner ─────────────────────────────────── */}
      {isUnfiltered && (
        <div className="relative w-full h-[220px] sm:h-[300px] md:h-[450px] overflow-hidden group">
          <div
            className="flex w-full h-full"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              transition: isTransitioning ? 'transform 700ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedSlides.map((slide, idx) => (
              <div
                key={`${slide.id}-${idx}`}
                className="w-full h-full flex-shrink-0 relative cursor-pointer"
                onClick={() => updateQuery('category', slide.category)}
              >
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 via-transparent to-black/10" />
                <div className="absolute top-1/4 left-8 md:left-16 text-white max-w-lg drop-shadow-md">
                  <span className="bg-amber-500 text-[#131921] px-2.5 py-1 text-xs uppercase font-extrabold rounded-sm shadow-sm inline-block mb-3">
                    Limited Time Offer
                  </span>
                  <h2 className="text-xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">
                    {slide.title}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm md:text-base text-gray-200 font-medium hidden sm:block">
                    {slide.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Arrows */}
          <button onClick={handlePrevBanner} className="absolute left-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/10 text-white p-3 rounded focus:outline-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
            <svg className="h-8 w-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={handleNextBanner} className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent hover:bg-black/10 text-white p-3 rounded focus:outline-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
            <svg className="h-8 w-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>


        </div>
      )}

      {/* ── Main Container ──────────────────────────────────────── */}
      <div className={`mx-auto max-w-7xl px-4 relative z-10 ${isUnfiltered ? '-mt-16 md:-mt-36' : 'mt-4 md:mt-6'}`}>

        {/* ── 4-in-1 Category Cards (unfiltered homepage only) ─── */}
        {isUnfiltered && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {/* Card 1: Fashion */}
            <div className="bg-white p-5 rounded shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Latest Fashion Styles</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Fashion')}>
                    <img src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&auto=format&fit=crop&q=80" alt="Clothing" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Dresses</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Fashion')}>
                    <img src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&auto=format&fit=crop&q=80" alt="Jackets" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Jackets</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Fashion')}>
                    <img src="https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80" alt="Wallets" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Wallets</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Fashion')}>
                    <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80" alt="Accessories" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Watches</p>
                  </div>
                </div>
              </div>
              <button onClick={() => updateQuery('category', 'Fashion')} className="text-xs text-teal-700 hover:text-red-700 hover:underline font-semibold text-left mt-4 block">
                Shop all fashion
              </button>
            </div>

            {/* Card 2: Creative Goods */}
            <div className="bg-white p-5 rounded shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Creative & Handcrafted</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Creative')}>
                    <img src="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&auto=format&fit=crop&q=80" alt="Mugs" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Ceramic Mugs</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Creative')}>
                    <img src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80" alt="Hanging" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Wall Arts</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Creative')}>
                    <img src="https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=300&auto=format&fit=crop&q=80" alt="Pots" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Clay Vases</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Furniture')}>
                    <img src="https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=300&auto=format&fit=crop&q=80" alt="Furniture" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Furniture</p>
                  </div>
                </div>
              </div>
              <button onClick={() => updateQuery('category', 'Creative')} className="text-xs text-teal-700 hover:text-red-700 hover:underline font-semibold text-left mt-4 block">
                Explore creative goods
              </button>
            </div>

            {/* Card 3: Electronics */}
            <div className="bg-white p-5 rounded shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Upgrade Your Gadgets</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Mobiles')}>
                    <img src="https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=300&auto=format&fit=crop&q=80" alt="Phones" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Smartphones</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Electronics')}>
                    <img src="https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&auto=format&fit=crop&q=80" alt="Headphones" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Headphones</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Electronics')}>
                    <img src="https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&auto=format&fit=crop&q=80" alt="Audio" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Speakers</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Electronics')}>
                    <img src="https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&auto=format&fit=crop&q=80" alt="Wearables" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Smartwatches</p>
                  </div>
                </div>
              </div>
              <button onClick={() => updateQuery('category', 'Electronics')} className="text-xs text-teal-700 hover:text-red-700 hover:underline font-semibold text-left mt-4 block">
                Shop hot tech items
              </button>
            </div>

            {/* Card 4: Beauty Care */}
            <div className="bg-white p-5 rounded shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Self-Care Essentials</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Beauty')}>
                    <img src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80" alt="Lotion" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Body Lotions</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Beauty')}>
                    <img src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&auto=format&fit=crop&q=80" alt="Mask" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Clay Masks</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Beauty')}>
                    <img src="https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=300&auto=format&fit=crop&q=80" alt="Scrubs" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Body Scrubs</p>
                  </div>
                  <div className="cursor-pointer" onClick={() => updateQuery('category', 'Beauty')}>
                    <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80" alt="Facial" className="w-full aspect-square object-cover rounded-sm" />
                    <p className="text-[11px] font-medium text-gray-600 mt-1">Cleansers</p>
                  </div>
                </div>
              </div>
              <button onClick={() => updateQuery('category', 'Beauty')} className="text-xs text-teal-700 hover:text-red-700 hover:underline font-semibold text-left mt-4 block">
                Discover organic beauty
              </button>
            </div>
          </div>
        )}

        {/* ── Back button for active filters ─────────────────────── */}
        {(keyword || category !== 'All') && (
          <div className="mt-4 mb-4">
            <Link to="/home" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-red-700 hover:underline">
              ← Back to all products
            </Link>
          </div>
        )}

        {/* ── Product Grid Card ────────────────────────────────────── */}
        <div className={`bg-white p-6 rounded shadow-sm ${!isUnfiltered ? 'mt-4' : ''}`}>

          {/* Title & Filter toolbar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {keyword
                ? `Search results for "${keyword}"`
                : category !== 'All'
                  ? `${category} Deals`
                  : "Today's Deals & Promotions"}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              {/* Category selector */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">{category !== 'All' ? 'Subcategory:' : 'Category:'}</span>
                <CustomSelect
                  value={category !== 'All' ? subCategory : category}
                  onChange={(v) => {
                    if (category !== 'All') {
                      updateQuery('subCategory', v);
                    } else {
                      updateQuery('category', v);
                    }
                  }}
                  options={[
                    { value: 'All', label: category !== 'All' ? 'All Subcategories' : 'All Categories' },
                    ...(categories || []).map((cat) => ({ value: cat, label: cat })),
                  ]}
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-500 shrink-0">Sort by:</span>
                <CustomSelect
                  value={sortBy}
                  onChange={(v) => updateQuery('sortBy', v)}
                  options={[
                    { value: 'newest', label: 'Featured / Newest' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'rating_desc', label: 'Avg. Customer Review' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* ── Product Results ──────────────────────────────────── */}
          {error ? (
            <Message variant="danger">
              {error?.data?.message || 'Something went wrong loading products.'}
            </Message>
          ) : (
            <div className="relative min-h-[400px]">
              {/* Product grid displaying currently loaded or previous items */}
              {allProducts.length > 0 ? (
                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                  {allProducts.map((product) => (
                    <Product key={product._id} product={product} />
                  ))}
                </div>
              ) : (isLoading || isFetching) ? (
                /* ── Skeleton grid while loading initial data ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-lg overflow-hidden bg-white border border-slate-100 shadow-sm">
                      {/* Image skeleton */}
                      <div className="aspect-square w-full bg-slate-200 animate-pulse" />
                      <div className="p-3 space-y-2">
                        {/* Rating bar */}
                        <div className="h-2.5 w-20 bg-slate-200 rounded animate-pulse" />
                        {/* Title lines */}
                        <div className="h-3 w-full bg-slate-200 rounded animate-pulse" />
                        <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
                        {/* Price */}
                        <div className="h-4 w-1/3 bg-amber-100 rounded animate-pulse mt-1" />
                        {/* Button */}
                        <div className="h-8 w-full bg-slate-100 rounded animate-pulse mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12"><Message variant="info">No products found in this category.</Message></div>
              )}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-4 mt-8" aria-hidden="true" />

              {/* Loader for pagination fetches */}
              {isFetching && allProducts.length > 0 && (
                <div className="py-8 flex justify-center">
                  <Loader />
                </div>
              )}

              {/* End of list banner */}
              {!hasMore && !isFetching && allProducts.length > 0 && (
                <p className="mt-8 pb-2 text-center text-sm text-gray-400 font-medium">
                  ✓ You've seen all {allProducts.length} products
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default HomeScreen;
