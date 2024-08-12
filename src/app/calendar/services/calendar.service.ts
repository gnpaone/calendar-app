import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable} from "rxjs";
import {Appointment} from "../models";

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private appointmentsSubject: BehaviorSubject<Appointment[]>;
  appointments$: Observable<Appointment[]>;

  private readonly STORAGE_KEY = 'calendar_appointments';

  constructor() {
    const storedAppointments = this.getStoredAppointments();
    this.appointmentsSubject = new BehaviorSubject<Appointment[]>(storedAppointments);
    this.appointments$ = this.appointmentsSubject.asObservable();
  }

  private getStoredAppointments(): Appointment[] {
    const storedData = localStorage.getItem(this.STORAGE_KEY);
    if (storedData) {
      const appointments: Appointment[] = JSON.parse(storedData);
      return appointments.map(apt => ({
        ...apt,
        date: new Date(apt.date)
      }));
    }
    return [];
  }

  private updateLocalStorage(appointments: Appointment[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(appointments));
  }

  addAppointment(appointment: Appointment): void {
    const currentAppointments = this.appointmentsSubject.getValue();
    const newAppointment = {
      ...appointment,
      id: this.generateAppointmentId()
    };
    const updatedAppointments = [...currentAppointments, newAppointment];
    this.appointmentsSubject.next(updatedAppointments);
    this.updateLocalStorage(updatedAppointments);
  }

  updateAppointment(updatedAppointment: Appointment): void {
    const currentAppointments = this.appointmentsSubject.getValue();
    const updatedAppointments = currentAppointments.map(apt =>
      apt.id === updatedAppointment.id ? updatedAppointment : apt
    );
    this.appointmentsSubject.next(updatedAppointments);
    this.updateLocalStorage(updatedAppointments);
  }

  deleteAppointment(appointment: Appointment): void {
    const currentAppointments = this.appointmentsSubject.getValue();
    const updatedAppointments = currentAppointments.filter(apt => apt.id !== appointment.id);
    this.appointmentsSubject.next(updatedAppointments);
    this.updateLocalStorage(updatedAppointments);
  }

  getAppointments(): Appointment[] {
    return this.appointmentsSubject.getValue();
  }

  private generateAppointmentId() {
    return Math.random().toString(36).substring(2, 15);
  }
}
