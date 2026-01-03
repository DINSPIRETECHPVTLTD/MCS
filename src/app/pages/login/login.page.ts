import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService, LoginRequest } from '../../services/auth.service';

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
    // Check if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    } else {
      // Reset form when navigating to login page
      this.loginForm.reset();
    }
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
          await loading.dismiss();
          // Store email in user info if not already present
          const userInfo = this.authService.getUserInfo();
          if (userInfo && !userInfo.email && credentials.email) {
            userInfo.email = credentials.email;
            localStorage.setItem('user_info', JSON.stringify(userInfo));
          }
          this.showToast('Login successful!', 'success');
          // Navigate to home or dashboard
          this.router.navigate(['/home']);
        } catch (error) {
          console.error('Error in login success handler:', error);
          await loading.dismiss();
        }
      },
        error: async (error) => {
          try {
            await loading.dismiss();
            const errorMessage = error.error?.message || error.message || 'Login failed. Please try again.';
            this.showToast(errorMessage, 'danger');
            console.error('Login error:', error);
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

