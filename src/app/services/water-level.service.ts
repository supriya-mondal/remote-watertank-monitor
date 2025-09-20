import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  API_ENDPOINTS,
  ConnectionState,
  DeviceStatus,
  DeviceStatusResponse,
  WaterDataResponse,
  WaterLevelData
} from '../models/api-models';

@Injectable({
  providedIn: 'root'
})
export class WaterLevelService {
  // Base URL from environment (proxy in dev, direct in prod)
  private readonly BASE_URL = environment.apiBaseUrl;

  // Request timeouts in milliseconds
  private readonly STATUS_TIMEOUT = 5000;   // 5 seconds
  private readonly WATER_TIMEOUT = 8000;    // 8 seconds

  // State management
  private connectionStateSubject = new BehaviorSubject<ConnectionState>(ConnectionState.IDLE);
  private waterLevelSubject = new BehaviorSubject<number | null>(null);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  public connectionState$ = this.connectionStateSubject.asObservable();
  public waterLevel$ = this.waterLevelSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Platform-aware HTTP GET request that handles CORS for mobile apps
   */
  private async performHttpGet<T>(url: string): Promise<T> {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor HTTP for native platforms (bypasses CORS)
      const response = await CapacitorHttp.get({
        url: url,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        return response.data as T;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.data}`);
      }
    } else {
      // Use Angular HttpClient for web (works with proxy)
      return this.http.get<T>(url).toPromise() as Promise<T>;
    }
  }

  /**
   * Convert Promise to Observable for consistent API
   */
  private httpGet<T>(url: string): Observable<T> {
    return new Observable<T>(observer => {
      this.performHttpGet<T>(url)
        .then(data => {
          observer.next(data);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Check device status and then get water level
   */
  public checkWaterLevel(): Observable<WaterLevelData> {
    this.connectionStateSubject.next(ConnectionState.CONNECTING);
    this.errorSubject.next(null);

    return this.checkDeviceStatus().pipe(
      switchMap((deviceStatus: DeviceStatus) => {
        // Only proceed if device is actually connected/online
        if (!deviceStatus.connected) {
          this.connectionStateSubject.next(ConnectionState.ERROR);
          this.errorSubject.next('Device is offline. Cannot check water level.');
          return throwError(() => new Error('Device is offline'));
        }

        this.connectionStateSubject.next(ConnectionState.CONNECTED);
        console.log('Device status confirmed online, getting water level in background...');

        // Get water level directly without showing checking state
        return this.getWaterLevel();
      }),
      map((data: WaterLevelData) => {
        this.waterLevelSubject.next(data.level);
        // Stay in CONNECTED state after getting water level
        this.connectionStateSubject.next(ConnectionState.CONNECTED);
        return data;
      }),
      catchError((error) => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }  /**
   * Check device status only
   */
  public checkStatus(): Observable<DeviceStatus> {
    this.connectionStateSubject.next(ConnectionState.CONNECTING);
    this.errorSubject.next(null);

    return this.checkDeviceStatus().pipe(
      map((status: DeviceStatus) => {
        // Update connection state based on device status
        if (status.connected) {
          this.connectionStateSubject.next(ConnectionState.CONNECTED);
          // Keep the connected state - don't reset to idle
        } else {
          this.connectionStateSubject.next(ConnectionState.ERROR);
          this.errorSubject.next('Device is offline');
          // Clear water level data when device is down
          this.waterLevelSubject.next(null);
        }
        return status;
      }),
      catchError((error) => {
        // Also clear water level data on error
        this.waterLevelSubject.next(null);
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Check device status via /status endpoint
   */
  private checkDeviceStatus(): Observable<DeviceStatus> {
    const statusUrl = `${this.BASE_URL}${API_ENDPOINTS.STATUS}`;
    console.log(`Making request to status URL: ${statusUrl}`);

    return this.httpGet<DeviceStatusResponse>(statusUrl).pipe(
      timeout(this.STATUS_TIMEOUT),
      map((response: DeviceStatusResponse) => ({
        connected: response.status === 'online',
        lastSeen: response.timestamp,
        signal: response.rssi,
        uptime: response.uptime
      })),
      catchError(this.handleHttpError)
    );
  }

  /**
   * Get water level data via /water endpoint
   */
  private getWaterLevel(): Observable<WaterLevelData> {
    const waterUrl = `${this.BASE_URL}${API_ENDPOINTS.WATER}`;
    console.log(`Making request to water URL: ${waterUrl}`);

    return this.httpGet<WaterDataResponse>(waterUrl).pipe(
      timeout(this.WATER_TIMEOUT),
      map((response: WaterDataResponse) => ({
        level: response.percentage,
        timestamp: response.timestamp,
        status: response.status,
        battery: response.battery
      })),
      catchError(this.handleHttpError)
    );
  }

  /**
   * Get the last known water level
   */
  public getLastWaterLevel(): number | null {
    return this.waterLevelSubject.value;
  }

  /**
   * Get current connection state
   */
  public getCurrentState(): ConnectionState {
    return this.connectionStateSubject.value;
  }

  /**
   * Handle HTTP errors
   */
  private handleHttpError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unknown error occurred';

    console.error('HTTP Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error,
      name: error.name
    });

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          // Status 0 usually indicates CORS issues or network connectivity problems
          if (error.message && (error.message.includes('CORS') || error.message.includes('cross-origin'))) {
            errorMessage = 'CORS error: The ESP32 device does not allow requests from this web app. Please configure CORS headers on the device or use a proxy.';
          } else if (error.name === 'HttpErrorResponse' && !error.message.includes('timeout')) {
            errorMessage = 'CORS/Network error: Cannot connect to ESP32 device. This is likely a CORS (Cross-Origin Resource Sharing) issue.';
          } else {
            errorMessage = 'Cannot connect to ESP32 device. Check if device is powered and connected to WiFi.';
          }
          break;
        case 404:
          errorMessage = 'Device endpoint not found. Check device firmware and hostname configuration.';
          break;
        case 408:
        case 504:
          errorMessage = 'Device response timeout. Device may be offline.';
          break;
        case 500:
          errorMessage = 'Device internal error. Check sensor connections.';
          break;
        default:
          errorMessage = `Device error: ${error.status} - ${error.statusText || error.message}`;
      }
    }

    console.error('Processed error message:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Handle general errors and update state
   */
  private handleError(error: any): void {
    console.error('Water level service error:', error);
    this.connectionStateSubject.next(ConnectionState.ERROR);
    this.errorSubject.next(error.message || 'Failed to check water level');
  }

  /**
   * Reset service state
   */
  public reset(): void {
    this.connectionStateSubject.next(ConnectionState.IDLE);
    this.errorSubject.next(null);
  }
}
