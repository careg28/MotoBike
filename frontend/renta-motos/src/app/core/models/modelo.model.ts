export interface Modelo {
  id: number;
  slug: string;
  marca: string;
  nombre: string;
  categoria: 'scooter' | '125cc' | '250cc' | 'moto';
  precio_base: string;         
  deposito_sugerido?: string | null;
  specs?: Record<string, string | null>;
  badges?: string[];
  imagenes?: string[];
  descripcion?: string | null;
  created_at?: string;
  updated_at?: string;
}