export type Estado = 'disponible' | 'reservada' | 'mantenimiento' | 'retirada';

export interface AdminMotoVM {
  id: number;
  slug: string;
  display: string;      // "Marca Modelo"
  precio: number;
  estado: Estado;
  asignada: boolean;
  img: string | null;
  matricula: string | null;
}