import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

@Injectable()
export class HttpJsonTranslateLoader implements TranslateLoader {
  // Ajusta el prefijo si usas /assets/i18n/ en vez de /i18n/
  private prefix = '/i18n/';
  private suffix = '.json';

  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get<any>(`${this.prefix}${lang}${this.suffix}`);
  }
}