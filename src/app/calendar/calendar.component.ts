import {AfterViewChecked, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {map, Observable, of} from "rxjs";
import {Appointment} from "./models";
import {CalendarService} from "./services/calendar.service";
import {CdkDragDrop, CdkDragEnd, CdkDragStart} from '@angular/cdk/drag-drop';
import {MatDialog} from "@angular/material/dialog";
import {AppointmentFormComponent} from "./appointment-form/appointment-form.component";

type CalendarView = 'month' | 'week';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit, AfterViewChecked  {
  @ViewChild('weekBody') weekBody!: ElementRef;

  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: Date[] = [];
  weekDates: Date[] = [];
  appointments$: Observable<Appointment[]> = of([]);
  selectedDayAppointments$: Observable<Appointment[]> = of([]);
  currentView: CalendarView = 'month';
  timeSlots: string[] = [];

  isDragging = false;

  readonly PIXELS_PER_SLOT = 60;
  readonly MINUTES_PER_SLOT = 30;
  readonly MINUTES_PER_DAY = 24 * 60;


  weekBodyRect: DOMRect | null = null;
  dragStartOffset: {x: number, y: number} = {x: 0, y: 0};

  constructor(
    private calendarService: CalendarService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.appointments$ = this.calendarService.appointments$;
    this.selectedDayAppointments$ = this.getSelectedDayAppointments();
    this.generateCalendarDays(this.currentDate);
    this.generateWeekDates(this.currentDate);
    this.generateTimeSlots();
  }

  ngAfterViewChecked () {
    this.updateWeekBodyRect();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateWeekBodyRect();
  }
  onResizeEnded(event: CdkDragEnd, appointment: Appointment) {
    const deltaY = event.distance.y;
    const durationInMinutes = Math.round(deltaY / this.PIXELS_PER_SLOT) * this.MINUTES_PER_SLOT;
    const newDuration = appointment.duration + durationInMinutes;

    const updatedAppointment: Appointment = {
      ...appointment,
      duration: newDuration
    };
    this.calendarService.updateAppointment(updatedAppointment);
  }

  updateWeekBodyRect() {
    if (this.weekBody) {
      this.weekBodyRect = this.weekBody.nativeElement.getBoundingClientRect();
    } else {
      console.error('weekBody element not found');
    }
  }

  generateCalendarDays(date: Date) {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      this.calendarDays.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
  }

  generateWeekDates(date: Date) {

    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    this.weekDates = Array(7).fill(0).map((_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  }

  generateTimeSlots() {
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        this.timeSlots.push(time);
      }
    }
  }

  onDateSelect(date: Date) {
    this.selectedDate = date;
    this.selectedDayAppointments$ = this.getSelectedDayAppointments();
  }

  navigatePeriod(direction: number) {
    if (this.currentView === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + direction, 1);
      this.generateCalendarDays(this.currentDate);
    } else {
      this.currentDate = new Date(this.currentDate.setDate(this.currentDate.getDate() + direction * 7));
      this.generateWeekDates(this.currentDate);
    }
    this.selectedDayAppointments$ = this.getSelectedDayAppointments();
  }

  switchView(view: CalendarView) {
    this.currentView = view;
    if (view === 'week') {
      this.generateWeekDates(this.selectedDate);
    } else {
      this.generateCalendarDays(this.selectedDate);
    }
  }

  get currentMonthYear(): string {
    return this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  deleteAppointment(appointment: Appointment) {
    this.calendarService.deleteAppointment(appointment);
  }

  openAppointmentForm(appointment?: Appointment, date?: Date, time?: string) {
    if (this.isDragging) return;
    const selectedDateTime = date && time ? new Date(date.setHours(
      parseInt(time.split(':')[0]),
      parseInt(time.split(':')[1])
    )) : this.selectedDate;

    const dialogRef = this.dialog.open(AppointmentFormComponent, {
      width: '550px',
      data: {
        appointment: appointment || null,
        selectedDate: selectedDateTime
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.action === 'save') {
          if (appointment) {
            this.calendarService.updateAppointment(result.appointment);
          } else {
            this.calendarService.addAppointment(result.appointment);
          }
        } else if (result.action === 'delete') {
          this.calendarService.deleteAppointment(result.appointment);
        }
        this.selectedDayAppointments$ = this.getSelectedDayAppointments();
      }
    });
  }


  getSelectedDayAppointments(): Observable<Appointment[]> {
    return this.appointments$.pipe(
      map(appointments => appointments.filter(apt =>
        apt.date.toDateString() === this.selectedDate.toDateString()
      ).sort((a, b) => a.date.getTime() - b.date.getTime())
      )
    );
  }

  getDayAppointments(day: Date): Observable<Appointment[]> {
    return this.appointments$.pipe(
      map(appointments => appointments.filter(apt =>
        apt.date.toDateString() === day.toDateString()
      ))
    );
  }

  getAppointmentHeight(appointment: Appointment): number {
    return (appointment.duration / this.MINUTES_PER_SLOT) * this.PIXELS_PER_SLOT;
  }

  getAppointmentPosition(appointment: Appointment): number {
    const minutes = appointment.date.getHours() * 60 + appointment.date.getMinutes();
    return (minutes / this.MINUTES_PER_SLOT) * this.PIXELS_PER_SLOT;
  }
  getMinutesFromPixels(pixels: number): number {
    return (pixels / this.PIXELS_PER_SLOT) * this.MINUTES_PER_SLOT;
  }

  drop(event: CdkDragDrop<{date: Date, time: string}>) {
    const newDate = event.container.data.date;
    const newTime = event.container.data.time;
    const appointment: Appointment = event.item.data;

    const updatedDate = new Date(newDate);
    const [hours, minutes] = newTime.split(':').map(Number);
    updatedDate.setHours(hours, minutes);

    const updatedAppointment: Appointment = {
      ...appointment,
      date: updatedDate
    };

    this.calendarService.updateAppointment(updatedAppointment);
  }

  onDragStarted(event: CdkDragStart) {
    this.isDragging = true;
    const appointmentElement = event.source.element.nativeElement;
    const appointmentRect = appointmentElement.getBoundingClientRect();

    this.dragStartOffset = {
      x: (event.event as MouseEvent).clientX - appointmentRect.left,
      y: (event.event as MouseEvent).clientY - appointmentRect.top
    };
  }

  onDragEnded(event: CdkDragEnd) {
    this.isDragging = false;
    if (event.dropPoint.x !== 0 || event.dropPoint.y !== 0) {
      const appointment: Appointment = event.source.data;
      const newDate = this.calculateNewDate(appointment, event.dropPoint);
      this.updateAppointment(appointment, newDate);
    }
  }

  private calculateNewDate(appointment: Appointment, dropPoint: {x: number, y: number}): Date {
    const scrollTop = this.weekBody.nativeElement.scrollTop;
    const adjustedY = dropPoint.y + scrollTop - this.weekBodyRect!.top - this.dragStartOffset.y;
    const adjustedX = dropPoint.x - this.weekBodyRect!.left - this.dragStartOffset.x;

    const dayWidth = this.getDayColumnWidth();
    const dayIndex = Math.min(Math.max(Math.floor(adjustedX / dayWidth), 0), 6);

    const totalMinutes = this.MINUTES_PER_DAY;

    let minutesFromMidnight = this.getMinutesFromPixels(adjustedY);
    minutesFromMidnight = Math.min(Math.max(minutesFromMidnight, 0), totalMinutes - appointment.duration);

    const newDate = new Date(this.weekDates[dayIndex]);
    newDate.setHours(0, 0, 0, 0);
    newDate.setMinutes(minutesFromMidnight);

    return newDate;
  }

  private getDayColumnWidth(): number {
    if (this.weekBody) {
      const weekBodyWidth = this.weekBody.nativeElement.offsetWidth;
      const timeColumnWidth = 50;
      return (weekBodyWidth - timeColumnWidth) / 7;
    }
    return document.querySelector('.day-column')!.clientWidth;
  }

  private updateAppointment(appointment: Appointment, newDate: Date) {
    const updatedAppointment: Appointment = {
      ...appointment,
      date: newDate
    };
    this.calendarService.updateAppointment(updatedAppointment);
  }

  getTimeSlotId(date: Date, time: string): string {
    return `time-slot-${date.toISOString()}-${time}`;
  }

}
