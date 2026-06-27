import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Controlled search input — submitting navigates to /search/:keyword
const SearchBox = () => {
  const navigate = useNavigate();
  const { keyword: urlKeyword } = useParams();
  const [keyword, setKeyword] = useState(urlKeyword || '');

  const submitHandler = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/search/${keyword.trim()}`);
      setKeyword('');
    } else {
      navigate('/');
    }
  };

  return (
    <form onSubmit={submitHandler} className="flex w-full max-w-xl">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Search clothing, accessories, crafts..."
        className="w-full rounded-l-md border-0 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      <button
        type="submit"
        className="rounded-r-md bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600"
      >
        Search
      </button>
    </form>
  );
};

export default SearchBox;
