import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import Stripe from 'stripe';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Supabase server client with URL sanitization - Supporting both service role and anon credentials
const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();
const supabaseServer = (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project'))
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// n8n & HubSpot Webhook Automation Trigger
async function triggerN8nHubspotWebhook(eventType: string, payload: any) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.HUBSPOT_WEBHOOK_URL;
  
  const formattedPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    source: 'Motoluv Platform',
    hubspot_contact: {
      email: payload.email || payload.customerEmail || payload.userEmail || '',
      firstname: (payload.name || payload.customerName || '').split(' ')[0] || 'Usuario',
      lastname: (payload.name || payload.customerName || '').split(' ').slice(1).join(' ') || 'Motoluv',
      phone: payload.phone || '',
      city: payload.city || 'Ciudad de México',
      user_type: payload.role || 'comprador',
      hs_lead_status: 'NEW',
    },
    data: payload,
  };

  // 1. Write user record to Supabase database (syncing to profiles table)
  if (supabaseServer && eventType === 'user.registered') {
    try {
      const userPayload = {
        id: payload.id,
        full_name: payload.name,
        phone: payload.phone || '',
        role: payload.role || 'comprador',
        city: payload.city || 'Ciudad de México',
        updated_at: new Date().toISOString(),
      };
      
      await supabaseServer.from('profiles').upsert([userPayload], { onConflict: 'id' });
      console.log('User synced to Supabase database profiles:', payload.email);
    } catch (err: any) {
      console.error('Error writing user to Supabase:', err?.message || err);
    }
  }

  // 2. Trigger n8n webhook workflow for HubSpot contact creation and card status updates
  if (webhookUrl) {
    try {
      await axios.post(webhookUrl, formattedPayload, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
      console.log(`n8n/HubSpot webhook dispatched successfully [${eventType}]`);
    } catch (err: any) {
      console.warn(`n8n Webhook call failed (${err.message}). Payload prepared.`);
    }
  } else {
    console.log(`[n8n/HubSpot Automation Ready] Event: ${eventType} | Target: ${payload.email || payload.cardId || payload.id}`);
  }

  return formattedPayload;
}

let aiInstance: GoogleGenAI | null = null;
function getAIInstance(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    });
  }
  return stripeClient;
}

const PORT = 3000;
const UPLOAD_DIR = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('Warning: Could not create upload directory:', err);
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const userId = (req as any).user?.id || 'anon';
    const filename = `${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Formato no permitido. Usa: ${allowed.join(', ')}`));
  },
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  city?: string;
  role: 'comprador' | 'vendedor' | 'both';
  created_at?: string;
  avatar?: string;
  bank_clabe?: string;
  bank_name?: string;
  bank_holder?: string;
  rating?: number;
  operations?: number;
}

export type User = AuthenticatedUser;

function getCommissionRate(price: number): number {
  if (price <= 30000) return 0.10;
  if (price <= 50000) return 0.08;
  if (price <= 150000) return 0.07;
  if (price <= 300000) return 0.06;
  return 0.05;
}

function calculateCommission(price: number) {
  const rate = getCommissionRate(price);
  const amount = Math.round(price * rate);
  const net = Math.max(0, price - amount);
  return {
    commission_rate: rate,
    commission_amount: amount,
    net_payout: net,
  };
}

interface Moto {
  id: string;
  owner_id: string;
  owner_name: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  color: string;
  engine: string;
  category: string;
  city: string;
  location?: string;
  price: number;
  commission_rate: number;
  commission_amount: number;
  net_payout: number;
  description: string;
  images: string[];
  image: string;
  score: number;
  rating: number;
  views: number;
  featured: boolean;
  status: 'active' | 'sold' | 'paused' | 'Publicada' | 'Apartada' | 'Certificación' | 'Oferta' | 'Proceso de entrega' | 'Entregada' | 'Vendida' | string;
  created_at: string;
  score_details: Record<string, number>;
  scoreDetails?: Record<string, number>;
  certification_id?: string;
  certified_date?: string;
  certifier?: string;
  certified_status?: string;
  inspection_notes?: string;
}

interface Offer {
  id: string;
  moto_id: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  moto_brand: string;
  moto_model: string;
  moto_image?: string;
  amount: number;
  package: 'basico' | 'plus' | 'total';
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
}

interface PartnerApp {
  id: string;
  name: string;
  phone: string;
  location: string;
  email?: string;
  message?: string;
  created_at: string;
  status: string;
}

const db = {
  motos: new Map<string, Moto>(),
  offers: new Map<string, Offer>(),
  apartados: new Map<string, any>(),
  notifications: new Map<string, any>(),
  partners: new Map<string, PartnerApp>(),
};

