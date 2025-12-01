import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../enviroments/enviroment';

export type User = { id: number; name?: string; email: string };

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private readonly TOKEN_KEY = 'feos_token';

  isAuthenticated$ = new BehaviorSubject<boolean>(!!this.token);
  currentUser = signal<User | null>(null);

  get token(): string | null { return localStorage.getItem(this.TOKEN_KEY); }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: any }>(`${environment.apiUrl}/login`, { email, password })
      .pipe(tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        this.isAuthenticated$.next(true);
      }));
  }

  fetchMe() {
    return this.http.get<User>(`${environment.apiUrl}/me`).pipe(
      tap(u => this.currentUser.set(u))
    );
  }

  logout() {
    const t = this.token;
    if (t) this.http.post(`${environment.apiUrl}/logout`, {}).subscribe({ next:()=>{}, error:()=>{} });
    localStorage.removeItem(this.TOKEN_KEY);
    this.isAuthenticated$.next(false);
    this.currentUser.set(null);
  }
}