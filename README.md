# Water Level Monitor - Ionic App

A beautiful and responsive Ionic Angular application for monitoring water tank levels through an ESP32 module with real-time animations and status indicators.

## Features

### 🌊 Animated Water Tank Display
- **Visual water tank indicator** with realistic water animation
- **Dynamic percentage display** with color-coded levels
- **Animated bubbles** during checking process
- **Water level bar** with shine effect
- **Status indicators** (Full, High, Medium, Low, Empty)

### 📡 ESP32 Communication
- **Wake-up functionality** for low-power ESP32 modules
- **Real-time connection status** with visual feedback
- **Error handling** with descriptive messages
- **Configurable ESP32 IP address** through settings panel
- **HTTP timeout management** for reliable communication

### 🎨 Modern UI/UX
- **Gradient backgrounds** with animated overlays
- **Smooth transitions** and micro-animations
- **Responsive design** for mobile, tablet, and desktop
- **Dark theme support** with automatic detection
- **High contrast mode** for accessibility
- **Reduced motion** support for sensitive users

### 🔧 Technical Features
- **Standalone Angular components** with modern architecture
- **RxJS observables** for reactive state management
- **TypeScript** with strong typing throughout
- **Ionic 8** with latest Angular 20
- **CSS animations** with hardware acceleration
- **Progressive enhancement** for all devices

## Project Structure

```
src/app/
├── components/
│   ├── water-tank/                 # Animated water tank component
│   │   ├── water-tank.component.ts
│   │   └── water-tank.component.scss
│   └── connection-status/          # ESP32 connection status indicator
│       ├── connection-status.component.ts
│       └── connection-status.component.scss
├── services/
│   └── water-level.service.ts      # ESP32 communication service
├── home/                           # Main page
│   ├── home.page.html
│   ├── home.page.ts
│   └── home.page.scss
└── app.component.ts
```

## Getting Started

### Prerequisites
- Node.js 18+
- Ionic CLI: `npm install -g @ionic/cli`
- ESP32 module with ultrasonic sensor (see ESP32_API_Documentation.md)

### Installation
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure ESP32 IP:**
   - Update the IP address in `water-level.service.ts` or use the in-app settings
   - Default: `192.168.1.100`

3. **Run the app:**
   ```bash
   ionic serve
   ```

### ESP32 Setup
See `ESP32_API_Documentation.md` for:
- Required API endpoints
- Arduino code examples
- Wiring diagrams
- Testing with mock data

## App Workflow

1. **Wake Up ESP32:** Button press sends POST to `/wakeup`
2. **Connection Status:** Shows "Connecting" → "Connected" states
3. **Water Level Check:** Makes GET request to `/waterlevel`
4. **Animate Display:** Smoothly animates water level with bubbles
5. **Show Results:** Displays percentage, status, and timestamp

## Components

### WaterTankComponent
- **Input:** `waterLevel`, `isChecking`
- **Features:** Animated water fill, bubbles, status text, level bar
- **Animations:** Water rise/fall, surface waves, bubble effects

### ConnectionStatusComponent  
- **Input:** `connectionState`, `errorMessage`
- **States:** Idle, Connecting, Connected, Checking, Error
- **Visual:** Icon animations, status text, colored indicators

### WaterLevelService
- **Methods:** `checkWaterLevel()`, `checkStatus()`, `updateESP32Url()`
- **Observables:** `connectionState$`, `waterLevel$`, `error$`
- **Error Handling:** Network timeouts, device errors, sensor failures

## Customization

### Styling
- Modify component SCSS files for visual changes
- Update CSS custom properties for theme colors
- Adjust animations in keyframe definitions

### ESP32 Communication
- Change base URL in `WaterLevelService`
- Modify timeout values for different networks
- Add authentication headers if needed

### Water Tank Visualization
- Adjust tank dimensions in component CSS
- Change color thresholds in `getWaterColor()`
- Modify bubble count and animation timing

## Browser Support

- **Chrome/Edge:** Full support with all animations
- **Safari:** Full support with WebKit optimizations  
- **Firefox:** Full support with modern features
- **Mobile browsers:** Optimized for touch and performance

## Performance

- **Lazy loading:** Components loaded on demand
- **Hardware acceleration:** CSS transforms and animations
- **Memory management:** Proper cleanup of intervals and subscriptions
- **Bundle size:** Optimized with tree shaking and AOT compilation

## Accessibility

- **Screen readers:** Proper ARIA labels and semantic HTML
- **High contrast:** Enhanced borders and colors when needed
- **Reduced motion:** Disabled animations for sensitive users
- **Keyboard navigation:** Full app navigation without mouse

## Deployment

### Mobile App (Capacitor)
```bash
ionic build
ionic cap add ios
ionic cap add android
ionic cap sync
ionic cap open ios
ionic cap open android
```

### Web App
```bash
ionic build --prod
# Deploy dist/ folder to web server
```

## Troubleshooting

### ESP32 Connection Issues
- Check WiFi network connectivity
- Verify ESP32 IP address in settings
- Ensure ESP32 firmware includes required endpoints
- Check CORS headers on ESP32 responses

### App Performance
- Enable hardware acceleration in browser
- Clear app cache and reload
- Check network latency to ESP32
- Monitor browser console for errors

## License

This project is open source and available under the MIT License.

---

Built with ❤️ using Ionic Framework and Angular
