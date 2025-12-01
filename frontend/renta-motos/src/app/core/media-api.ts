import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../enviroments/enviroment';

export interface MediaItem {
  id: number;
  original_name: string;
  filename: string;
  mime: string;
  size: number;
  path: string;
  url: string; // viene del accessor
}

@Injectable({ providedIn: 'root' })
export class MediaApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/media`;

  list(search = '', page = 1) {
    const params = new HttpParams({ fromObject: { search, page } as any });
    return this.http.get<{ data: MediaItem[]; current_page: number; last_page: number }>(this.base, { params });
  }

  upload(files: File[]) {
    const fd = new FormData();
    files.forEach(f => fd.append('files[]', f));
    return this.http.post<MediaItem[]>(this.base, fd);
  }

  remove(id: number) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
  }
}