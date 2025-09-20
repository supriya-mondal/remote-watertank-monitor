import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  cloudOfflineOutline,
  refreshOutline,
  timeOutline,
  wifiOutline
} from 'ionicons/icons';
import { ConnectionState } from '../../models/api-models';

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="connection-status" [class]="getStatusClass()">
      <div class="status-icon">
        <ion-icon [name]="getIconName()" [class.spin]="isSpinning()"></ion-icon>
      </div>
      <div class="status-content">
        <div class="status-title">{{ getStatusTitle() }}</div>
        <div class="status-message">{{ getStatusMessage() }}</div>
      </div>
      <div class="status-indicator" [class]="getIndicatorClass()"></div>
    </div>
  `,
  styleUrls: ['./connection-status.component.scss']
})
export class ConnectionStatusComponent {
  @Input() connectionState: ConnectionState = ConnectionState.IDLE;
  @Input() errorMessage: string | null = null;
  @Input() showDetails: boolean = true;

  constructor() {
    addIcons({
      wifiOutline,
      cloudOfflineOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      timeOutline,
      refreshOutline
    });
  }

  getStatusClass(): string {
    return `status-${this.connectionState}`;
  }

  getIndicatorClass(): string {
    return `indicator-${this.connectionState}`;
  }

  getIconName(): string {
    switch (this.connectionState) {
      case ConnectionState.IDLE:
        return 'wifi-outline';
      case ConnectionState.CONNECTING:
        return 'refresh-outline';
      case ConnectionState.CONNECTED:
        return 'checkmark-circle-outline';
      case ConnectionState.CHECKING:
        return 'time-outline';
      case ConnectionState.ERROR:
        return 'alert-circle-outline';
      default:
        return 'cloud-offline-outline';
    }
  }

  getStatusTitle(): string {
    switch (this.connectionState) {
      case ConnectionState.IDLE:
        return 'Ready';
      case ConnectionState.CONNECTING:
        return 'Connecting';
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CHECKING:
        return 'Checking';
      case ConnectionState.ERROR:
        return 'Error';
      default:
        return 'Unknown';
    }
  }

  getStatusMessage(): string {
    if (this.connectionState === ConnectionState.ERROR && this.errorMessage) {
      return this.errorMessage;
    }

    switch (this.connectionState) {
      case ConnectionState.IDLE:
        return 'ESP32 ready to connect';
      case ConnectionState.CONNECTING:
        return 'Waking up ESP32 module...';
      case ConnectionState.CONNECTED:
        return 'ESP32 module is online';
      case ConnectionState.CHECKING:
        return 'Reading water level sensor...';
      case ConnectionState.ERROR:
        return 'Failed to connect to ESP32';
      default:
        return 'Unknown status';
    }
  }

  isSpinning(): boolean {
    return this.connectionState === ConnectionState.CONNECTING ||
      this.connectionState === ConnectionState.CHECKING;
  }
}
