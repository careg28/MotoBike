export interface Moto {
     id: string;
  name: string;
  tag: string;
  img: string;
  price: number;
  specs: {
    motor: string;
    consumo: string;
    velocidad: string;
    deposito: string;
    asiento: string;
    baul?: string;
    frenos?: string;
    peso?: string;
  };
  badges?: string[];
}
