import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bike, ArrowLeft, ImagePlus, X, Save, Upload, Camera, Calculator, DollarSign, Info, Lock, MessageCircle, AlertCircle, Headphones } from 'lucide-react';
import { motoApi, uploadApi, resolveImageUrl } from '../services/api';
import { toast } from '../hooks/use-toast';
import { calculateCommission } from '../utils/commission';
import { handleImageError } from '../utils/imageFallback';

const BRANDS = ['Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'Ducati', 'Harley-Davidson', 'BMW', 'KTM', 'Triumph', 'Aprilia', 'Otra'];
const CATEGORIES = ['Deportiva', 'Naked', 'Cruiser', 'Adventure', 'Scooter', 'Touring', 'Trail', 'Custom'];
const CITIES = ['Ciudad de México', 'Estado de México', 'Nuevo León'];
const MAX_IMAGES = 6;

const CreateMotoPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditing = Boolean(editId);

  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMoto, setFetchingMoto] = useState(isEditing);
  const [uploading, setUploading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const [form, setForm] = useState({
    brand: 'Honda', model: '', year: new Date().getFullYear(), km: 0,
    color: '', engine: '', category: 'Naked', city: 'Ciudad de México',
    price: '', description: '',
  });
  const [images, setImages] = useState([]); // array of { url }

  // Load existing moto if in edit mode
  useEffect(() => {
    if (!editId) return;

    let isMounted = true;
    setFetchingMoto(true);

    motoApi.get(editId)
      .then((data) => {
        if (!isMounted || !data) return;

        const status = data.status || 'EN REVISIÓN';
        setCurrentStatus(status);

        // Rule 1: Una moto es editable mientras NO esté en estado PUBLICADA.
        // Al pasar a PUBLICADA, bloquear edición automáticamente.
        const locked = status === 'Publicada' || status === 'PUBLICADA' || status === 'active';
        setIsLocked(locked);

        setForm({
          brand: data.brand || 'Honda',
          model: data.model || '',
          year: data.year || new Date().getFullYear(),
          km: data.km ?? 0,
          color: data.color || '',
          engine: data.engine || data.displacement || '',
          category: data.category || 'Naked',
          city: data.city || data.location || 'Ciudad de México',
          price: data.price !== undefined && data.price !== null ? String(data.price) : '',
          description: data.description || '',
        });

        if (Array.isArray(data.images) && data.images.length > 0) {
          setImages(data.images);
        } else if (data.image) {
          setImages([data.image]);
        }
      })
      .catch((err) => {
        console.error('Error fetching moto for edit:', err);
        toast({
          title: 'Error al cargar publicación',
          description: 'No se pudo cargar la información de la motocicleta.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (isMounted) setFetchingMoto(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editId]);

  const update = (k, v) => {
    if (isLocked) return;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const handleFileSelect = async (e) => {
    if (isLocked) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: `Máximo ${MAX_IMAGES} imágenes por publicación.` });
      return;
    }
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) {
          toast({ title: 'Formato inválido', description: `${file.name} no es una imagen.` });
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: 'Archivo muy grande', description: `${file.name} supera los 10MB.` });
          continue;
        }
        const res = await uploadApi.image(file);
        uploaded.push(res.url);
      }
      setImages([...images, ...uploaded]);
      if (uploaded.length > 0) {
        toast({ title: `${uploaded.length} imagen(es) subida(s)`, description: 'Listas para publicar.' });
      }
    } catch (err) {
      toast({ title: 'Error al subir', description: err?.response?.data?.detail || 'Intenta de nuevo.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx) => {
    if (isLocked) return;
    setImages(images.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      toast({
        title: 'Edición bloqueada',
        description: 'Esta motocicleta ya está PUBLICADA. Por favor contacta a Soporte Motoluv para solicitar modificaciones.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.model || !form.color || !form.engine || !form.price) {
      toast({ title: 'Campos incompletos', description: 'Completa todos los campos requeridos.' });
      return;
    }
    if (images.length === 0) {
      toast({ title: 'Sube al menos 1 imagen', description: 'Necesitas fotos reales de la motocicleta.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        km: Number(form.km),
        price: Number(form.price),
        images: images,
        image: images[0] || null,
      };

      if (isEditing && editId) {
        await motoApi.update(editId, payload);
        toast({
          title: 'Publicación actualizada',
          description: `Los cambios de tu ${form.brand} ${form.model} se guardaron exitosamente.`,
        });
      } else {
        const moto = await motoApi.create({
          ...payload,
          status: 'EN REVISIÓN',
        });
        toast({
          title: 'Publicación enviada a revisión',
          description: `Tu ${moto?.brand || form.brand} ${moto?.model || form.model} fue enviada a validación previa antes de publicarse en el catálogo.`,
        });
      }

      setTimeout(() => navigate('/panel/mis-motos'), 600);
    } catch (err) {
      console.error('Error al guardar moto:', err);
      toast({
        title: 'Error al procesar la solicitud',
        description: err?.message || err?.response?.data?.detail || 'Revisa tu conexión o intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const whatsappSupportUrl = `https://wa.me/525643048865?text=${encodeURIComponent(
    `Hola Soporte Motoluv, requiero asistencia para solicitar una modificación en mi publicación ${form.brand} ${form.model} (ID: ${editId || 'N/A'}).`
  )}`;

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-brand transition-colors mb-4 cursor-pointer">
        <ArrowLeft size={12} /> Volver
      </button>

      <div className="mb-8">
        <h1 className="font-display font-bold text-white text-3xl md:text-4xl uppercase flex items-center gap-3">
          {isEditing ? (
            <>
              {isLocked ? 'Ficha de ' : 'Editar '} <span className="text-red-brand">Motocicleta</span>
            </>
          ) : (
            <>
              Publicar <span className="text-red-brand">Motocicleta</span>
            </>
          )}
          {isLocked && (
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-sm flex items-center gap-1 normal-case tracking-normal">
              <Lock size={12} /> Edición Bloqueada
            </span>
          )}
        </h1>
        <p className="text-zinc-400 mt-1 text-sm">
          {isEditing
            ? isLocked
              ? 'Esta motocicleta ya está PUBLICADA y su edición directa está restringida.'
              : 'Modifica los datos y fotografías de tu motocicleta en revisión.'
            : 'Completa la ficha técnica y sube fotos reales de tu moto.'}
        </p>
      </div>

      {/* Published Moto Lock Warning & Support Contact Box */}
      {isLocked && (
        <div className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 via-[#16161a] to-amber-500/5 border border-amber-500/30 rounded-md space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                Publicación en Estado <span className="text-emerald-400 font-black">PUBLICADA</span>
              </h3>
              <p className="text-zinc-300 text-xs mt-1 leading-relaxed">
                Por políticas de seguridad, transparencia con los compradores y protección contra fraudes, 
                la edición directa de los datos y precio está <strong>bloqueada automáticamente</strong> al estar publicada en el catálogo oficial.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
              ¿Necesitas corregir algún dato, precio o agregar fotografías?
            </span>
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              <MessageCircle size={15} /> Contactar a Soporte
            </a>
          </div>
        </div>
      )}

      {fetchingMoto ? (
        <div className="bg-[#111112] border border-white/5 rounded-md p-16 text-center text-zinc-500 text-sm">
          Cargando datos de la motocicleta...
        </div>
      ) : (
        <form onSubmit={submit} className="bg-[#111112] border border-white/5 rounded-md p-6 md:p-8 space-y-8">
          <fieldset disabled={isLocked} className={isLocked ? 'opacity-70 pointer-events-none' : ''}>
            <section>
              <SectionTitle icon={Bike}>Información básica</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <SelectField label="Marca" value={form.brand} onChange={(v) => update('brand', v)} options={BRANDS} disabled={isLocked} />
                <TextField label="Modelo" value={form.model} onChange={(v) => update('model', v)} placeholder="Ninja 400, MT-07, etc." required disabled={isLocked} />
                <SelectField label="Categoría" value={form.category} onChange={(v) => update('category', v)} options={CATEGORIES} disabled={isLocked} />
                <TextField label="Año" type="number" value={form.year} onChange={(v) => update('year', v)} required disabled={isLocked} />
              </div>
            </section>

            <section className="mt-8">
              <SectionTitle>Especificaciones</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <TextField label="Kilometraje" type="number" value={form.km} onChange={(v) => update('km', v)} placeholder="0" required disabled={isLocked} />
                <TextField label="Motor / Cilindrada" value={form.engine} onChange={(v) => update('engine', v)} placeholder="689cc, 999cc, etc." required disabled={isLocked} />
                <TextField label="Color" value={form.color} onChange={(v) => update('color', v)} placeholder="Rojo, Negro, Azul..." required disabled={isLocked} />
                <SelectField label="Ciudad" value={form.city} onChange={(v) => update('city', v)} options={CITIES} disabled={isLocked} />
              </div>
            </section>

            <section className="mt-8">
              <SectionTitle icon={DollarSign}>Precio y Desglose de Comisión</SectionTitle>
              <div className="mt-4 space-y-4">
                <TextField label="Precio de Publicación (MXN)" type="number" value={form.price} onChange={(v) => update('price', v)} placeholder="95000" required disabled={isLocked} />

                {form.price && Number(form.price) > 0 && (() => {
                  const comm = calculateCommission(form.price);
                  return (
                    <div className="p-4 bg-[#0a0a0a] border border-red-brand/30 rounded-md space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-white/5 pb-2">
                        <span className="flex items-center gap-1.5 font-medium text-white">
                          <Calculator size={14} className="text-red-brand" /> Desglose Estimado de Venta
                        </span>
                        <span className="bg-red-brand/10 text-red-brand font-bold px-2 py-0.5 rounded-sm border border-red-brand/30">
                          Servicio Motoluv
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-[#111112] p-2.5 rounded-sm border border-white/5">
                          <span className="text-zinc-500 block text-[10px] uppercase">Precio Publicado</span>
                          <span className="text-white font-bold text-sm">${comm.price.toLocaleString()} MXN</span>
                        </div>

                        <div className="bg-[#111112] p-2.5 rounded-sm border border-white/5">
                          <span className="text-zinc-500 block text-[10px] uppercase">Comisión por Gestión</span>
                          <span className="text-red-brand font-bold text-sm">-${comm.commissionAmount.toLocaleString()} MXN</span>
                        </div>

                        <div className="bg-emerald-500/10 p-2.5 rounded-sm border border-emerald-500/30 col-span-2 md:col-span-1">
                          <span className="text-emerald-400 block text-[10px] uppercase font-bold">Tu Pago Neto</span>
                          <span className="text-emerald-300 font-bold text-sm">${comm.netEarnings.toLocaleString()} MXN</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-[11px] text-zinc-500 pt-1">
                        <Info size={12} className="text-zinc-400 mt-0.5 flex-shrink-0" />
                        <span>La comisión se descuenta únicamente al momento de concretar la venta.</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>

            <section className="mt-8">
              <SectionTitle>Descripción</SectionTitle>
              <div className="mt-4">
                <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Describe tu moto</label>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  disabled={isLocked}
                  placeholder="Estado, mantenimientos, accesorios incluidos, historia..."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600 resize-none disabled:opacity-60"
                />
              </div>
            </section>

            {/* Photo Upload */}
            <section className="mt-8">
              <SectionTitle icon={Camera}>Fotografías ({images.length}/{MAX_IMAGES}) <span className="text-red-brand">*</span></SectionTitle>
              <p className="text-xs text-zinc-500 mt-1">Sube fotos reales de tu motocicleta. Formatos: JPG, PNG, WEBP. Máx 10MB c/u.</p>

              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" disabled={isLocked} />

              {images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || isLocked}
                  className="mt-4 w-full border-2 border-dashed border-white/10 hover:border-red-brand hover:bg-red-brand/5 rounded-md py-14 flex flex-col items-center justify-center gap-3 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-red-brand/10 border border-red-brand/40 flex items-center justify-center">
                    <Upload size={20} className="text-red-brand" />
                  </div>
                  <div className="text-white text-sm font-medium">{uploading ? 'Subiendo...' : 'Haz clic para subir fotos'}</div>
                  <div className="text-zinc-500 text-xs">o arrastra tus imágenes aquí</div>
                </button>
              ) : (
                <div className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-md overflow-hidden bg-[#0a0a0a] border border-white/5 group">
                        <img 
                          src={resolveImageUrl(url, 'moto')} 
                          alt="" 
                          onError={(e) => handleImageError(e, 'moto')}
                          className="w-full h-full object-cover" 
                        />
                        {i === 0 && (
                          <div className="absolute top-2 left-2 bg-red-brand text-white text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm">
                            Portada
                          </div>
                        )}
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-brand text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && !isLocked && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || isLocked}
                        className="aspect-video border-2 border-dashed border-white/10 hover:border-red-brand hover:bg-red-brand/5 rounded-md flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        <ImagePlus size={20} className="text-red-brand" />
                        <span className="text-xs text-zinc-400">{uploading ? 'Subiendo...' : 'Agregar más'}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2">La primera imagen será la portada del anuncio.</p>
                </div>
              )}
            </section>
          </fieldset>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-outline flex-1 sm:flex-initial text-xs font-bold tracking-widest uppercase px-6 py-3.5 rounded-sm cursor-pointer"
            >
              Volver
            </button>

            {isLocked ? (
              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold tracking-widest uppercase rounded-sm transition-all shadow-md cursor-pointer"
              >
                <MessageCircle size={15} /> Contactar a Soporte para Modificar
              </a>
            ) : (
              <button
                type="submit"
                disabled={loading || uploading}
                className="btn-red flex-1 inline-flex items-center justify-center gap-2 text-xs font-bold tracking-widest uppercase px-6 py-3.5 rounded-sm disabled:opacity-70 cursor-pointer"
              >
                <Save size={14} /> {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Publicar Motocicleta'}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

const SectionTitle = ({ icon: Icon, children }) => (
  <h3 className="font-display font-bold text-white uppercase tracking-wide text-sm flex items-center gap-2">
    {Icon && <Icon size={14} className="text-red-brand" />} {children}
  </h3>
);

const TextField = ({ label, type = 'text', value, onChange, placeholder, required, disabled = false }) => (
  <div>
    <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">
      {label} {required && <span className="text-red-brand">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors placeholder:text-zinc-600 disabled:opacity-60"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, disabled = false }) => (
  <div>
    <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 focus:border-red-brand text-white text-sm rounded-sm outline-none transition-colors disabled:opacity-60"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default CreateMotoPage;
