import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  personCircleOutline, 
  addOutline, 
  peopleOutline, 
  callOutline, 
  locationOutline, 
  businessOutline, 
  checkmarkCircleOutline, 
  chevronDownOutline, 
  chevronUpOutline, 
  logOutOutline, 
  lockClosedOutline,
  closeOutline,
  checkmarkOutline
} from 'ionicons/icons';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register all icons used in the app
addIcons({
  'person-circle-outline': personCircleOutline,
  'add-outline': addOutline,
  'people-outline': peopleOutline,
  'call-outline': callOutline,
  'location-outline': locationOutline,
  'business-outline': businessOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'chevron-down-outline': chevronDownOutline,
  'chevron-up-outline': chevronUpOutline,
  'log-out-outline': logOutOutline,
  'lock-closed-outline': lockClosedOutline,
  'close-outline': closeOutline,
  'checkmark-outline': checkmarkOutline
});

ModuleRegistry.registerModules([ AllCommunityModule ]);

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