// Seed initial data for motos marketplace
function seedDatabase() {
  if (db.motos.size > 0) return;

  const motoImages = [
    'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.pexels.com/photos/30444779/pexels-photo-30444779.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.unsplash.com/photo-1547549082-6bc09f2049ae?w=800',
    'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800',
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800',
    'https://images.unsplash.com/photo-1580310614729-ccd69652491d?w=800',
    'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800',
    'https://images.unsplash.com/photo-1558980664-769d59546b3d?w=800',
    'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=800',
    'https://images.unsplash.com/photo-1558980664-3a031cf67ea8?w=800',
    'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=800',
    'https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4?w=800',
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800',
  ];

  const seeds = [
    { brand: 'Kawasaki', model: 'Ninja 400', category: 'Deportiva', engine: '399cc', price: 95000, year: 2022, km: 12000, color: 'Verde', city: 'Monterrey', score: 4.2, views: 89, featured: false, rating: 4 },
    { brand: 'Yamaha', model: 'MT-07', category: 'Naked', engine: '689cc', price: 185000, year: 2024, km: 0, color: 'Azul', city: 'Guadalajara', score: 5.0, views: 156, featured: true, rating: 5 },
    { brand: 'Honda', model: 'CB190R', category: 'Naked', engine: '184cc', price: 45000, year: 2023, km: 5000, color: 'Rojo', city: 'Ciudad de México', score: 4.5, views: 234, featured: true, rating: 5 },
    { brand: 'Ducati', model: 'Panigale V4', category: 'Deportiva', engine: '1103cc', price: 480000, year: 2024, km: 0, color: 'Rojo', city: 'Monterrey', score: 5.0, views: 342, featured: true, rating: 5 },
    { brand: 'Honda', model: 'CBR1000RR', category: 'Deportiva', engine: '999cc', price: 285000, year: 2024, km: 0, color: 'Negro', city: 'CDMX', score: 4.9, views: 156, featured: false, rating: 5 },
    { brand: 'BMW', model: 'S1000RR', category: 'Deportiva', engine: '999cc', price: 420000, year: 2024, km: 0, color: 'Rojo/Blanco', city: 'CDMX', score: 4.9, views: 267, featured: true, rating: 5 },
    { brand: 'Harley-Davidson', model: 'Iron 883', category: 'Cruiser', engine: '883cc', price: 260000, year: 2024, km: 1200, color: 'Negro', city: 'Tijuana', score: 4.5, views: 210, featured: true, rating: 4 },
    { brand: 'Yamaha', model: 'Tenere 700', category: 'Adventure', engine: '689cc', price: 220000, year: 2024, km: 0, color: 'Azul', city: 'Mérida', score: 4.9, views: 121, featured: true, rating: 5 },
    { brand: 'Honda', model: 'Africa Twin', category: 'Adventure', engine: '1084cc', price: 320000, year: 2024, km: 0, color: 'Negro', city: 'Toluca', score: 4.7, views: 87, featured: false, rating: 5 },
    { brand: 'KTM', model: 'Duke 390', category: 'Naked', engine: '373cc', price: 98000, year: 2024, km: 500, color: 'Naranja', city: 'Guadalajara', score: 4.6, views: 112, featured: false, rating: 4 },
    { brand: 'BMW', model: 'GS 1250', category: 'Adventure', engine: '1254cc', price: 385000, year: 2024, km: 2000, color: 'Blanco', city: 'Monterrey', score: 4.8, views: 178, featured: false, rating: 5 },
    { brand: 'Triumph', model: 'Street Triple 765', category: 'Naked', engine: '765cc', price: 210000, year: 2024, km: 1200, color: 'Negro', city: 'Puebla', score: 4.7, views: 89, featured: false, rating: 5 },
    { brand: 'Ducati', model: 'Monster 937', category: 'Naked', engine: '937cc', price: 265000, year: 2024, km: 800, color: 'Rojo', city: 'CDMX', score: 4.8, views: 145, featured: false, rating: 5 },
    { brand: 'Aprilia', model: 'RS 660', category: 'Deportiva', engine: '659cc', price: 195000, year: 2024, km: 0, color: 'Negro/Rojo', city: 'Querétaro', score: 4.6, views: 76, featured: false, rating: 4 },
    { brand: 'Kawasaki', model: 'Z900', category: 'Naked', engine: '948cc', price: 205000, year: 2024, km: 3000, color: 'Verde', city: 'Guadalajara', score: 4.7, views: 132, featured: false, rating: 5 },
    { brand: 'Yamaha', model: 'R7', category: 'Deportiva', engine: '689cc', price: 168000, year: 2024, km: 1500, color: 'Azul', city: 'Mérida', score: 4.5, views: 65, featured: false, rating: 5 },
    { brand: 'Honda', model: 'Rebel 500', category: 'Cruiser', engine: '471cc', price: 115000, year: 2024, km: 500, color: 'Negro', city: 'León', score: 4.4, views: 78, featured: false, rating: 4 },
    { brand: 'Yamaha', model: 'NMAX', category: 'Scooter', engine: '155cc', price: 55000, year: 2024, km: 0, color: 'Gris', city: 'Puebla', score: 4.3, views: 78, featured: false, rating: 4 },
    { brand: 'Honda', model: 'PCX150', category: 'Scooter', engine: '149cc', price: 62000, year: 2024, km: 0, color: 'Blanco', city: 'Querétaro', score: 4.4, views: 34, featured: false, rating: 4 },
    { brand: 'Suzuki', model: 'V-Strom 650', category: 'Adventure', engine: '645cc', price: 165000, year: 2024, km: 0, color: 'Amarillo', city: 'León', score: 4.6, views: 92, featured: false, rating: 5 },
    { brand: 'Harley-Davidson', model: 'Sportster S', category: 'Cruiser', engine: '1252cc', price: 335000, year: 2024, km: 0, color: 'Negro', city: 'CDMX', score: 4.8, views: 156, featured: true, rating: 5 },
    { brand: 'Yamaha', model: 'XSR900', category: 'Naked', engine: '890cc', price: 195000, year: 2024, km: 1200, color: 'Amarillo', city: 'Guadalajara', score: 4.7, views: 92, featured: false, rating: 5 },
  ];

  seeds.forEach((s, i) => {
    const id = `moto_${Math.random().toString(36).slice(2, 10)}`;
    const imgs = [
      motoImages[i % motoImages.length],
      motoImages[(i + 1) % motoImages.length],
      motoImages[(i + 2) % motoImages.length],
      motoImages[(i + 3) % motoImages.length],
    ];
    const comm = calculateCommission(s.price);
    const statuses = ['Publicada', 'Publicada', 'Apartada', 'Certificación', 'Oferta', 'Proceso de entrega', 'Entregada', 'Vendida'];
    const assignedStatus = statuses[i % statuses.length];

    const moto: Moto = {
      id,
      owner_id: 'user_admin_demo',
      owner_name: 'DEMO MOTOLUV',
      brand: s.brand,
      model: s.model,
      year: s.year,
      km: s.km,
      color: s.color,
      engine: s.engine,
      category: s.category,
      city: s.city,
      price: s.price,
      commission_rate: comm.commission_rate,
      commission_amount: comm.commission_amount,
      net_payout: comm.net_payout,
      description: `Excelente ${s.brand} ${s.model} en muy buen estado. Mantenimientos al día en agencia. Ideal para quien busca una moto ${s.category.toLowerCase()} confiable y con historial verificado.`,
      images: imgs,
      image: imgs[0],
      score: s.score,
      rating: s.rating,
      views: s.views,
      featured: s.featured,
      status: assignedStatus,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
      score_details: {
        'Motor': Math.min(100, 78 + ((i * 3) % 22)),
        'Frenos': Math.min(100, 80 + ((i * 5) % 20)),
        'Suspensión': Math.min(100, 75 + ((i * 7) % 25)),
        'Transmisión': Math.min(100, 82 + ((i * 4) % 18)),
        'Neumáticos': Math.min(100, 70 + ((i * 6) % 30)),
        'Eléctrico': Math.min(100, 80 + ((i * 2) % 20)),
        'Chasis y Cuadro': Math.min(100, 88 + ((i * 3) % 12)),
        'Documentación': 100,
      },
      scoreDetails: {
        'Motor': Math.min(100, 78 + ((i * 3) % 22)),
        'Frenos': Math.min(100, 80 + ((i * 5) % 20)),
        'Suspensión': Math.min(100, 75 + ((i * 7) % 25)),
        'Transmisión': Math.min(100, 82 + ((i * 4) % 18)),
        'Neumáticos': Math.min(100, 70 + ((i * 6) % 30)),
        'Eléctrico': Math.min(100, 80 + ((i * 2) % 20)),
        'Chasis y Cuadro': Math.min(100, 88 + ((i * 3) % 12)),
        'Documentación': 100,
      },
      certification_id: `CERT-MLV-${2024000 + i + 1}`,
      certified_date: new Date(Date.now() - (i + 2) * 86400000).toISOString().split('T')[0],
      certifier: 'Taller Mecánico Certificado Motoluv MX • Inspector #MLV-408',
      certified_status: 'Aprobada • 150 Puntos Verificados',
      inspection_notes: `Inspección de 150 puntos completada satisfactoriamente. Compresión de motor verificada en estándar óptimo. Sistema de frenos y suspensión sin holguras ni desgastes anómalos. Sistema eléctrico y arnés íntegro. Libre de reporte de robo, siniestros y con número de serie/VIN cotejado en REPUVE.`,
    };
    db.motos.set(id, moto);
  });
}

// Auth Middleware (Validating Supabase Auth JWT tokens)
async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ detail: 'No autenticado' });

  // 1. If Supabase Server is configured with service_role, verify directly with Supabase Auth
  if (supabaseServer) {
    try {
      const { data: { user: supaUser }, error } = await supabaseServer.auth.getUser(token);
      if (!error && supaUser) {
        const metadata = supaUser.user_metadata || {};
        (req as any).user = {
          id: supaUser.id,
          email: supaUser.email || '',
          name: metadata.full_name || metadata.name || supaUser.email?.split('@')[0] || 'Usuario',
          phone: metadata.phone || '',
          city: metadata.city || 'Ciudad de México',
          role: metadata.role || 'both',
        };
        return next();
      }
    } catch (supaErr) {
      console.warn('Supabase token verification check exception:', supaErr);
    }
  }

  // 2. Decode Supabase JWT payload securely if server is running standalone
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
      const decoded = JSON.parse(payloadJson);
      if (decoded && (decoded.sub || decoded.id)) {
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          return res.status(401).json({ detail: 'Sesión expirada' });
        }
        const userId = decoded.sub || decoded.id;
        const metadata = decoded.user_metadata || {};
        (req as any).user = {
          id: userId,
          email: decoded.email || '',
          name: metadata.full_name || metadata.name || decoded.email?.split('@')[0] || 'Usuario',
          phone: metadata.phone || '',
          city: metadata.city || 'Ciudad de México',
          role: metadata.role || 'both',
        };
        return next();
      }
    }
  } catch (decodeErr) {
    // continue
  }

  return res.status(401).json({ detail: 'Token inválido o sesión expirada' });
}

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// Seed database immediately on module initialization
seedDatabase();

