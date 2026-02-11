import { Component, EventEmitter, Input, Output, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-datepicker',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="datepicker-container" [class.active]="isOpen">
       <!-- Trigger Input -->
       <div class="input-wrapper" (click)="toggle()">
          <input type="text" readonly [value]="formattedDate" class="input-premium trigger-input" placeholder="Seleccionar fecha" />
          <svg class="calendar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
       </div>

       <!-- Dropdown Calendar -->
       <div class="calendar-dropdown glass-panel" *ngIf="isOpen">
          <div class="calendar-header">
             <button class="nav-btn" (click)="prevMonth($event)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
             </button>
             <span class="month-label">{{ currentMonthName }} {{ currentYear }}</span>
             <button class="nav-btn" (click)="nextMonth($event)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
             </button>
          </div>
          
          <div class="weekdays-grid">
             <span *ngFor="let day of weekDays" class="weekday">{{day}}</span>
          </div>

          <div class="days-grid">
             <div 
                *ngFor="let date of monthDays" 
                class="day-cell" 
                [class.empty]="!date"
                [class.today]="isToday(date)"
                [class.selected]="isSelected(date)"
                (click)="selectDate(date)">
                {{ date?.getDate() }}
             </div>
          </div>
       </div>
    </div>
  `,
    styles: [`
    .datepicker-container {
      position: relative;
      width: 220px;
    }

    .input-wrapper {
        position: relative;
        cursor: pointer;
    }

    .trigger-input {
        cursor: pointer;
        padding-right: 2.5rem !important;
    }

    .calendar-icon {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-primary);
        pointer-events: none;
    }

    .calendar-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 0.5rem;
        width: 280px;
        padding: 1.25rem;
        z-index: 100;
        background: rgba(20, 20, 28, 0.95); /* Deeper opacity for readability */
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .month-label {
        font-weight: 700;
        color: white;
        text-transform: capitalize;
    }

    .nav-btn {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.1);
        color: var(--color-text-muted);
        border-radius: 6px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            border-color: var(--color-primary);
            color: white;
            background: rgba(var(--primary-hue), var(--primary-sat), var(--primary-light), 0.1);
        }
    }

    .weekdays-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        margin-bottom: 0.5rem;
    }

    .weekday {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        font-weight: 600;
    }

    .days-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        row-gap: 2px;
    }

    .day-cell {
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        border-radius: 6px;
        cursor: pointer;
        color: #e2e8f0;
        transition: all 0.2s;

        &:hover:not(.empty) {
            background: rgba(255,255,255,0.1);
            color: white;
        }

        &.empty {
            cursor: default;
        }

        &.today {
            color: var(--color-secondary);
            font-weight: 700;
            position: relative;
            
            &::after {
                content: '';
                position: absolute;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: var(--color-secondary);
            }
        }

        &.selected {
            background: var(--color-primary);
            color: white;
            box-shadow: 0 4px 10px rgba(var(--primary-hue), var(--primary-sat), 50%, 0.4);
            font-weight: 600;
        }
    }
  `]
})
export class DatepickerComponent implements OnInit {
    @Output() dateChange = new EventEmitter<Date>();
    @Input() initialDate: Date = new Date(); // Defaults to today

    isOpen = false;
    currentDate: Date = new Date();
    selectedDate: Date | null = null;

    weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    monthDays: (Date | null)[] = [];

    currentMonthName = '';
    currentYear = 0;

    constructor(private elementRef: ElementRef) { }

    ngOnInit() {
        this.selectedDate = this.initialDate;
        this.currentDate = new Date(this.initialDate);
        this.updateCalendar();
    }

    get formattedDate(): string {
        if (!this.selectedDate) return '';
        return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(this.selectedDate);
    }

    toggle() { this.isOpen = !this.isOpen; }

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen = false;
        }
    }

    updateCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        this.currentYear = year;
        this.currentMonthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(this.currentDate);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay(); // 0 is Sunday

        this.monthDays = [];

        // Empty cells for shift
        for (let i = 0; i < startDayOfWeek; i++) {
            this.monthDays.push(null);
        }

        // Days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            this.monthDays.push(new Date(year, month, i));
        }
    }

    prevMonth(e: Event) {
        e.stopPropagation();
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.updateCalendar();
    }

    nextMonth(e: Event) {
        e.stopPropagation();
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.updateCalendar();
    }

    selectDate(date: Date | null) {
        if (!date) return;
        this.selectedDate = date;
        this.dateChange.emit(date);
        this.isOpen = false;
    }

    isToday(date: Date | null): boolean {
        if (!date) return false;
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }

    isSelected(date: Date | null): boolean {
        if (!date || !this.selectedDate) return false;
        return date.getDate() === this.selectedDate.getDate() &&
            date.getMonth() === this.selectedDate.getMonth() &&
            date.getFullYear() === this.selectedDate.getFullYear();
    }
}
