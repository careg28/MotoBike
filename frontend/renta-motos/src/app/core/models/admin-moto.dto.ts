export type EstadoDto = 'disponible' | 'reservada' | 'mantenimiento' | 'retirada';

export interface AdminMotoDto {
  id: number;
  slug: string;
  marca: string;
  modelo: string;
  precio_dia: number | string;
  estado?: EstadoDto;
  asignada?: boolean;
  imagenes?: string[];
  matricula?: string;
}