export const api = express.Router();

api.get('/health', (_req, res) => {
  return res.json({
    status: 'ok',
    auth_provider: 'supabase',
    supabase_configured: Boolean(supabaseServer),
    motos_count: db.motos.size,
    timestamp: new Date().toISOString(),
  });
});

api.get('/', (_req, res) => {
  res.json({ message: 'Motoluv API', auth: 'Supabase Auth', version: '1.0', motos_count: db.motos.size });
});

api.get('/auth/me', authenticateToken, (req, res) => {
  const user = (req as any).user;
  return res.json(user);
});

  api.patch('/auth/role', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const { role } = req.body;
    if (['comprador', 'vendedor', 'both'].includes(role)) {
      user.role = role;
      if (supabaseServer) {
        try {
          await supabaseServer.from('profiles').update({ role }).eq('id', user.id);
        } catch (e) {
          console.warn('Profiles update error:', e);
        }
      }
    }
    return res.json(user);
  });

  const handleBankUpdate = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { clabe, bank_name, bankName, holder, accountHolder } = req.body;
    const cleanClabe = (clabe || '').replace(/\s/g, '');
    if (!/^\d{18}$/.test(cleanClabe)) {
      return res.status(400).json({ detail: 'La CLABE debe tener exactamente 18 dígitos numéricos' });
    }
    const finalBankName = (bank_name || bankName || '').trim();
    if (!finalBankName) {
      return res.status(400).json({ detail: 'Selecciona un banco' });
    }

    user.bank_clabe = cleanClabe;
    user.bank_name = finalBankName;
    user.bank_holder = (holder || accountHolder || user.name || '').trim();

    if (supabaseServer) {
      try {
        await supabaseServer.from('profiles').upsert({
          id: user.id,
          bank_name: user.bank_name,
          bank_clabe: user.bank_clabe,
          bank_holder: user.bank_holder,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (err: any) {
        console.warn('Supabase bank update sync exception:', err?.message || err);
      }
    }

    return res.json(user);
  };

  api.patch('/auth/bank', authenticateToken, handleBankUpdate);
  api.put('/auth/bank-account', authenticateToken, handleBankUpdate);
  api.patch('/auth/bank-account', authenticateToken, handleBankUpdate);

  // Moto Routes
  api.get('/motos', (req, res) => {
    const { brand, category, city, q, featured, limit, status } = req.query;
    let list = Array.from(db.motos.values());

    if (status) {
      list = list.filter((m) => m.status === status);
    } else {
      // By default list only approved published motorcycles (PUBLICADA) in public catalog
      list = list.filter((m) => m.status === 'PUBLICADA');
    }

    if (brand) list = list.filter((m) => m.brand === brand);
    if (category) list = list.filter((m) => m.category === category);
    if (city) list = list.filter((m) => m.city === city);
    if (featured !== undefined) {
      const isFeat = String(featured).toLowerCase() === 'true' || String(featured) === '1';
      list = list.filter((m) => Boolean(m.featured) === isFeat);
    }
    if (q) {
      const queryStr = String(q).toLowerCase();
      list = list.filter(
        (m) => m.brand.toLowerCase().includes(queryStr) || m.model.toLowerCase().includes(queryStr)
      );
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const max = limit ? parseInt(String(limit), 10) : 100;
    const result = list.slice(0, max).map((m: any) => ({
      ...m,
      is_apartada: m.apartado_status === 'APARTADA' || Boolean(m.is_apartada),
    }));
    return res.json(result);
  });

  api.get('/motos/:id', (req, res) => {
    const moto = db.motos.get(req.params.id) as any;
    if (!moto) return res.status(404).json({ detail: 'Motocicleta no encontrada' });
    const isApartada = moto.apartado_status === 'APARTADA' || Boolean(moto.is_apartada);
    const sellerIdentityVerificationStatus = moto.seller_identity_verification_status || moto.identity_verification_status || 'unverified';
    return res.json({
      ...moto,
      is_apartada: isApartada,
      seller_identity_verification_status: sellerIdentityVerificationStatus,
      identity_verification_status: sellerIdentityVerificationStatus,
    });
  });

  api.post('/motos/:id/views', (req, res) => {
    const moto = db.motos.get(req.params.id) as any;
    if (!moto) return res.status(404).json({ detail: 'Motocicleta no encontrada' });
    moto.views = (Number(moto.views) || 0) + 2;
    return res.json({ id: moto.id, views: moto.views });
  });

  api.post('/motos', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    // Auto-upgrade user role to 'both' if they are posting a motorcycle
    if (user.role === 'comprador') {
      user.role = 'both';
      if (supabaseServer) {
        try {
          supabaseServer.from('profiles').update({ role: 'both' }).eq('id', user.id);
        } catch {}
      }
    }

    const { brand, model, year, km, color, engine, category, city, price, description, images } = req.body;
    const defaultImg = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800';
    const imgs = images && images.length > 0 ? images : [defaultImg];
    const id = `moto_${Math.random().toString(36).slice(2, 10)}`;

    const numericPrice = parseInt(price, 10) || 0;
    const comm = calculateCommission(numericPrice);

    const moto: Moto = {
      id,
      owner_id: user.id,
      owner_name: user.name,
      brand: brand || 'Motocicleta',
      model: model || '',
      year: parseInt(year, 10) || 2024,
      km: parseInt(km, 10) || 0,
      color: color || '',
      engine: engine || '',
      category: category || 'Naked',
      city: city || 'Ciudad de México',
      price: numericPrice,
      commission_rate: comm.commission_rate,
      commission_amount: comm.commission_amount,
      net_payout: comm.net_payout,
      description: description || '',
      images: imgs,
      image: imgs[0],
      score: 4.5,
      rating: 5,
      views: 0,
      featured: false,
      status: 'EN REVISIÓN',
      created_at: new Date().toISOString(),
      score_details: {
        Motor: 85,
        Frenos: 82,
        Suspensión: 80,
        Transmisión: 88,
        Neumáticos: 75,
        Eléctrico: 90,
      },
    };

    db.motos.set(id, moto);

    // Sync to Supabase Database if connected
    if (supabaseServer) {
      (async () => {
        try {
          const { error } = await supabaseServer.from('motos').insert([{
            id: moto.id,
            title: `${moto.brand} ${moto.model} ${moto.year}`,
            brand: moto.brand,
            model: moto.model,
            year: moto.year,
            price: moto.price,
            km: moto.km,
            engine: moto.engine,
            category: moto.category,
            location: moto.city,
            description: moto.description,
            images: moto.images,
            owner_id: moto.owner_id,
            owner_name: moto.owner_name,
            score: moto.score,
            score_details: moto.score_details,
            status: moto.status,
            created_at: moto.created_at,
          }]);
          if (error) console.warn('Supabase moto insert sync error:', error.message);
          else console.log('Moto synced to Supabase database successfully:', moto.id);
        } catch (err: any) {
          console.warn('Supabase moto sync exception:', err?.message || err);
        }
      })();
    }

    // Sync listing creation card to n8n / HubSpot
    triggerN8nHubspotWebhook('card.status_created', {
      cardId: `card_${id}`,
      title: `${brand} ${model}`,
      status: 'EN REVISIÓN',
      userId: user.id,
      userEmail: user.email,
      motoId: id,
      price: numericPrice,
    });

    return res.json(moto);
  });

  api.patch('/motos/:id', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const moto = db.motos.get(req.params.id);
    if (!moto) return res.status(404).json({ detail: 'No encontrada' });
    if (moto.owner_id !== user.id) return res.status(403).json({ detail: 'No autorizado' });

    const previousStatus = moto.status;
    const newStatus = req.body.status;

    // Regla de negocio: Toda publicación rechazada en cualquier inspección se elimina automáticamente
    if (newStatus === 'Rechazada' || newStatus === 'rejected') {
      db.motos.delete(moto.id);

      triggerN8nHubspotWebhook('card.status_updated', {
        cardId: `card_${moto.id}`,
        title: `${moto.brand} ${moto.model}`,
        status: 'Rechazada_Eliminada',
        userId: user.id,
        userEmail: user.email,
        motoId: moto.id,
      });

      if (supabaseServer) {
        (async () => {
          try {
            await supabaseServer.from('motos').delete().eq('id', moto.id);
          } catch (err: any) {
            console.warn('Supabase moto delete on rejection exception:', err?.message || err);
          }
        })();
      }

      return res.json({
        ok: true,
        deleted: true,
        status: 'Rechazada',
        detail: 'La publicación no aprobó la inspección técnica y ha sido eliminada automáticamente del catálogo.',
      });
    }

    Object.assign(moto, req.body);
    if (req.body.images && req.body.images.length > 0) {
      moto.image = req.body.images[0];
    }

    // Trigger status card update webhook for n8n / HubSpot sync
    if (req.body.status || previousStatus !== moto.status) {
      triggerN8nHubspotWebhook('card.status_updated', {
        cardId: `card_${moto.id}`,
        title: `${moto.brand} ${moto.model}`,
        status: moto.status,
        userId: user.id,
        userEmail: user.email,
        motoId: moto.id,
      });
    }

    if (supabaseServer) {
      (async () => {
        try {
          await supabaseServer.from('motos').update({
            price: moto.price,
            status: moto.status,
            description: moto.description,
            images: moto.images,
            location: moto.city,
          }).eq('id', moto.id);
        } catch (err: any) {
          console.warn('Supabase moto update sync exception:', err?.message || err);
        }
      })();
    }

    return res.json(moto);
  });

  api.delete('/motos/:id', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const moto = db.motos.get(req.params.id);

    if (moto) {
      if (moto.owner_id && moto.owner_id !== user.id) {
        return res.status(403).json({ detail: 'No autorizado' });
      }

      // Si la publicación fue autorizada y apartada, no se puede eliminar
      if (moto.status === 'Apartada' || moto.status === 'reserved' || moto.status === 'Proceso de entrega') {
        return res.status(400).json({
          detail: 'No puedes eliminar una publicación autorizada y apartada. Se encuentra en proceso activo de compraventa.',
        });
      }

      // Si tiene ofertas activas en proceso, no se puede eliminar
      const activeOffers = Array.from(db.offers.values()).filter(
        (o) => o.moto_id === req.params.id && ['pending', 'accepted'].includes(o.status)
      );
      if (activeOffers.length > 0) {
        return res.status(400).json({
          detail: `No puedes eliminar esta publicación: tiene ${activeOffers.length} oferta(s) activa(s) en proceso. Debes responder o declinar las ofertas antes de eliminarla.`,
        });
      }

      db.motos.delete(req.params.id);
    }

    if (supabaseServer) {
      (async () => {
        try {
          await supabaseServer.from('motos').delete().eq('id', req.params.id);
        } catch (err: any) {
          console.warn('Supabase moto delete sync exception:', err?.message || err);
        }
      })();
    }

    return res.json({ ok: true, detail: 'Publicación eliminada correctamente' });
  });

  api.get('/my/motos', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    if (supabaseServer) {
      try {
        const { data: supaMotos, error } = await supabaseServer
          .from('motos')
          .select('*')
          .eq('owner_id', user.id);

        if (!error && Array.isArray(supaMotos)) {
          for (const m of supaMotos) {
            const imgs = Array.isArray(m.images) && m.images.length > 0 ? m.images : (m.image ? [m.image] : []);
            const motoRecord: any = {
              id: m.id,
              title: m.title || `${m.brand} ${m.model} ${m.year}`,
              brand: m.brand,
              model: m.model,
              year: m.year,
              price: m.price,
              km: m.km || 0,
              engine: m.engine || '',
              category: m.category || 'naked',
              city: m.location || m.city || 'Ciudad de México',
              images: imgs,
              image: imgs[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&q=80',
              description: m.description || '',
              status: m.status || 'EN REVISIÓN',
              owner_id: m.owner_id,
              owner_name: m.owner_name || user.name,
              owner_phone: m.owner_phone || user.phone,
              views: m.views || 0,
              featured: Boolean(m.featured),
              is_boosted: Boolean(m.is_boosted),
              created_at: m.created_at || new Date().toISOString(),
            };
            db.motos.set(m.id, motoRecord);
          }
        }
      } catch (err: any) {
        console.warn('Supabase /my/motos sync error:', err?.message || err);
      }
    }

    const list = Array.from(db.motos.values()).filter((m) => m.owner_id === user.id);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(list);
  });

  // Offer Routes
  api.post('/offers', authenticateToken, (req, res) => {
    const user = (req as any).user as User;
    const { moto_id, amount, package: pkg, message, is_apartado } = req.body;
    const moto = db.motos.get(moto_id);
    if (!moto) return res.status(404).json({ detail: 'Moto no encontrada' });
    if (moto.owner_id === user.id) {
      return res.status(400).json({ detail: 'No puedes ofertar o apartar tu propia moto' });
    }

    const id = `offer_${Math.random().toString(36).slice(2, 10)}`;
    const parsedAmount = parseInt(amount, 10) || 600;
    const isApartado = Boolean(is_apartado || parsedAmount === 600);

    const offer: any = {
      id,
      moto_id,
      buyer_id: user.id,
      buyer_name: user.name,
      seller_id: moto.owner_id,
      moto_brand: moto.brand,
      moto_model: moto.model,
      moto_image: moto.image,
      amount: parsedAmount,
      package: pkg || 'plus',
      message: message || '',
      status: isApartado ? 'accepted' : 'pending',
      is_apartado: isApartado,
      created_at: new Date().toISOString(),
    };

    if (isApartado) {
      moto.status = 'Apartada';
    }

    db.offers.set(id, offer);

    if (supabaseServer) {
      (async () => {
        try {
          await supabaseServer.from('offers').insert([{
            id: offer.id,
            moto_id: offer.moto_id,
            buyer_id: offer.buyer_id,
            buyer_name: offer.buyer_name,
            seller_id: offer.seller_id,
            amount: offer.amount,
            status: offer.status,
            message: offer.message,
            created_at: offer.created_at,
          }]);
        } catch (err: any) {
          console.warn('Supabase offer sync exception:', err?.message || err);
        }
      })();
    }

    return res.json(offer);
  });

  api.get('/my/offers', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    if (supabaseServer) {
      try {
        const { data: supaOffers, error } = await supabaseServer
          .from('offers')
          .select('*')
          .eq('buyer_id', user.id);
        if (!error && Array.isArray(supaOffers)) {
          for (const o of supaOffers) {
            const existing = db.offers.get(o.id) || {};
            const moto = db.motos.get(o.moto_id);
            db.offers.set(o.id, {
              ...existing,
              ...o,
              buyer_id: o.buyer_id,
              seller_id: o.seller_id,
              moto_id: o.moto_id,
              moto_brand: o.moto_brand || moto?.brand || '',
              moto_model: o.moto_model || moto?.model || '',
              moto_image: o.moto_image || moto?.image || '',
              amount: o.amount,
              status: o.status,
              created_at: o.created_at,
            });
          }
        }
      } catch (err: any) {
        console.warn('Supabase /my/offers error:', err?.message || err);
      }
    }
    const list = Array.from(db.offers.values()).filter((o) => o.buyer_id === user.id);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(list);
  });

  api.get('/my/received-offers', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    if (supabaseServer) {
      try {
        const { data: supaOffers, error } = await supabaseServer
          .from('offers')
          .select('*')
          .eq('seller_id', user.id);
        if (!error && Array.isArray(supaOffers)) {
          for (const o of supaOffers) {
            const existing = db.offers.get(o.id) || {};
            const moto = db.motos.get(o.moto_id);
            db.offers.set(o.id, {
              ...existing,
              ...o,
              buyer_id: o.buyer_id,
              buyer_name: o.buyer_name || 'Comprador interesado',
              seller_id: o.seller_id,
              moto_id: o.moto_id,
              moto_brand: o.moto_brand || moto?.brand || '',
              moto_model: o.moto_model || moto?.model || '',
              moto_image: o.moto_image || moto?.image || '',
              amount: o.amount,
              status: o.status,
              created_at: o.created_at,
            });
          }
        }
      } catch (err: any) {
        console.warn('Supabase /my/received-offers error:', err?.message || err);
      }
    }
    const list = Array.from(db.offers.values()).filter((o) => o.seller_id === user.id);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(list);
  });

  api.patch('/offers/:id', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const offer = db.offers.get(req.params.id);
    if (!offer) return res.status(404).json({ detail: 'Oferta no encontrada' });
    const { status } = req.body;

    if (['accepted', 'rejected', 'completed'].includes(status) && offer.seller_id !== user.id) {
      return res.status(403).json({ detail: 'Solo el vendedor puede actualizar el estado' });
    }

    offer.status = status;

    if (supabaseServer) {
      try {
        await supabaseServer.from('offers').update({ status }).eq('id', offer.id);
      } catch (err: any) {
        console.warn('Supabase update offer status error:', err?.message || err);
      }
    }

    return res.json(offer);
  });

  // Apartado Routes
  api.post('/apartados', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const { moto_id } = req.body;
    const moto = db.motos.get(moto_id);
    if (!moto) return res.status(404).json({ detail: 'Moto no encontrada' });
    if (moto.owner_id === user.id) {
      return res.status(400).json({ detail: 'No puedes apartar tu propia moto' });
    }

    // Check if there is an existing appointment / certification for this moto_id
    const existingApartadosForMoto = Array.from(db.apartados.values()).filter((a) => a.moto_id === moto_id);
    const existingApprovedCert = existingApartadosForMoto.find(
      (a) =>
        String(a.certification_status).toUpperCase() === 'APROBADA' ||
        String(a.certification_status).toUpperCase() === 'CERTIFICADA'
    );
    const existingRejectedCert = existingApartadosForMoto.find(
      (a) =>
        String(a.certification_status).toUpperCase() === 'RECHAZADA' ||
        String(a.certification_status).toUpperCase() === 'NO_APROBADA'
    );
    const existingProgrammedApp = existingApartadosForMoto.find(
      (a) =>
        String(a.certification_appointment_status).toUpperCase() === 'PROGRAMADA' &&
        String(a.status).toUpperCase() === 'REALIZADO' &&
        a.certification_appointment_at
    );

    const mCertStatus = String(moto.certified_status || (moto as any).certification_status || moto.certification_id ? 'APROBADA' : '').toUpperCase();
    const isApproved = existingApprovedCert || mCertStatus === 'APROBADA' || mCertStatus === 'CERTIFICADA' || (typeof moto.score === 'number' && moto.score >= 80);
    const isRejected = existingRejectedCert || mCertStatus === 'RECHAZADA' || mCertStatus === 'NO_APROBADA';

    const id = `apartado_${Math.random().toString(36).slice(2, 10)}`;
    const apartado: any = {
      id,
      moto_id,
      buyer_id: user.id,
      seller_id: moto.owner_id,
      status: 'REALIZADO',
      certification_appointment_at: isApproved
        ? (existingApprovedCert?.certification_appointment_at || moto.certified_date || null)
        : isRejected
        ? (existingRejectedCert?.certification_appointment_at || null)
        : existingProgrammedApp
        ? existingProgrammedApp.certification_appointment_at
        : null,
      certification_appointment_status: (isApproved || isRejected)
        ? 'COMPLETADA'
        : existingProgrammedApp
        ? 'PROGRAMADA'
        : 'Pendiente',
      certification_workshop: isApproved
        ? (existingApprovedCert?.certification_workshop || moto.certifier || 'Taller Mecánico Certificado Motoluv')
        : isRejected
        ? (existingRejectedCert?.certification_workshop || 'Taller Mecánico Certificado Motoluv')
        : existingProgrammedApp
        ? existingProgrammedApp.certification_workshop
        : null,
      certification_workshop_id: isApproved
        ? (existingApprovedCert?.certification_workshop_id || null)
        : isRejected
        ? (existingRejectedCert?.certification_workshop_id || null)
        : existingProgrammedApp
        ? existingProgrammedApp.certification_workshop_id
        : null,
      certification_status: isApproved
        ? 'APROBADA'
        : isRejected
        ? 'RECHAZADA'
        : (existingProgrammedApp?.certification_status || 'PENDIENTE'),
      created_at: new Date().toISOString(),
      moto: {
        id: moto.id,
        brand: moto.brand,
        model: moto.model,
        year: moto.year,
        price: moto.price,
        city: moto.city || moto.location,
        image: moto.image,
        images: moto.images,
        owner_id: moto.owner_id,
        owner_name: moto.owner_name,
      },
    };

    db.apartados.set(id, apartado);

    // Add in-memory notification for seller
    const notifId = `notif_${Math.random().toString(36).slice(2, 10)}`;
    db.notifications.set(notifId, {
      id: notifId,
      recipient_id: moto.owner_id,
      type: 'APARTADO_RECIBIDO',
      title: '¡Apartado recibido!',
      body: `Se ha registrado un apartado para tu ${moto.brand} ${moto.model}. Es momento de agendar la inspección técnica en un taller certificado.`,
      moto_id,
      apartado_id: id,
      created_at: new Date().toISOString(),
      read_at: null,
    });

    if (supabaseServer) {
      try {
        await supabaseServer.from('apartados').insert([{
          id: apartado.id,
          moto_id: apartado.moto_id,
          buyer_id: apartado.buyer_id,
          status: 'REALIZADO',
          certification_appointment_at: apartado.certification_appointment_at,
          certification_appointment_status: apartado.certification_appointment_status,
          certification_workshop: apartado.certification_workshop,
          certification_workshop_id: apartado.certification_workshop_id,
          certification_status: apartado.certification_status,
          created_at: apartado.created_at,
        }]);
        await supabaseServer.from('notifications').insert([{
          id: notifId,
          recipient_id: moto.owner_id,
          type: 'APARTADO_RECIBIDO',
          title: '¡Apartado recibido!',
          body: `Se ha registrado un apartado para tu ${moto.brand} ${moto.model}. Es momento de agendar la inspección técnica en un taller certificado.`,
          moto_id,
          apartado_id: id,
        }]);
      } catch (err: any) {
        console.warn('Supabase apartado sync exception:', err?.message || err);
      }
    }

    return res.json(apartado);
  });

  api.get('/my/apartados', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const allApartados = Array.from(db.apartados.values());
    const list = allApartados
      .filter((a) => a.buyer_id === user.id)
      .map((a) => {
        const moto = db.motos.get(a.moto_id);
        return {
          ...a,
          certification_appointment_at: a.certification_appointment_at || null,
          certification_appointment_status: a.certification_appointment_status || 'Pendiente',
          certification_workshop: a.certification_workshop || null,
          certification_status: a.certification_status || 'PENDIENTE',
          moto_brand: a.moto?.brand || moto?.brand,
          moto_model: a.moto?.model || moto?.model,
          moto_year: a.moto?.year || moto?.year,
          moto_price: a.moto?.price || moto?.price,
          moto_image: a.moto?.images?.[0] || a.moto?.image || moto?.images?.[0] || moto?.image,
          seller_name: a.moto?.owner_name || moto?.owner_name || 'Vendedor Verificado',
        };
      });
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(list);
  });

  api.get('/my/received-apartados', authenticateToken, async (req, res) => {
    const user = (req as any).user as User;
    const allApartados = Array.from(db.apartados.values());
    const list = allApartados
      .filter((a) => {
        const moto = db.motos.get(a.moto_id);
        return a.seller_id === user.id || a.moto?.owner_id === user.id || moto?.owner_id === user.id;
      })
      .map((a) => {
        const moto = db.motos.get(a.moto_id);
        return {
          ...a,
          certification_appointment_at: a.certification_appointment_at || null,
          certification_appointment_status: a.certification_appointment_status || 'Pendiente',
          certification_workshop: a.certification_workshop || null,
          certification_status: a.certification_status || 'PENDIENTE',
          moto_brand: a.moto?.brand || moto?.brand,
          moto_model: a.moto?.model || moto?.model,
          moto_year: a.moto?.year || moto?.year,
          moto_price: a.moto?.price || moto?.price,
          moto_city: a.moto?.city || moto?.city || moto?.location,
          moto_image: a.moto?.images?.[0] || a.moto?.image || moto?.images?.[0] || moto?.image,
          seller_name: a.moto?.owner_name || moto?.owner_name || 'Vendedor',
        };
      });
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return res.json(list);
  });

  api.get('/operations/tracking', async (req, res) => {
    try {
      let contracts: any[] = [];
      let tracking: any[] = [];
      if (supabaseServer) {
        const [cRes, otRes] = await Promise.all([
          supabaseServer.from('contracts').select('*'),
          supabaseServer.from('operation_tracking').select('*'),
        ]);
        contracts = cRes.data || [];
        tracking = otRes.data || [];
      }
      return res.json({ contracts, tracking });
    } catch (err: any) {
      console.warn('Error fetching operations tracking:', err?.message || err);
      return res.json({ contracts: [], tracking: [] });
    }
  });

  api.put('/apartados/:id/appointment', authenticateToken, async (req, res) => {
    const { appointment_at, workshop_name, workshop_id, moto_id } = req.body;
    let targetMotoId = moto_id;
    let targetApartado = null;

    if (req.params.id && req.params.id !== 'by-moto') {
      targetApartado = db.apartados.get(req.params.id);
      if (targetApartado && !targetMotoId) {
        targetMotoId = targetApartado.moto_id;
      }
    }

    // Step 1: Search by moto_id in memory DB
    if (targetMotoId) {
      const motoApartados = Array.from(db.apartados.values()).filter((a) => a.moto_id === targetMotoId);
      const existingApproved = motoApartados.find(
        (a) => String(a.certification_status).toUpperCase() === 'APROBADA' || String(a.certification_status).toUpperCase() === 'CERTIFICADA'
      );
      const existingRejected = motoApartados.find(
        (a) => String(a.certification_status).toUpperCase() === 'RECHAZADA' || String(a.certification_status).toUpperCase() === 'NO_APROBADA'
      );
      const existingProg = motoApartados.find(
        (a) => String(a.certification_appointment_status).toUpperCase() === 'PROGRAMADA' && a.certification_appointment_at
      );

      // Rule 3: If completed + approved or rejected, reuse it!
      if (existingApproved || existingRejected) {
        const certResult = existingApproved ? 'APROBADA' : 'RECHAZADA';
        const source = existingApproved || existingRejected;
        if (targetApartado) {
          targetApartado.certification_status = certResult;
          targetApartado.certification_appointment_status = 'COMPLETADA';
        }
        return res.json({
          reused: true,
          isCertified: Boolean(existingApproved),
          isRejected: Boolean(existingRejected),
          certification_status: certResult,
          certification_appointment_status: 'COMPLETADA',
          certification_appointment_at: source?.certification_appointment_at || null,
          certification_workshop: source?.certification_workshop || null,
        });
      }

      // Rule 2: If PROGRAMADA exists, reuse it!
      if (existingProg) {
        if (targetApartado) {
          targetApartado.certification_appointment_at = existingProg.certification_appointment_at;
          targetApartado.certification_appointment_status = 'PROGRAMADA';
          targetApartado.certification_workshop = existingProg.certification_workshop;
          targetApartado.certification_workshop_id = existingProg.certification_workshop_id;
        }
        return res.json(existingProg);
      }
    }

    // Rule 4: Schedule new appointment
    const newAppointmentIso = appointment_at ? new Date(appointment_at).toISOString() : new Date().toISOString();
    
    // Update all apartados of this moto in memory
    if (targetMotoId) {
      Array.from(db.apartados.values())
        .filter((a) => a.moto_id === targetMotoId)
        .forEach((a) => {
          a.certification_appointment_at = newAppointmentIso;
          a.certification_appointment_status = 'PROGRAMADA';
          a.certification_workshop = workshop_name;
          a.certification_workshop_id = workshop_id;
        });
    } else if (targetApartado) {
      targetApartado.certification_appointment_at = newAppointmentIso;
      targetApartado.certification_appointment_status = 'PROGRAMADA';
      targetApartado.certification_workshop = workshop_name;
      targetApartado.certification_workshop_id = workshop_id;
    }

    if (supabaseServer && targetMotoId) {
      try {
        await supabaseServer.from('apartados').update({
          certification_appointment_at: newAppointmentIso,
          certification_appointment_status: 'PROGRAMADA',
          certification_workshop: workshop_name || null,
          certification_workshop_id: workshop_id || null,
        }).eq('moto_id', targetMotoId);
      } catch (err: any) {
        console.warn('Supabase update appointment error:', err?.message || err);
      }
    }

    return res.json(targetApartado || {
      certification_appointment_at: newAppointmentIso,
      certification_appointment_status: 'PROGRAMADA',
      certification_workshop: workshop_name,
      certification_workshop_id: workshop_id,
    });
  });

  // Upload Route with Supabase Storage & Local Disk Fallback
  api.post('/upload', authenticateToken, (req, res) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ detail: err.message || 'Error al subir archivo' });
      }
      if (!req.file) {
        return res.status(400).json({ detail: 'No se envió ningún archivo' });
      }

      // If Supabase Storage is configured, upload directly to Supabase bucket ('motos' or 'Motos')
      if (supabaseServer) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const fileExt = path.extname(req.file.originalname) || '.jpg';
          const supabaseFileName = `moto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;

          // Try candidate storage buckets
          const candidateBuckets = ['motos', 'Motos', 'images', 'uploads', 'vehicles', 'public', 'motoluv'];
          let uploadedPublicUrl: string | null = null;
          let activeBucket = '';

          for (const bName of candidateBuckets) {
            try {
              const uploadResult = await supabaseServer.storage
                .from(bName)
                .upload(supabaseFileName, fileBuffer, {
                  contentType: req.file.mimetype,
                  upsert: true,
                });

              if (!uploadResult.error && uploadResult.data) {
                const { data: publicUrlData } = supabaseServer.storage
                  .from(bName)
                  .getPublicUrl(supabaseFileName);

                if (publicUrlData && publicUrlData.publicUrl) {
                  uploadedPublicUrl = publicUrlData.publicUrl;
                  activeBucket = bName;
                  break;
                }
              }
            } catch {
              // continue to next bucket
            }
          }

          if (uploadedPublicUrl) {
            return res.json({
              url: uploadedPublicUrl,
              filename: supabaseFileName,
              provider: 'supabase',
              bucket: activeBucket,
            });
          }
        } catch (supabaseUploadErr: any) {
          console.warn('Supabase Storage exception, using local upload:', supabaseUploadErr?.message);
        }
      }

      return res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename, provider: 'local' });
    });
  });

  // Stripe Payment Routes
  api.get('/stripe/config', (_req, res) => {
    return res.json({
      publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
      hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    });
  });

  api.post('/stripe/create-payment-intent', async (req, res) => {
    try {
      const { amount, currency = 'mxn', items = [], metadata = {}, customerEmail } = req.body;
      const stripe = getStripe();

      if (stripe) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // in cents
          currency: currency.toLowerCase(),
          receipt_email: customerEmail || undefined,
          metadata: {
            app: 'motoluv',
            itemsCount: String(items.length),
            ...metadata,
          },
          automatic_payment_methods: { enabled: true },
        });

        return res.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          isLive: true,
        });
      }

      // Fallback mode when STRIPE_SECRET_KEY is not configured
      const mockId = `pi_mock_${Math.random().toString(36).slice(2, 14)}`;
      return res.json({
        clientSecret: `${mockId}_secret_${Math.random().toString(36).slice(2, 10)}`,
        paymentIntentId: mockId,
        isLive: false,
        message: 'Modo de prueba Stripe simulado activo. Para pagos en producción en vivo, configura STRIPE_SECRET_KEY en las variables de entorno.',
      });
    } catch (err: any) {
      console.error('Error creating Stripe Payment Intent:', err);
      return res.status(500).json({ detail: err.message || 'Error al conectar con Stripe' });
    }
  });

  api.post('/stripe/create-checkout-session', async (req, res) => {
    try {
      const { items = [], successUrl, cancelUrl, customerEmail } = req.body;
      const stripe = getStripe();

      if (stripe) {
        const lineItems = items.map((item: any) => ({
          price_data: {
            currency: 'mxn',
            product_data: {
              name: item.name,
              description: `${item.brand || 'Motoluv'} - ${item.category || 'Accesorio'}`,
              images: item.image ? [item.image] : [],
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity || 1,
        }));

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          customer_email: customerEmail || undefined,
          success_url: successUrl || `${req.headers.origin}/tienda?status=success`,
          cancel_url: cancelUrl || `${req.headers.origin}/tienda?status=cancel`,
        });

        return res.json({ url: session.url, sessionId: session.id, isLive: true });
      }

      // Fallback
      return res.json({
        url: null,
        sessionId: `cs_mock_${Date.now()}`,
        isLive: false,
        message: 'Modo de simulación Stripe activo.',
      });
    } catch (err: any) {
      console.error('Error creating Stripe Checkout session:', err);
      return res.status(500).json({ detail: err.message || 'Error al iniciar Checkout de Stripe' });
    }
  });

  api.post('/stripe/process-order', (req, res) => {
    const { items, totalAmount, shippingAddress, customerInfo, paymentIntentId } = req.body;
    const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = {
      orderId,
      items: items || [],
      totalAmount: totalAmount || 0,
      shippingAddress: shippingAddress || {},
      customerInfo: customerInfo || {},
      paymentIntentId: paymentIntentId || `pi_sim_${Date.now()}`,
      status: 'Paid',
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 3 * 86400000).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    return res.json({ success: true, order });
  });

  // Clip Payment Routes
  api.get('/clip/config', (_req, res) => {
    return res.json({
      hasClipKey: Boolean(process.env.CLIP_API_KEY || process.env.CLIP_SECRET_KEY),
      publicKey: process.env.VITE_CLIP_PUBLIC_KEY || '',
      provider: 'Clip México',
      supportedMethods: ['Tarjeta de Crédito / Débito', 'Clip QR', 'Link de Pago Clip'],
    });
  });

  api.post('/clip/create-payment-request', async (req, res) => {
    try {
      const { amount, description, customerEmail, customerName, isApartado, motoId, items = [] } = req.body;
      const clipReference = `CLIP-${isApartado ? 'MOTO' : 'STORE'}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Build Clip Checkout URL or Token
      const clipPayload = {
        amount: Number(amount) || 3000,
        currency: 'MXN',
        purchase_description: description || (isApartado ? 'Apartado de Motocicleta Motoluv' : 'Compra de Accesorios Motoluv'),
        redirection_url: {
          success: `${req.headers.origin || 'http://localhost:3000'}/panel?clip_status=success&ref=${clipReference}`,
          error: `${req.headers.origin || 'http://localhost:3000'}/panel?clip_status=error&ref=${clipReference}`,
          default: `${req.headers.origin || 'http://localhost:3000'}/panel`,
        },
        metadata: {
          clipReference,
          customerEmail,
          customerName,
          isApartado: Boolean(isApartado),
          motoId,
          itemsCount: items.length,
        },
      };

      // Trigger n8n webhook automation for initiated Clip transaction
      triggerN8nHubspotWebhook('payment.clip_initiated', {
        clipReference,
        amount,
        customerEmail,
        customerName,
        isApartado,
        motoId,
      });

      return res.json({
        success: true,
        clipReference,
        amount: Number(amount),
        currency: 'MXN',
        paymentUrl: `https://pay.clip.mx/${clipReference}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://pay.clip.mx/${clipReference}`,
        status: 'PENDING_PAYMENT',
      });
    } catch (err: any) {
      console.error('Error creating Clip payment request:', err);
      return res.status(500).json({ detail: err.message || 'Error al conectar con Clip México' });
    }
  });

  api.post('/clip/process-checkout', (req, res) => {
    const { amount, items, shippingAddress, customerInfo, clipReference, isApartado, motoId } = req.body;
    const orderId = `CLIP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Update motorcycle status if it was an apartado
    if (isApartado && motoId) {
      const moto = db.motos.get(motoId);
      if (moto) {
        moto.status = 'Apartada';
        triggerN8nHubspotWebhook('card.status_updated', {
          cardId: `card_${moto.id}`,
          title: `${moto.brand} ${moto.model}`,
          status: 'Apartada',
          userEmail: customerInfo?.email,
          motoId: moto.id,
        });
      }
    }

    const order = {
      orderId,
      clipReference: clipReference || `clip_ref_${Date.now()}`,
      items: items || [],
      totalAmount: amount || 0,
      paymentMethod: 'Clip México',
      shippingAddress: shippingAddress || {},
      customerInfo: customerInfo || {},
      status: 'Paid',
      createdAt: new Date().toISOString(),
      estimatedDelivery: '24 a 48 horas hábiles con Clip',
    };

    triggerN8nHubspotWebhook('payment.clip_completed', order);

    return res.json({ success: true, order });
  });

  // Webhooks Endpoints for HubSpot & n8n Sync
  api.post('/webhooks/hubspot/user-register', async (req, res) => {
    const payload = req.body;
    const result = await triggerN8nHubspotWebhook('user.registered', payload);
    return res.json({ success: true, synced: true, payload: result });
  });

  api.post('/webhooks/hubspot/status-card', async (req, res) => {
    const { cardId, title, status, userId, userEmail, motoId, details } = req.body;
    const result = await triggerN8nHubspotWebhook('card.status_updated', {
      cardId, title, status, userId, userEmail, motoId, details,
    });
    return res.json({ success: true, synced: true, payload: result });
  });

  // Partners Route
  api.post('/partners', (req, res) => {
    const { name, position, company_name, category, phone, email, message } = req.body;
    const id = `partner_${Math.random().toString(36).slice(2, 10)}`;
    const appDoc: PartnerApp = {
      id,
      name,
      phone,
      location: category || 'socio',
      email,
      message: `[${position || 'Contacto'} - ${company_name || 'Empresa'}] ${message || ''}`,
      created_at: new Date().toISOString(),
      status: 'pending',
    };
    db.partners.set(id, appDoc);
    return res.json({ ok: true, id });
  });

  // Lu Chatbot Route
  api.post('/chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ detail: 'Mensaje requerido' });
      }

      // Security check: Block attempts to retrieve confidential user data
      const lower = message.toLowerCase();
      if (
        lower.includes('clabe') ||
        lower.includes('contraseña') ||
        lower.includes('password') ||
        lower.includes('jwt') ||
        lower.includes('token') ||
        lower.includes('cuenta bancaria') ||
        lower.includes('tarjeta') ||
        lower.includes('cvv') ||
        lower.includes('secret')
      ) {
        return res.json({
          reply: 'Por políticas de privacidad y estricta seguridad, jamás puedo solicitar ni compartir información confidencial como números CLABE, contraseñas o datos de pago. 🔒 Si necesitas asistencia con tu cuenta, escribe a contacto@motoluv.mx',
          confidentialBlocked: true,
        });
      }

      // Prepare context of Motoluv
      const activeMotos = Array.from(db.motos.values())
        .filter((m) => m.status === 'PUBLICADA')
        .map((m) => `• ${m.brand} ${m.model} (${m.year}) | ${m.km.toLocaleString()} km | Score: ${m.score}/10 | Ubicación: ${m.city}`);

      const systemPrompt = `Eres "Lu", el asistente virtual oficial de Motoluv.
Tu tono es amable, apasionado por las motos, servicial y profesional. NUNCA te autodefinas ni menciones la palabra "mascota" ni "IA". Preséntate siempre simplemente como Lu, el asistente oficial de Motoluv.

REGLAS ESTRICTAS DE RESPUESTA:
1. EVITA TOTALMENTE HABLAR DE COSTOS, PRECIOS, COMISIONES O CIFRAS MONETARIAS EN EL CHAT.
   - Si el usuario te pregunta por precios, costos de paquetes, comisiones o tarifas, explica los beneficios y el alcance de las inspecciones o servicios de Motoluv sin mencionar montos ni números en pesos/dólares, e invítalo a revisar los detalles directamente en la plataforma o catálogo.
2. Jamás reveles o solicites información confidencial de usuarios (cuentas bancarias, contraseñas, datos personales privados, etc.).
3. NUNCA incluyas rutas técnicas, URLs o slashes como /motos, /tienda, /sumate en tus respuestas. Refiérete siempre a las secciones por su nombre natural (Catálogo de motocicletas, Tienda oficial de accesorios, Red de Socios).

INFORMACIÓN DEL SITIO MOTOLUV:
- Qué es Motoluv: El marketplace más seguro de compra y venta de motocicletas seminuevas en México.
- Eslogan: SUBE · CONECTA · RUEDA.
- Protección y Transparencia: Motoluv resguarda la operación con transacciones y pagos verificados hasta que se complete la inspección y entrega.
- Paquetes de Servicio (describe solo beneficios, sin montos ni costos):
  1. Básico: Inspección técnica mecánica con Score de 100 puntos y contrato digital.
  2. Plus: Básico + custodia segura de pago y validación de documentos.
  3. Total: Plus + gestión integral de trámites y traslado logístico entre centros autorizados.
- Red de Socios ("Súmate a nuestra red"): Talleres mecánicos, tiendas de accesorios, agencias de motocicletas, financieras y organizadores de eventos pueden registrarse en la sección de aliados y socios.
- Inventario actual de motocicletas disponibles:
${activeMotos.slice(0, 10).join('\n')}

- Tienda de equipamiento oficial:
Cascos de marcas reconocidas, chaquetas con armadura, guantes tácticos, intercomunicadores y accesorios.

Responde siempre en español, de forma concisa, clara y amigable con emojis acordes (🏍️, 🐾, ⚡, 🛡️).`;

      const ai = getAIInstance();
      if (ai) {
        try {
          const contents: any[] = [];
          if (Array.isArray(history)) {
            for (const h of history) {
              if (h && h.content) {
                contents.push({
                  role: h.role === 'user' ? 'user' : 'model',
                  parts: [{ text: String(h.content) }],
                });
              }
            }
          }
          contents.push({
            role: 'user',
            parts: [{ text: message }],
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents,
            config: {
              systemInstruction: systemPrompt,
            },
          });

          const replyText = response.text || '¡Hola! Soy Lu 🐾. ¿En qué puedo ayudarte hoy sobre motos o accesorios en Motoluv?';
          return res.json({ reply: replyText });
        } catch (geminiErr: any) {
          console.error('Gemini API execution error:', geminiErr?.message || geminiErr);
          // Fall through to fallback responses if Gemini fails
        }
      }

      // Smart fallback response generator when AI key is absent or pending
      let fallback = '';
      if (lower.includes('hola') || lower.includes('saludos') || lower.includes('buenos')) {
        fallback = '¡Hola, Biker! 🐾 Soy Lu, el asistente virtual de Motoluv. ¿Buscas comprar una moto, equiparte en la tienda o registrar tu negocio en nuestra red de aliados? Cuéntame y con gusto te asesoro. 🏍️';
      } else if (lower.includes('moto') || lower.includes('comprar') || lower.includes('catálogo') || lower.includes('catalogo')) {
        fallback = `En Motoluv contamos con un catálogo certificado con score de 100 puntos 🏁. Algunas opciones disponibles hoy:\n\n${activeMotos.slice(0, 3).join('\n')}\n\nPuedes consultar el inventario completo en el Catálogo de motocicletas.`;
      } else if (lower.includes('accesorio') || lower.includes('casco') || lower.includes('tienda') || lower.includes('chaqueta')) {
        fallback = 'En nuestra Tienda Oficial de equipamiento encontrarás cascos certificados, chaquetas con protección, guantes y accesorios de alta calidad 🛡️.';
      } else if (lower.includes('red') || lower.includes('sumate') || lower.includes('socio') || lower.includes('taller') || lower.includes('agencia') || lower.includes('financiera') || lower.includes('evento')) {
        fallback = '¡Súmate a nuestra red! 🤝 Si tienes un taller, tienda de accesorios, agencia de motocicletas, financiera u organizas eventos, ingresa a la sección de aliados para registrar tus datos y conectarte con miles de motociclistas.';
      } else if (lower.includes('paquete') || lower.includes('inspeccion') || lower.includes('inspección') || lower.includes('seguro') || lower.includes('precio') || lower.includes('costo') || lower.includes('tarifa') || lower.includes('comision') || lower.includes('comisión')) {
        fallback = 'En Motoluv tu compra está 100% protegida con transacciones verificadas 🔒. Contamos con paquetes diseñados a tu medida:\n\n• Básico: Inspección mecánica de 100 puntos y contrato digital.\n• Plus: Inspección + custodia segura de pago y validación documental.\n• Total: Cobertura Plus + gestión integral de trámites y traslado logístico entre centros autorizados.\n\nPuedes consultar todos los detalles al gestionar tu compra o publicación.';
      } else {
        fallback = '¡Con gusto te oriento! 🐾 En Motoluv puedes comprar o vender motos seminuevas certificadas, adquirir accesorios o sumar tu taller o negocio a nuestra red de aliados. ¿Qué te gustaría consultar?';
      }

      return res.json({ reply: fallback });
    } catch (err: any) {
      console.error('Chat API Error:', err);
      return res.json({
        reply: '¡Ups! Ocurrió un pequeño inconveniente en el camino ⚡. Pero puedes explorar nuestro catálogo de motos o equiparte en la tienda oficial.',
      });
    }
  });

  // Seed Route
  api.post('/seed', (_req, res) => {
    seedDatabase();
    return res.json({ ok: true, seeded: db.motos.size });
  });

  // Mount API router with both /api and root fallback for Vercel serverless functions
  app.use('/api', api);
  app.use(api);

  async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server listening on http://0.0.0.0:${PORT}`);
      });
    }
  }

  if (!process.env.VERCEL) {
    startServer().catch((err) => {
      console.error('Failed to start server:', err);
    });
  }

  export default app;
