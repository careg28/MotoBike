import { AdminMotoDto } from '../models/admin-moto.dto';
import { AdminMotoVM, Estado } from './admin-moto.vm';
import type { Moto as CatalogMoto } from '../../features/models/moto.model';

export function toAdminVM(x: AdminMotoDto): AdminMotoVM {
  return {
    id: x.id,
    slug: x.slug,
    display: `${x.marca} ${x.modelo}`.trim(),
    precio: Number(x.precio_dia ?? 0),
    estado: (x.estado ?? 'disponible') as Estado,
    asignada: !!x.asignada,
    img: x.imagenes?.[0] ?? null,
    matricula: x.matricula ?? null,
  };
}

export const mapAdminMotos = (arr?: AdminMotoDto[] | null) => (arr ?? []).map(toAdminVM);

// ⚠️ Fallback: tus MODELS públicos -> VM admin (sin matrícula/estado/asignada reales)
export function fromCatalogMoto(m: CatalogMoto, i = 0): AdminMotoVM {
  return {
    id: i + 1,
    slug: m.id,
    display: m.name,
    precio: m.price,
    estado: 'disponible',
    asignada: false,
    img: m.img || null,
    matricula: null,
  };
}