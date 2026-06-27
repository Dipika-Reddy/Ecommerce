import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../features/api/apiSlice';

// Renders numbered page links with prev/next arrows + hover-prefetching for instant navigation
const Paginate = ({
  pages,
  page,
  keyword = '',
  catalogBase = '',
  category = 'All',
  sortBy = 'newest',
}) => {
  if (pages <= 1) return null;

  const dispatch = useDispatch();

  const buildLink = (pageNum) => {
    if (catalogBase) return `${catalogBase}/productlist/${pageNum}`;
    return keyword
      ? `/search/${keyword}/page/${pageNum}`
      : `/page/${pageNum}`;
  };

  // Kick off a background fetch when hovering so data is ready before the click
  const prefetchPage = (pageNum) => {
    if (pageNum < 1 || pageNum > pages) return;
    dispatch(
      apiSlice.util.prefetch(
        'getProducts',
        { keyword, category, sortBy, pageNumber: pageNum },
        { ifOlderThan: 60 }   // only refetch if cached data is older than 60s
      )
    );
  };

  const btnBase =
    'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-150';
  const activeBtn  = 'border-brand-600 bg-brand-600 text-white';
  const normalBtn  = 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100';
  const disabledBtn = 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed pointer-events-none';

  return (
    <nav className="mt-8 flex justify-center items-center gap-2">

      {/* ← Previous arrow */}
      {page > 1 ? (
        <Link
          to={buildLink(page - 1)}
          onMouseEnter={() => prefetchPage(page - 1)}
          className={`${btnBase} ${normalBtn}`}
          aria-label="Previous page"
        >
          &#8592;
        </Link>
      ) : (
        <span className={`${btnBase} ${disabledBtn}`} aria-disabled="true">
          &#8592;
        </span>
      )}

      {/* Numbered page buttons */}
      {[...Array(pages).keys()].map((x) => (
        <Link
          key={x + 1}
          to={buildLink(x + 1)}
          onMouseEnter={() => prefetchPage(x + 1)}
          className={`${btnBase} ${x + 1 === page ? activeBtn : normalBtn}`}
        >
          {x + 1}
        </Link>
      ))}

      {/* → Next arrow */}
      {page < pages ? (
        <Link
          to={buildLink(page + 1)}
          onMouseEnter={() => prefetchPage(page + 1)}
          className={`${btnBase} ${normalBtn}`}
          aria-label="Next page"
        >
          &#8594;
        </Link>
      ) : (
        <span className={`${btnBase} ${disabledBtn}`} aria-disabled="true">
          &#8594;
        </span>
      )}

    </nav>
  );
};

export default Paginate;
