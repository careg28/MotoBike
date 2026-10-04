import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type TermsSection = {
  title: string;
  paragraphs: string[];
};

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms.html',
  styleUrl: './terms.scss'
})
export class Terms {
  readonly intro = [
    'A continuacion, se recogen las condiciones generales del contrato de alquiler de vehiculo celebrado entre Felix Enrique Mago Rodrigues (en adelante FEO\'S Renta Bike) y el CLIENTE.',
    'El cliente declara que ha leido, comprendido y aceptado integramente todas las condiciones del presente documento, asi como las condiciones especificas indicadas en el presente contrato, firmando ambas partes en senal de conformidad al momento de la entrega del vehiculo.',
    'Las presentes condiciones generales forman parte integrante del contrato de alquiler, obligando a ambas partes desde el momento de su firma.'
  ];

  readonly sections: TermsSection[] = [
    {
      title: 'ARTICULO 1. UTILIZACION Y ESTADO DEL VEHICULO',
      paragraphs: [
        '1.1 El cliente recibe el vehiculo descrito en el anverso del contrato, en perfectas condiciones de funcionamiento, con sus documentos, neumaticos y accesorios (casco, combustible, llaveros, etc.) y se compromete a conservarlos y conducir el vehiculo cumpliendo las normas del Codigo de circulacion y conforme a las especificaciones de uso del tipo de Vehiculo expuestas en www.feosvalencia.com.',
        '1.2 Los danos provocados en el vehiculo alquilado seran pagados de conformidad con la lista de danos expuesta en www.feosvalencia.com, que sera explicada en el momento de la entrega de la motocicleta.',
        '1.3 Queda prohibido variar cualquier caracteristica tecnica del vehiculo, llaves, equipamiento, herramientas o accesorios, asi como modificar su aspecto exterior o interior salvo autorizacion escrita de FEO\'S Renta Bike. Se cobraran 15 EUR por cada pegatina corporativa faltante o por cada elemento decorativo ajeno a la empresa.',
        '1.4 Solo podran conducir las personas identificadas y aceptadas por FEO\'S Renta Bike en el contrato o anexos, siempre que tengan minimo 21 anos, al menos dos anos de experiencia para vehiculos de mas de 50 cc y permiso de conducir valido y en vigor.',
        '1.5 El vehiculo podra circular dentro del territorio espanol, quedando prohibido salir de la Comunidad Valenciana salvo autorizacion expresa por escrito. La asistencia en carretera cubre hasta 100 km desde el punto de entrega.',
        '1.6 No esta permitido transportar el vehiculo en barco, tren, camion o avion salvo autorizacion expresa por escrito. La asistencia fuera del radio cubierto correra a cargo del cliente.',
        '1.7 Los perjuicios que pudiera sufrir el vehiculo, FEO\'S Renta Bike o terceros por incumplimiento del contrato autorizan a la empresa a retirar el vehiculo y a facturar los importes derivados, previa comunicacion por escrito con 5 dias de antelacion.',
        '1.8 Queda prohibido usar el vehiculo para transporte remunerado, mercancias peligrosas, exceso de pasajeros, remolque, competiciones, conduccion bajo alcohol o drogas, uso por personas sin permiso, clases de conduccion, cesion o subarriendo, salida del pais de matriculacion o cualquier actividad ilicita.',
        '1.9 El arrendatario no podra ceder, hipotecar, pignorar, vender o dar en garantia la motocicleta, contrato, llaves, documentacion, equipamiento, herramientas, accesorios o piezas del vehiculo.',
        '1.10 El cliente declara tener la experiencia necesaria para la conduccion de motocicletas de 125cc y se compromete a conducir de forma responsable y prudente.'
      ]
    },
    {
      title: 'ARTICULO 2. PRECIO, DURACION Y PRORROGA DE ALQUILER',
      paragraphs: [
        '2.1 El precio del alquiler es el expresado en el contrato y se establece en funcion de la Tarifa General Vigente, servicios, impuestos y tasas, asi como del precio inicial pactado con el cliente.',
        '2.2 Salvo indicacion contraria, el precio del alquiler incluye el seguro de responsabilidad civil obligatoria del vehiculo.',
        '2.3 En la firma del contrato, el cliente pagara la fianza reflejada en el mismo como garantia del cumplimiento de sus obligaciones. Si el vehiculo se devuelve correctamente y no hay importes pendientes, FEO\'S Renta Bike devolvera la fianza.',
        '2.4 La devolucion de la fianza podra realizarse a la misma tarjeta, por PayPal o transferencia bancaria. La recepcion efectiva puede demorarse segun la entidad bancaria o pais del cliente, y los gastos de transferencia corren a cargo del cliente.',
        '2.5 La fianza no servira en ningun caso para una prorroga del alquiler. Cualquier extension requiere autorizacion expresa, pago inmediato y, en su caso, conversion del contrato.',
        '2.6 El cliente se compromete a devolver el vehiculo en la fecha, hora y lugar pactados. No se devolvera dinero por devolucion anticipada. El cambio de lugar de entrega supone un cargo adicional de 50 EUR. Un retraso conllevara una multa de 50 EUR mas el importe de los dias de retraso.',
        '2.7 El servicio solo se considera terminado cuando el vehiculo y las llaves han sido entregados a FEO\'S Renta Bike en el horario y condiciones estipulados.'
      ]
    },
    {
      title: 'ARTICULO 3. PAGOS',
      paragraphs: [
        '3.1 El cliente se compromete a pagar la fianza, el importe del alquiler y servicios complementarios, las multas o sanciones derivadas de su uso, 30 EUR por gestiones administrativas en caso de multa, 50 EUR por recuperacion del vehiculo en deposito municipal y cualquier importe derivado de perjuicios causados a terceros o a FEO\'S Renta Bike.',
        '3.2 Si el cliente no satisface estos importes, FEO\'S Renta Bike podra retenerlos de la fianza y, si no fuera suficiente, cargarlos en su tarjeta o reclamarlos por via judicial o extrajudicial.',
        '3.3 Con la firma del contrato, el cliente autoriza expresamente el cobro directo de estos importes en su cuenta o tarjeta de credito.',
        '3.4 El cliente esta obligado a llevar siempre consigo una copia del contrato de alquiler.'
      ]
    },
    {
      title: 'ARTICULO 4. SEGUROS DE VEHICULO OBLIGATORIO, ROBO, PERDIDA Y DANOS EN EL PROPIO VEHICULO',
      paragraphs: [
        '4.1 El precio del alquiler incluye el seguro obligatorio de responsabilidad civil frente a terceros y pasajeros. No incluye robo, perdida total o parcial, danos en el propio vehiculo, equipaje, objetos personales o danos personales.',
        '4.2 Los accesorios y extras contratados no estan cubiertos por el seguro, y su perdida o dano sera cobrado al cliente segun el listado general publicado en www.feosvalencia.com.',
        '4.3 En caso de perdida de llaves, error en el repostaje o pinchazo, el cliente debe llamar al numero telefonico indicado en el dorso del contrato.',
        '4.4 En caso de accidente o averia, FEO\'S Renta Bike podra entregar un vehiculo de sustitucion a su libre criterio. No habra derecho a sustitucion si el accidente o averia son imputables al cliente.',
        '4.5 FEO\'S Renta Bike se reserva el derecho de cancelar el contrato en caso de incumplimiento o por motivos de seguridad del vehiculo.',
        '4.6 El vehiculo dispone de un sistema de geolocalizacion GPS con fines de seguridad, control y prevencion de robo, cuyo uso el cliente autoriza expresamente.',
        '4.7 El cliente sera responsable de todos los danos ocasionados al vehiculo durante el alquiler cuando deriven de negligencia, conduccion imprudente, incumplimiento del contrato o uso indebido.'
      ]
    },
    {
      title: 'ARTICULO 5. PERDIDA O ROBO DE LA MOTOCICLETA',
      paragraphs: [
        '5.1 En caso de robo o perdida del vehiculo, el cliente debe presentar en tienda las llaves y la denuncia correspondiente. En caso contrario, se cobrara una penalizacion de 250 EUR.',
        '5.2 En caso de robo o perdida total o parcial, el arrendatario notificara inmediatamente al arrendador, colaborara con la investigacion y sera responsable del valor de mercado del vehiculo o de los gastos de revision, reparacion y lucro cesante si la moto es recuperada.'
      ]
    },
    {
      title: 'ARTICULO 6. DANOS DE LOS OCUPANTES Y DE SUS BIENES',
      paragraphs: [
        'El arrendatario y su ocupante eximen al arrendador de toda responsabilidad por danos fisicos o materiales derivados del uso normal o anormal de la motocicleta. Declaran conocer los riesgos propios de este tipo de vehiculo y se comprometen a utilizar siempre casco homologado y el equipamiento reglamentario.'
      ]
    },
    {
      title: 'ARTICULO 7. ASISTENCIA',
      paragraphs: [
        '7.1 Si el vehiculo no puede continuar o no arranca, el cliente debe llamar a la compania de asistencia concertada por FEO\'S Renta Bike.',
        '7.2 La asistencia esta incluida hasta 100 km desde el punto de entrega. Fuera de ese radio, el coste correra a cargo del cliente. El cliente no debe abandonar el vehiculo hasta la llegada de la grua.',
        '7.3 Se cobraran 50 EUR por uso indebido del servicio de asistencia, incluyendo perdida o rotura de llaves o cascos, falta de combustible, repostaje incorrecto, rescates en lugares no aptos o cualquier negligencia o mal uso.'
      ]
    },
    {
      title: 'ARTICULO 8. COMBUSTIBLES',
      paragraphs: [
        '8.1 El combustible consumido durante el alquiler corre a cargo del cliente.',
        '8.2 El cliente debera repostar con el tipo de combustible adecuado, respondiendo de los gastos ocasionados por uso incorrecto.',
        '8.3 El vehiculo debe devolverse con el mismo nivel de combustible con el que fue entregado. En caso contrario, se facturara el combustible faltante mas un cargo adicional de 10 EUR por servicio de repostaje.'
      ]
    },
    {
      title: 'ARTICULO 9. MANTENIMIENTO Y REPARACIONES. ACCIDENTE',
      paragraphs: [
        '9.1 El cliente no esta autorizado a ordenar reparaciones salvo autorizacion expresa de FEO\'S Renta Bike.',
        '9.2 El cliente debe detener el vehiculo cuando detecte una anomalia y contactar con FEO\'S Renta Bike o con la compania de asistencia.',
        '9.3 En caso de accidente, el cliente debera enviar por WhatsApp o por correo a info@feosvalencia.com la declaracion amistosa y una explicacion de lo ocurrido en un plazo maximo de 24 horas y siempre antes del final del alquiler.',
        '9.4 La no entrega, entrega incompleta o ilegible de la documentacion del accidente implicara un cargo minimo de 250 EUR y la retencion de la fianza hasta aclarar la responsabilidad.',
        '9.5 Si el vehiculo queda inhabilitado para una conduccion segura, FEO\'S Renta Bike lo retendra hasta finalizar los tramites de peritaje.'
      ]
    },
    {
      title: 'ARTICULO 10. MODIFICACIONES DEL CONTRATO DE ALQUILER',
      paragraphs: [
        '10.1 Las presentes condiciones generales y el resto de clausulas del contrato solo podran modificarse mediante acuerdo escrito firmado por ambas partes.'
      ]
    },
    {
      title: 'ARTICULO 11. LOPD',
      paragraphs: [
        '11.1 Los datos incorporados al contrato forman parte del archivo de clientes cuyo responsable es Felix Enrique Mago Rodrigues. El cliente podra ejercer sus derechos de acceso, rectificacion, oposicion, limitacion, portabilidad o cancelacion escribiendo a info@feosvalencia.com con el asunto: "RGPD, Derechos afectado", adjuntando copia de su DNI o medio analogo en derecho.',
        '11.2 FEO\'S Renta Bike podra consultar ficheros de solvencia patrimonial y de credito y, en caso de impago, comunicar los datos a ficheros relativos al incumplimiento de obligaciones dinerarias conforme a la normativa vigente.'
      ]
    },
    {
      title: 'ARTICULO 12. LEGISLACION Y JURISDICCION APLICABLES',
      paragraphs: [
        '12.1 El presente contrato se regira e interpretara de acuerdo con las leyes espanolas.',
        '12.2 Las cuestiones que se susciten con motivo de este contrato entre FEO\'S Renta Bike y el cliente seran competencia de los tribunales y juzgados espanoles correspondientes a la ciudad donde se firmo el contrato, a los que ambas partes se someten.',
        'El cliente declara haber recibido el vehiculo en buen estado y haber leido, comprendido y aceptado integramente todas las condiciones del presente contrato.'
      ]
    },
  ];
}
