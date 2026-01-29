import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/auth.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Always reset form when navigating to login page
    this.loginForm.reset();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    try {
      if (this.loginForm.invalid) {
        this.showToast('Please fill in all required fields', 'danger');
        return;
      }

      const loading = await this.loadingController.create({
        message: 'Logging in...',
        spinner: 'crescent'
      });
      await loading.present();

      const credentials: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.authService.login(credentials).subscribe({
      next: async (response) => {
        try {
          // Store email in user info if not already present
          const userInfo = this.authService.getUserInfo();
          if (userInfo && !userInfo.email && credentials.email) {
            userInfo.email = credentials.email;
            localStorage.setItem('user_info', JSON.stringify(userInfo));
          }
          
          // Dismiss loading first
          await loading.dismiss();
          
          // Navigate immediately using router
          this.router.navigate(['/home'], { replaceUrl: true }).then(
            (success) => {
              if (success) {
                console.log('Navigation successful');
                // Show toast after navigation
                setTimeout(() => {
                  this.showToast('Login successful!', 'success');
                }, 300);
              } else {
                console.log('Navigation returned false, using fallback');
                window.location.href = '/home';
              }
            },
            (error) => {
              console.error('Navigation error:', error);
              // Fallback: use window location if router fails
              window.location.href = '/home';
            }
          );
        } catch (error) {
          console.error('Error in login success handler:', error);
          await loading.dismiss();
          // Still try to navigate even if there's an error
          this.router.navigate(['/home'], { replaceUrl: true }).catch(() => {
            window.location.href = '/home';
          });
        }
      },
        error: async (error) => {
          try {
            await loading.dismiss();
            const errorMessage = this.getLoginErrorMessage(error);
            this.showToast(errorMessage, 'danger');
            console.error('Login error:', {
              status: error?.status,
              statusText: error?.statusText,
              message: error?.message,
              backendError: error?.error,
              url: error?.url
            });
          } catch (err) {
            console.error('Error in login error handler:', err);
          }
        }
      });
    } catch (error) {
      console.error('Error in onSubmit:', error);
      // Silently handle extension-related errors
    }
  }

  /**
   * Derive a user-friendly message from the login HTTP error.
   */
  private getLoginErrorMessage(error: any): string {
    if (!error) return 'Login failed. Please try again.';
    const status = error.status;
    const backend = error.error;
    const backendMsg =
      (typeof backend === 'string' ? backend : null) ||
      backend?.message ||
      backend?.Message ||
      backend?.error ||
      backend?.Error;
    if (backendMsg) return backendMsg;
    switch (status) {
      case 0:
        return 'Cannot reach server. Check that the API is running at ' + (error.url || 'configured URL') + ' and CORS/SSL are correct.';
      case 400:
        return 'Invalid email or password.';
      case 401:
        return 'Invalid email or password.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Login endpoint not found. Check API URL and route (e.g. /api/Auth/login).';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.message || 'Login failed. Please try again.';
    }
  }

  async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

