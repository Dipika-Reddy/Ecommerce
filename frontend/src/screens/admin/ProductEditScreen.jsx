import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetProductDetailsQuery,
  useUpdateProductMutation,
  useUploadProductImageMutation,
  useDeleteProductMutation,
} from '../../features/api/productsApiSlice';
import { getCatalogBaseFromPath } from '../../utils/userRoles';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import CustomSelect from '../../components/CustomSelect';

const ProductEditScreen = () => {
  const { id: productId } = useParams();
  const { pathname, search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const isNew = searchParams.get('isNew') === 'true';
  const catalogBase = getCatalogBaseFromPath(pathname);
  const navigate = useNavigate();

  const { data: product, isLoading, error } = useGetProductDetailsQuery(productId);
  const [updateProduct, { isLoading: loadingUpdate }] = useUpdateProductMutation();
  const [uploadProductImage, { isLoading: loadingUpload }] = useUploadProductImageMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const { userInfo } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [countInStock, setCountInStock] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [sizes, setSizes] = useState([]);
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

      if (isNew) {
        setName('');
        setPrice('');
        setBrand('');
        setCategory(product.category || 'Fashion');
        setSubCategory(product.subCategory || '');
        setCountInStock('');
        setDescription('');
        setImages((product.images || []).filter((img) => img !== '/uploads/sample-product.jpg'));
        setSizes([]);
        setColors('');
      } else {
        setName(product.name);
        setPrice(product.price);
        setBrand(product.brand);
        setCategory(product.category);
        setSubCategory(product.subCategory || '');
        setCountInStock(product.countInStock);
        setDescription(product.description);
        setImages((product.images || []).filter((img) => img !== '/uploads/sample-product.jpg'));
        setSizes(product.sizes || []);
        setColors((product.colors || []).join(', '));
      }
    }
  }, [product, userInfo, navigate, isNew]);

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

  const cancelHandler = async () => {
    if (isNew) {
      try {
        await deleteProduct(productId).unwrap();
        toast.info('Product creation cancelled');
      } catch (err) {
        console.error('Failed to delete draft product:', err);
      }
    }
    navigate(`${catalogBase}/productlist`);
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      await updateProduct({
        productId,
        name,
        price: price === '' ? 0 : Number(price),
        brand,
        category,
        subCategory,
        countInStock: countInStock === '' ? 0 : Number(countInStock),
        description,
        images,
        sizes,
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
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Create Product' : 'Edit Product'}</h1>
        <button
          type="button"
          onClick={cancelHandler}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          title="Cancel"
        >
          ✕
        </button>
      </div>

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
              placeholder="e.g. New Product"
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
                placeholder="e.g. 99.99"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Count In Stock</label>
              <input
                type="number"
                value={countInStock}
                onChange={(e) => setCountInStock(e.target.value)}
                placeholder="e.g. 10"
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
                placeholder="e.g. Sample Brand"
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
              <label className="mb-2 block text-sm font-medium text-gray-700">Sizes</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                {['S', 'M', 'L', 'XL', 'XXL', 'FREE'].map((sz) => (
                  <label key={sz} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sizes.includes(sz)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSizes([...sizes, sz]);
                        } else {
                          setSizes(sizes.filter((s) => s !== sz));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    {sz}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Colors (comma-separated)</label>
              <input
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="e.g. Black, Navy"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Product description..."
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

          <div className="flex gap-4">
            <button
              type="button"
              onClick={cancelHandler}
              className="w-1/3 rounded-md bg-gray-100 py-2.5 font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-2/3 rounded-md bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700"
            >
              {isNew ? 'Create & Save Product' : 'Save Product'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProductEditScreen;
