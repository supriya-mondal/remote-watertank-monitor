import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppSettings {
  appName: string;
  // Future settings can be added here
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'app-settings';
  private readonly DEFAULT_SETTINGS: AppSettings = {
    appName: 'Water Level Monitor'
  };

  private settingsSubject = new BehaviorSubject<AppSettings>(this.DEFAULT_SETTINGS);
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.loadSettings();
  }

  /**
   * Load settings from local storage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as AppSettings;
        // Merge with defaults to ensure all properties exist
        const mergedSettings = { ...this.DEFAULT_SETTINGS, ...settings };
        this.settingsSubject.next(mergedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use defaults if loading fails
      this.settingsSubject.next(this.DEFAULT_SETTINGS);
    }
  }

  /**
   * Save settings to local storage
   */
  private saveSettings(settings: AppSettings): void {
    try {
      console.log('Saving settings to localStorage:', settings);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('Settings saved successfully to localStorage');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Get current settings synchronously
   */
  public getCurrentSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  /**
   * Update app name
   */
  public updateAppName(appName: string): void {
    if (appName.trim()) {
      const currentSettings = this.getCurrentSettings();
      const updatedSettings: AppSettings = {
        ...currentSettings,
        appName: appName.trim()
      };

      this.settingsSubject.next(updatedSettings);
      this.saveSettings(updatedSettings);
    }
  }

  /**
   * Reset settings to defaults
   */
  public resetToDefaults(): void {
    this.settingsSubject.next(this.DEFAULT_SETTINGS);
    this.saveSettings(this.DEFAULT_SETTINGS);
  }
}
