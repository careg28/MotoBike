import { Moto } from './moto.model';

export const MODELS: Moto[] = [
  {
    id: 'vespa-primavera-125',
    name: 'Vespa Primavera 125',
    tag: 'Vespa 125',
    img: '/models/vespa-125.jpg',
    price: 32,
    specs: {
      motor: '125 cc',
      consumo: '2,2 L/100 km',
      velocidad: '95 km/h',
      deposito: '7 L',
      asiento: '2 plazas',
      baul: 'No',
      frenos: 'Disco / CBS',
      peso: '130 kg'
    },
    badges: ['Estilo clásico', 'Ciudad + playa']
  },
  {
    id: 'sym-symphony-125',
    name: 'SYM Symphony 125',
    tag: 'Symphony 125',
    img: '/models/symphony-125.jpg',
    price: 28,
    specs: {
      motor: '125 cc',
      consumo: '2,0 L/100 km',
      velocidad: '95 km/h',
      deposito: '6 L',
      asiento: '2 plazas',
      baul: 'Sí (28 L)',
      frenos: 'Disco / CBS',
      peso: '122 kg'
    },
    badges: ['Muy económica', 'Fácil de manejar']
  },
  {
    id: 'honda-pcx-125',
    name: 'Honda PCX 125',
    tag: 'Honda PCX 125',
    img: '/models/honda-125.jpg',
    price: 30,
    specs: {
      motor: '125 cc',
      consumo: '2,1 L/100 km',
      velocidad: '100 km/h',
      deposito: '8 L',
      asiento: '2 plazas',
      baul: 'Sí (30 L)',
      frenos: 'ABS',
      peso: '130 kg'
    },
    badges: ['Confort premium', 'ABS']
  }
];