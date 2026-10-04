import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type CookiesSection = {
  title: string;
  paragraphs: string[];
};

@Component({
  selector: 'app-cookies-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookies.html',
  styleUrl: './cookies.scss'
})
export class CookiesPolicy {
  readonly intro = [
    'En cumplimiento de la normativa aplicable sobre servicios de la sociedad de la informacion y proteccion de datos, se informa a los usuarios de https://feosvalencia.com sobre el uso de cookies en esta pagina web.'
  ];

  readonly sections: CookiesSection[] = [
    {
      title: '1. QUE SON LAS COOKIES',
      paragraphs: [
        'Las cookies son pequenos archivos de texto que se almacenan en el dispositivo del usuario cuando visita una pagina web. Su finalidad puede ser reconocer al usuario, recordar sus preferencias, mejorar la experiencia de navegacion, permitir determinadas funcionalidades tecnicas o recopilar informacion estadistica sobre el uso del sitio web.'
      ]
    },
    {
      title: '2. QUIEN ES EL RESPONSABLE',
      paragraphs: [
        'Responsable: Felix Enrique Mago Rodrigues.',
        'Nombre comercial: FEO\'S Renta Bike.',
        'Correo electronico de contacto: info@feosvalencia.com.',
        'Sitio web: https://feosvalencia.com.'
      ]
    },
    {
      title: '3. QUE TIPOS DE COOKIES UTILIZA ESTA WEB',
      paragraphs: [
        'Este sitio web puede utilizar cookies tecnicas o necesarias, cookies de personalizacion, cookies de analisis o medicion y, en su caso, cookies de terceros si se integran servicios externos.',
        'Las cookies tecnicas son imprescindibles para el funcionamiento basico del sitio. Las de personalizacion permiten recordar preferencias como el idioma. Las de analisis sirven para estudiar el uso de la web y mejorarla. Las de terceros pueden instalarse cuando se utilizan servicios externos como mapas, videos, pasarelas de pago o herramientas de analitica.'
      ]
    },
    {
      title: '4. FINALIDAD DE LAS COOKIES',
      paragraphs: [
        'Las cookies empleadas en esta web pueden utilizarse para permitir el funcionamiento tecnico de la pagina, recordar preferencias del usuario, gestionar sesiones, mejorar la experiencia de navegacion, analizar el uso del sitio y garantizar su seguridad y correcto funcionamiento.'
      ]
    },
    {
      title: '5. BASE LEGAL PARA EL USO DE COOKIES',
      paragraphs: [
        'La base legal para el uso de cookies tecnicas o necesarias es el interes legitimo del responsable en permitir el funcionamiento correcto del sitio web.',
        'La base legal para el uso de cookies de analisis, personalizacion no necesarias o cualquier otra cookie no tecnica sera el consentimiento del usuario cuando resulte legalmente exigible.'
      ]
    },
    {
      title: '6. COMO PUEDE EL USUARIO CONFIGURAR O DESACTIVAR LAS COOKIES',
      paragraphs: [
        'El usuario puede permitir, bloquear o eliminar las cookies instaladas en su dispositivo mediante la configuracion de las opciones del navegador utilizado.',
        'La desactivacion de determinadas cookies puede afectar al correcto funcionamiento de algunas partes del sitio web.'
      ]
    },
    {
      title: '7. COOKIES DE TERCEROS',
      paragraphs: [
        'En caso de utilizar servicios de terceros, como herramientas de analisis, mapas, videos incrustados, pasarelas de pago o redes sociales, dichos terceros pueden instalar sus propias cookies. FEO\'S Renta Bike no controla las cookies gestionadas por terceros, por lo que se recomienda consultar las politicas especificas de dichos proveedores.'
      ]
    },
    {
      title: '8. PLAZO DE CONSERVACION',
      paragraphs: [
        'Las cookies pueden permanecer en el dispositivo del usuario durante un periodo variable. Las cookies de sesion se eliminan al cerrar el navegador. Las cookies persistentes permanecen durante un periodo determinado o hasta que el usuario las elimine manualmente.'
      ]
    },
    {
      title: '9. ACTUALIZACIONES Y CAMBIOS EN LA POLITICA DE COOKIES',
      paragraphs: [
        'FEO\'S Renta Bike podra modificar la presente Politica de Cookies en cualquier momento para adaptarla a cambios legislativos, tecnicos o funcionales del sitio web. Se recomienda al usuario revisarla periodicamente.'
      ]
    },
    {
      title: '10. MAS INFORMACION',
      paragraphs: [
        'Si el usuario desea obtener mas informacion sobre el uso de cookies en este sitio web, puede escribir a info@feosvalencia.com.'
      ]
    }
  ];
}
