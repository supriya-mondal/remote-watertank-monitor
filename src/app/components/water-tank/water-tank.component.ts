import { animate, keyframes, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'app-water-tank',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tank-container">
      <!-- Tank Frame -->
      <div class="tank-frame" [@containerAnimation]="animationState">
        <!-- Water -->
        <div
          class="water"
          [style.height.%]="animatedLevel"
          [@waterAnimation]="animationState"
          [class.checking]="isChecking"
          [style.background]="getWaterColor()">
          <div class="water-surface" [@surfaceAnimation]="animationState">
            <!-- Wave Animation -->
            <div class="wave wave-1"></div>
            <div class="wave wave-2"></div>
            <div class="wave wave-3"></div>
          </div>
          <div class="bubbles" *ngIf="isChecking" [@bubblesAnimation]>
            <div class="bubble" *ngFor="let bubble of bubbles"
                 [style.left.%]="bubble.x"
                 [style.animation-delay.s]="bubble.delay">
            </div>
          </div>
        </div>

        <!-- Tank Labels -->
        <div class="tank-labels">
          <div class="label full">FULL</div>
          <div class="label three-quarter">75%</div>
          <div class="label half">50%</div>
          <div class="label quarter">25%</div>
          <div class="label empty">EMPTY</div>
        </div>

        <!-- Tank Outline -->
        <div class="tank-outline"></div>
      </div>

      <!-- Level Display -->
      <div class="level-display" [@displayAnimation]="animationState">
        <div class="percentage" [class.checking]="isChecking" [style.color]="getWaterColor()">
          {{ isChecking ? '...' : (waterLevel || 0) + '%' }}
        </div>
        <div class="status-text" [style.color]="getStatusColor()">
          {{ getStatusText() }}
        </div>
        <div class="level-bar">
          <div class="level-fill"
               [style.width.%]="animatedLevel"
               [style.background]="getWaterColor()">
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./water-tank.component.scss'],
  animations: [
    trigger('containerAnimation', [
      state('idle', style({ transform: 'scale(1)', opacity: 1 })),
      state('checking', style({ transform: 'scale(1)', opacity: 1 })),
      transition('idle => checking', [
        animate('0.3s ease-in-out', style({ transform: 'scale(1.02)' })),
        animate('0.3s ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ]),
    trigger('waterAnimation', [
      state('idle', style({ transform: 'scaleY(1)' })),
      state('checking', style({ transform: 'scaleY(1)' })),
      transition('* => checking', [
        animate('0.5s ease-in-out', keyframes([
          style({ transform: 'scaleY(1)', offset: 0 }),
          style({ transform: 'scaleY(0.95)', offset: 0.5 }),
          style({ transform: 'scaleY(1)', offset: 1 })
        ]))
      ])
    ]),
    trigger('surfaceAnimation', [
      state('idle', style({ transform: 'translateY(0)' })),
      state('checking', style({ transform: 'translateY(0)' })),
      transition('* => checking', [
        animate('2s ease-in-out', keyframes([
          style({ transform: 'translateY(0) scaleX(1)', offset: 0 }),
          style({ transform: 'translateY(-2px) scaleX(0.98)', offset: 0.25 }),
          style({ transform: 'translateY(0) scaleX(1)', offset: 0.5 }),
          style({ transform: 'translateY(-1px) scaleX(0.99)', offset: 0.75 }),
          style({ transform: 'translateY(0) scaleX(1)', offset: 1 })
        ]))
      ])
    ]),
    trigger('displayAnimation', [
      state('idle', style({ transform: 'scale(1)', opacity: 1 })),
      state('checking', style({ transform: 'scale(1)', opacity: 1 })),
      transition('idle => checking', [
        animate('0.2s ease-in-out', style({ transform: 'scale(0.98)' })),
        animate('0.2s ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ]),
    trigger('bubblesAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('0.2s ease-in', style({ opacity: 0, transform: 'scale(0)' }))
      ])
    ])
  ]
})
export class WaterTankComponent implements OnInit, OnDestroy, OnChanges {
  @Input() waterLevel: number = 0;
  @Input() isChecking: boolean = false;
  @Input() showPercentage: boolean = true;

  animatedLevel: number = 0;
  animationState: string = 'idle';
  bubbles: Array<{ x: number, delay: number }> = [];

  private animationInterval?: number;

  ngOnInit() {
    this.generateBubbles();
    this.animateToLevel();
  }

  ngOnDestroy() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }

  ngOnChanges() {
    this.animateToLevel();
    this.animationState = this.isChecking ? 'checking' : 'idle';

    if (this.isChecking) {
      this.generateBubbles();
    }
  }

  private animateToLevel() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }

    const targetLevel = this.waterLevel || 0;
    const startLevel = this.animatedLevel;
    const difference = targetLevel - startLevel;
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 FPS
    const stepSize = difference / steps;
    let currentStep = 0;

    this.animationInterval = window.setInterval(() => {
      currentStep++;

      if (currentStep <= steps) {
        // Ease-out animation
        const progress = currentStep / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        this.animatedLevel = startLevel + (difference * easeOut);
      } else {
        this.animatedLevel = targetLevel;
        if (this.animationInterval) {
          clearInterval(this.animationInterval);
        }
      }
    }, duration / steps);
  }

  private generateBubbles() {
    this.bubbles = [];
    for (let i = 0; i < 8; i++) {
      this.bubbles.push({
        x: Math.random() * 70 + 15, // 15% to 85% from left
        delay: Math.random() * 2
      });
    }
  }

  getStatusText(): string {
    if (this.isChecking) {
      return 'Checking water level...';
    }

    const level = this.waterLevel || 0;

    if (level >= 70) return 'Good Level';
    if (level >= 30) return 'Medium Level';
    if (level > 0) return 'Low Level';
    return 'Empty Tank';
  }

  getWaterColor(): string {
    const level = this.waterLevel || 0;

    if (level >= 70) return 'linear-gradient(180deg, rgba(76, 175, 80, 0.9) 0%, rgba(67, 160, 71, 0.95) 50%, rgba(56, 142, 60, 1) 100%)'; // Green - Good Level
    if (level >= 30) return 'linear-gradient(180deg, rgba(255, 152, 0, 0.9) 0%, rgba(245, 124, 0, 0.95) 50%, rgba(230, 108, 0, 1) 100%)'; // Orange - Medium Level
    return 'linear-gradient(180deg, rgba(244, 67, 54, 0.9) 0%, rgba(229, 57, 53, 0.95) 50%, rgba(198, 40, 40, 1) 100%)'; // Red - Low Level
  }

  getStatusColor(): string {
    const level = this.waterLevel || 0;

    if (level >= 70) return '#4CAF50'; // Green - Good Level
    if (level >= 30) return '#FF9800'; // Orange - Medium Level
    return '#F44336'; // Red - Low Level
  }
}
