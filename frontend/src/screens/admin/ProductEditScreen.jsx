import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetProductDetailsQuery,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from '../../features/api/productsApiSlice';
import { getCatalogBaseFromPath } from '../../utils/userRoles';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import CustomSelect from '../../components/CustomSelect';

const ProductEditScreen = () => {
  const { id: productId } = useParams();
  const { pathname } = useLocation();
  const catalogBase = getCatalogBaseFromPath(pathname);
  const navigate = useNavigate();

  const { data: product, isLoading, error } = useGetProductDetailsQuery(productId);
  const [updateProduct, { isLoading: loadingUpdate }] = useUpdateProductMutation();
  const [uploadProductImage, { isLoading: loadingUpload }] = useUploadProductImageMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [countInStock, setCountInStock] = useState(0);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');

  useEffect(() => {
    if (product && userInfo) {
      const isProductOwner = product.userId === userInfo._id || product.userId === userInfo.id || product.user === userInfo._id || product.user === userInfo.id;
      const canManage = userInfo.isSuperAdmin || userInfo.isAdmin || isProductOwner;
      if (!canManage) {
        toast.error('Not authorized to edit this product. You can only edit your own products.');
        navigate(`${catalogBase}/productlist`);
        return;
      }

      setName(product.name);
      setPrice(product.price);
      setBrand(product.brand);
      setCategory(product.category);
      setSubCategory(product.subCategory || '');
      setCountInStock(product.countInStock);
      setDescription(product.description);
      setImages(product.images || []);
      setSizes((product.sizes || []).join(', '));
      setColors((product.colors || []).join(', '));
    }
  }, [product, userInfo, navigate]);

  // --- Simulated image upload: file goes to the backend's /api/upload (multer
  //     local-disk storage), the returned URL is appended to the images array.
  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await uploadProductImage(formData).unwrap();
      setImages((prev) => [...prev, res.image]);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err?.data?.message || 'Image upload failed');
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      await updateProduct({
        productId,
        name,
        price: Number(price),
        brand,
        category,
        subCategory,
        countInStock: Number(countInStock),
        description,
        images,
        sizes: sizes.split(',').map((s) => s.trim()).filter(Boolean),
        colors: colors.split(',').map((c) => c.trim()).filter(Boolean),
      }).unwrap();
      toast.success('Product updated');
      navigate(`${catalogBase}/productlist`);
    } catch (err) {
      toast.error(err?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to={`${catalogBase}/productlist`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to products
      </Link>
      <h1 className="mb-5 text-2xl font-bold text-gray-900">Edit Product</h1>

      {loadingUpdate && <Loader />}

      {isLoading ? (
        <Loader />
      ) : error ? (
        <Message variant="danger">{error?.data?.message}</Message>
      ) : (
        <form onSubmit={submitHandler} className="space-y-4 rounded-md border bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Count In Stock</label>
              <input
                type="number"
                value={countInStock}
                onChange={(e) => setCountInStock(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Brand</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <CustomSelect
                value={category}
                onChange={(v) => setCategory(v)}
                options={['Fashion', 'Beauty', 'Creative', 'Accessories', 'Furniture', 'Electronics', 'Mobiles']}
                placeholder="Select category..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subcategory</label>
            <input
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="e.g. jewellery, footwear, clothes"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sizes (comma-separated)</label>
              <input
                value={sizes}
                onChange={(e) => setSizes(e.target.value)}
                placeholder="S, M, L, XL"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Colors (comma-separated)</label>
              <input
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="Black, Navy"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Images</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <div key={img + idx} className="relative">
                  <img src={img} alt="" className="h-16 w-16 rounded border object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" onChange={uploadFileHandler} className="text-sm" />
            {loadingUpload && <span className="ml-2 text-xs text-gray-500">Uploading...</span>}
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            Save Product
          </button>
        </form>
      )}
    </div>
  );
};

export default ProductEditScreen;
