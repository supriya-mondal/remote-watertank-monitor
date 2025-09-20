import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  refreshOutline,
  settingsOutline,
  timeOutline,
  waterOutline
} from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ConnectionStatusComponent } from '../components/connection-status/connection-status.component';
import { WaterTankComponent } from '../components/water-tank/water-tank.component';
import { ConnectionState } from '../models/api-models';
import { SettingsService } from '../services/settings.service';
import { WaterLevelService } from '../services/water-level.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    WaterTankComponent,
    ConnectionStatusComponent
  ],
})
export class HomePage implements OnInit, OnDestroy {
  // Component state
  connectionState: ConnectionState = ConnectionState.IDLE;
  currentWaterLevel: number | null = null;
  isChecking: boolean = false;
  errorMessage: string | null = null;
  lastUpdate: Date | null = null;

  // App settings
  appName: string = 'Water Level Monitor';

  // Debug information
  isProduction = environment.production;
  baseUrl = environment.apiBaseUrl;

  private destroy$ = new Subject<void>();

  constructor(
    private waterLevelService: WaterLevelService,
    private settingsService: SettingsService,
    private router: Router
  ) {
    addIcons({
      waterOutline,
      refreshOutline,
      timeOutline,
      settingsOutline
    });
  }

  ngOnInit() {
    this.subscribeToServiceUpdates();
    this.subscribeToSettings();

    // Check device status on app startup
    this.performInitialStatusCheck();
  }

  private performInitialStatusCheck() {
    // Small delay to allow settings to load first
    setTimeout(() => {
      console.log('Performing initial status check...');
      this.refreshStatus();
    }, 500);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToServiceUpdates() {
    // Subscribe to connection state changes
    this.waterLevelService.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        console.log('Connection state changed to:', state);
        this.connectionState = state;
        this.isChecking = state === ConnectionState.CONNECTING;
      });

    // Subscribe to water level changes
    this.waterLevelService.waterLevel$
      .pipe(takeUntil(this.destroy$))
      .subscribe(level => {
        if (level !== null) {
          console.log('Water level updated to:', level);
          this.currentWaterLevel = level;
          this.lastUpdate = new Date();
        }
      });

    // Subscribe to error messages
    this.waterLevelService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        console.log('Error message updated:', error);
        this.errorMessage = error;
      });
  }

  private subscribeToSettings() {
    // Subscribe to settings changes for app name only
    this.settingsService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.appName = settings.appName;
      });
  }

  checkWaterLevel() {
    if (this.isChecking) {
      return;
    }

    this.waterLevelService.checkWaterLevel().subscribe({
      next: (data) => {
        console.log('Water level check completed:', data);
        // Success feedback could be added here (toast, haptic feedback)
      },
      error: (error) => {
        console.error('Water level check failed:', error);
        // Error handling is managed by the service and error$ observable
      }
    });
  }

  refreshStatus() {
    if (this.isChecking) {
      return;
    }

    this.waterLevelService.checkStatus().subscribe({
      next: (status) => {
        console.log('ESP32 status:', status);
        // Status updates are now handled by the service and reflected through observables
      },
      error: (error) => {
        console.error('Status check failed:', error);
        // Error handling is managed by the service and error$ observable
      }
    });
  }

  updateESP32Settings() {
    // This method is no longer needed as settings are handled in the settings page
    // Navigate to settings page instead
    this.openSettings();
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  getFormattedTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Getter for template access to enum values
  get ConnectionState() {
    return ConnectionState;
  }
}
