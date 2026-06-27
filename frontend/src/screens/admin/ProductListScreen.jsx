import { Link, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useDeleteProductMutation,
} from '../../features/api/productsApiSlice';
import { getCatalogBaseFromPath } from '../../utils/userRoles';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import Paginate from '../../components/Paginate';

const ProductListScreen = () => {
  const { pageNumber } = useParams();
  const { pathname } = useLocation();
  const catalogBase = getCatalogBaseFromPath(pathname);
  const { data, isLoading, error, refetch } = useGetProductsQuery({
    pageNumber: pageNumber || 1,
    adminMode: true,
  });
  const [createProduct, { isLoading: loadingCreate }] = useCreateProductMutation();
  const [deleteProduct, { isLoading: loadingDelete }] = useDeleteProductMutation();

  const { userInfo } = useSelector((state) => state.auth);

  // Creates a blank draft product the admin can immediately edit
  const createProductHandler = async () => {
    try {
      const newProduct = await createProduct({
        name: 'New Product',
        price: 0,
        brand: 'Sample Brand',
        category: 'Fashion',
        countInStock: 0,
        description: 'Edit this description',
        images: [],
      }).unwrap();
      toast.success('Draft product created — edit it below');
      window.location.href = `${catalogBase}/product/${newProduct._id}/edit`;
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create product');
    }
  };

  const deleteHandler = async (id) => {
    if (window.confirm('Delete this product? This cannot be undone.')) {
      try {
        await deleteProduct(id).unwrap();
        toast.success('Product deleted');
        refetch();
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete product');
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={createProductHandler}
          disabled={loadingCreate}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          + Create Product
        </button>
      </div>

      {loadingDelete && <Loader />}

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message}</Message>
      ) : data.products.length === 0 ? (
        <div className="mt-8">
          <Message variant="info">No products created yet. Click "+ Create Product" to add your first product.</Message>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {data.products.map((product) => {
              const isProductOwner = product.userId === userInfo._id || product.userId === userInfo.id || product.user === userInfo._id || product.user === userInfo.id;
              const canManage = userInfo.isSuperAdmin || userInfo.isAdmin || isProductOwner;
              const stockColor = product.countInStock === 0 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : product.countInStock <= 5 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div key={product._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
                  {/* Image Container */}
                  <div className="w-full h-48 bg-slate-50 flex items-center justify-center p-4 relative border-b border-slate-100">
                    <img
                      src={product.images?.[0] || '/uploads/seed/placeholder.jpg'}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain mix-blend-multiply"
                    />
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200/80 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                      {product.brand}
                    </span>
                    <span className="absolute top-3 right-3 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase text-brand-700">
                      {product.category}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-slate-500">₹</span>
                        <span className="text-lg font-bold text-slate-900 leading-none">
                          {product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className={`inline-flex items-center border px-2.5 py-0.5 rounded-full text-xs font-medium ${stockColor}`}>
                        {product.countInStock === 0 ? 'Out of stock' : `${product.countInStock} in stock`}
                      </span>
                      
                      {/* Owner Badge */}
                      {!(userInfo.isSuperAdmin || userInfo.isAdmin) && isProductOwner && (
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                          My Product
                        </span>
                      )}

                      {(userInfo.isSuperAdmin || userInfo.isAdmin) && (
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md max-w-[120px] truncate animate-fade-in" title={product.sellerName || 'N/A'}>
                          Seller: {product.sellerName || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="bg-slate-50 border-t border-slate-150 p-3 flex gap-2">
                    {canManage ? (
                      <>
                        <Link
                          to={`${catalogBase}/product/${product._id}/edit`}
                          className="flex-1 text-center bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 rounded-xl text-xs font-semibold shadow-sm transition duration-150"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteHandler(product._id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 py-2 rounded-xl text-xs font-semibold transition duration-150"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="w-full text-center inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 font-bold bg-slate-100 border border-slate-200 py-2 rounded-xl">
                        🔒 Locked (Owner only)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Paginate pages={data.pages} page={data.page} catalogBase={catalogBase} />
        </>
      )}
    </div>
  );
};

export default ProductListScreen;
