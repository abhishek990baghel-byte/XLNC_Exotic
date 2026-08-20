import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { z } from 'zod';
import type { Material } from '../types';

const materialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string(),
  unit: z.string(),
  cost_price: z.number().min(0, 'Cost price must be >= 0'),
  selling_price: z.number().min(0, 'Selling price must be >= 0'),
  stock: z.number().min(0, 'Stock must be >= 0'),
  min_stock: z.number().min(0, 'Min stock must be >= 0'),
  location: z.string().optional(),
  supplier: z.string(),
  notes: z.string(),
});

export default function MaterialForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Tiles & Ceramics',
    unit: 'pcs',
    cost_price: 0,
    selling_price: 0,
    stock: 0,
    min_stock: 10,
    location: 'Main Warehouse',
    supplier: '',
    notes: '',
    photo_url: ''
  });

  useEffect(() => {
    if (id) {
      fetch(`/api/materials/${id}`)
        .then(res => {
          if (!res.ok) throw new Error('Material not found');
          return res.json();
        })
        .then((data: Material) => {
          setFormData({
            name: data.name || '',
            sku: data.sku || '',
            category: data.category || 'Tiles & Ceramics',
            unit: data.unit || 'pcs',
            cost_price: data.cost_price || 0,
            selling_price: data.selling_price || 0,
            stock: data.stock || 0,
            min_stock: data.min_stock || 10,
            location: data.location || 'Main Warehouse',
            supplier: data.supplier || '',
            notes: data.notes || '',
            photo_url: data.photo_url || ''
          });
          if (data.photo_url) {
            setPreview(data.photo_url);
          }
        })
        .catch(err => {
          console.error('Error fetching material:', err);
          toast.error('Failed to load material data.');
        });
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit.');
        return;
      }
      setPhoto(file);
      setPreview(URL.createObjectURL(file));

      // Upload directly to /api/upload
      const uploadData = new FormData();
      uploadData.append('file', file);
      setUploadingPhoto(true);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const resJson = await res.json();
        if (resJson.success && resJson.fileUrl) {
          setFormData(prev => ({ ...prev, photo_url: resJson.fileUrl }));
          setPreview(resJson.fileUrl);
          toast.success('Photo attached successfully!');
        }
      } catch (uploadErr) {
        console.warn('Backend photo upload deferred:', uploadErr);
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPreview('');
    setFormData(prev => ({ ...prev, photo_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const skuToUse = formData.sku || `SKU-${Date.now().toString().slice(-6)}`;

    try {
      materialSchema.parse({
        ...formData,
        sku: skuToUse,
        cost_price: Number(formData.cost_price),
        selling_price: Number(formData.selling_price),
        stock: Number(formData.stock),
        min_stock: Number(formData.min_stock),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        (error as any).errors.forEach((err: any) => toast.error(err.message));
        return;
      }
    }

    setLoading(true);

    try {
      const payload: Omit<Material, 'id'> = {
        name: formData.name,
        sku: skuToUse,
        category: formData.category,
        unit: formData.unit,
        cost_price: Number(formData.cost_price),
        selling_price: Number(formData.selling_price),
        stock: Number(formData.stock),
        min_stock: Number(formData.min_stock),
        location: formData.location,
        supplier: formData.supplier,
        notes: formData.notes,
        photo_url: formData.photo_url || preview || ''
      };

      if (id) {
        const res = await fetch(`/api/materials/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        const res = await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create');
      }

      navigate('/materials');
    } catch (err) {
      console.error('Error saving material:', err);
      toast.error('Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 font-sans">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        {id ? 'Edit Material' : 'Add Material'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
        
        {/* Photo Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-gray-50 rounded-2xl border border-gray-200 text-gray-900 shadow-2xs">
          <div className="w-32 h-32 flex-shrink-0 bg-white border border-gray-300 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 text-xs p-2 text-center">
                <ImageIcon className="w-8 h-8 text-gray-300 mb-1" />
                <span>No Photo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Camera className="w-5 h-5 text-gray-700" />
              Material Photo Attachment
            </h3>
            <p className="text-xs text-gray-500">
              Upload high-resolution photography of the material sample, finish, or product packaging.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white font-bold text-xs rounded-xl shadow-md hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-white" />
                {uploadingPhoto ? 'Uploading...' : (preview ? 'Change Photo' : 'Upload Photo')}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-xl hover:bg-red-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Name *</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">SKU / Code</label>
            <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="Leave blank to auto-generate" disabled={!!id} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm disabled:bg-gray-50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Category</label>
            <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Unit of Measure</label>
            <select name="unit" value={formData.unit} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm bg-white">
              <option value="pcs">Pieces (pcs)</option>
              <option value="sqm">Square Meters (sqm)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="meters">Meters (m)</option>
              <option value="boxes">Boxes</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Cost Price ($) *</label>
            <input required type="number" step="0.01" min="0" name="cost_price" value={formData.cost_price} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Selling Price ($) *</label>
            <input required type="number" step="0.01" min="0" name="selling_price" value={formData.selling_price} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Stock Quantity</label>
            <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Low Stock Threshold</label>
            <input type="number" name="min_stock" value={formData.min_stock} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Vendor / Supplier</label>
            <input type="text" name="supplier" value={formData.supplier} onChange={handleChange} placeholder="e.g. Acme Tile Supplies" className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Location</label>
            <select name="location" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm bg-white">
              <option value="Main Warehouse">Main Warehouse</option>
              <option value="Aisle 1, Shelf D">Aisle 1, Shelf D</option>
              <option value="Aisle 3, Shelf B">Aisle 3, Shelf B</option>
              <option value="Cabinet 4, Bin 12">Cabinet 4, Bin 12</option>
              <option value="Outdoor Yard 1">Outdoor Yard 1</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">Notes</label>
          <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-black text-sm" />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button type="button" onClick={() => navigate('/materials')} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-5 py-2 border border-transparent rounded-xl text-sm font-semibold text-white bg-black hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
            {loading ? 'Saving...' : 'Save Material'}
          </button>
        </div>
      </form>
    </div>
  );
}
