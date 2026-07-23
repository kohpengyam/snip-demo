import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SnipLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SnipService {
  private http = inject(HttpClient);
  private api = 'http://localhost:3000';

  shorten(url: string): Observable<SnipLink> {
    return this.http.post<SnipLink>(`${this.api}/api/links`, { url });
  }

  list(): Observable<SnipLink[]> {
    return this.http.get<SnipLink[]>(`${this.api}/api/links`);
  }
}
