import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    let url = request.url.trim();

    // Skip absolute URLs
    if (!url.startsWith('http')) {
      const lowerUrl = url.toLowerCase();

      // If the client URL already includes '/api/...', avoid duplicating the '/api' segment
      // because environment.apiUrl already ends with '/api'.
      if (lowerUrl.startsWith('/api/')) {
        url = `${environment.apiUrl}${url.substring(4)}`;
        request = request.clone({ url });
      } else if (
        url.startsWith('/Centers') ||
        url.startsWith('/Branches') ||
        url.startsWith('/Members') ||
        url.startsWith('/POCs')
      ) {
        url = `${environment.apiUrl}${url}`; // environment.apiUrl = 'https://localhost:61008/api'
        request = request.clone({ url });
      }
    }

    return next.handle(request);
  }
}
