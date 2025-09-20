/**
 * API Response Models for ESP-01 Water Monitor
 */

/**
 * Response model for /status endpoint
 * Provides device status and connectivity information
 */
export interface DeviceStatusResponse {
  status: 'online' | 'offline';
  device: string;
  ip: string;
  uptime: number;
  free_heap: number;
  rssi: number;
  timestamp: number;
}

/**
 * Response model for /water endpoint
 * Provides water level and tank information
 */
export interface WaterDataResponse {
  level: number;           // Actual water level measurement
  percentage: number;      // Water level as percentage (0-100)
  status: 'normal' | 'low' | 'critical' | 'full';
  timestamp: number;
  tank_height: number;     // Total tank height in cm
  sensor_distance: number; // Distance from sensor to water surface
  device: string;
  battery: number;         // Battery percentage (0-100)
  signal_strength: number; // WiFi signal strength (negative dBm)
}

/**
 * Processed water level data for UI components
 * Simplified version of WaterDataResponse for internal use
 */
export interface WaterLevelData {
  level: number;           // Percentage from 0-100
  timestamp: number;
  status?: string;         // Optional status indicator
  battery?: number;        // Optional battery level
}

/**
 * Device connection status for UI components
 * Simplified version of DeviceStatusResponse for internal use
 */
export interface DeviceStatus {
  connected: boolean;
  lastSeen?: number;
  signal?: number;         // WiFi signal strength
  uptime?: number;         // Device uptime in seconds
}

/**
 * Connection states for the application
 */
export enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  CHECKING = 'checking',
  ERROR = 'error'
}

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
  STATUS: '/status',
  WATER: '/water'
} as const;

/**
 * Default hostname - can be overridden by settings
 */
export const DEFAULT_HOSTNAME = 'http://agent-water.local';

/**
 * Proxy URL for development (to avoid CORS issues)
 */
export const PROXY_URL = '/api';
