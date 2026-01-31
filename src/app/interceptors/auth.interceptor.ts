import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.getToken();
    let authReq = req;
    if (token) {
      authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        // Log detailed error for debugging (status, body, message)
        try {
          console.error('HTTP Error:', {
            url: authReq.url,
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error
          });
        } catch (e) {
          console.error('HTTP Error (fallback):', err);
        }

        if (err && err.status === 401) {
          // On 401 clear auth and navigate to login
          this.auth.logout();
          try { this.router.navigate(['/login']); } catch (e) { /* ignore navigation errors */ }
        }
        return throwError(() => err);
      })
    );
  }
}
