// Renders a 5-star rating row with a half-star option and review count
const Rating = ({ value = 0, numReviews = 0, text }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-1 text-amber-500">
      {stars.map((star) => (
        <span key={star}>
          {value >= star ? '★' : value >= star - 0.5 ? '★' : '☆'}
        </span>
      ))}
      <span className="ml-1 text-xs text-gray-500">
        {text || `${numReviews} review${numReviews === 1 ? '' : 's'}`}
      </span>
    </div>
  );
};

export default Rating;
