import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Appointment} from "../models";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.scss']
})
export class AppointmentFormComponent implements OnInit {
  appointmentForm: FormGroup;
  isNewAppointment: boolean;


  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AppointmentFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { appointment: Appointment | null, selectedDate: Date },
  ) {
    this.isNewAppointment = !data.appointment;
    this.appointmentForm = this.fb.group({
      title: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      duration: [30, Validators.required],
      description: [''],
    })
  }

  ngOnInit() {
    if (this.data.appointment) {
      this.appointmentForm.patchValue({
        title: this.data.appointment.title,
        date: this.data.appointment.date,
        time: this.formatTime(this.data.appointment.date),
        duration: this.data.appointment.duration,
        description: this.data.appointment.description
      });
    } else {
      this.appointmentForm.patchValue({
        date: this.data.selectedDate,
      })
    }
  }

  onSubmit() {
    if (this.appointmentForm.valid) {
      const {title, date, time, duration, description} = this.appointmentForm.value;
      const appointmentDate = new Date(date);
      appointmentDate.setHours(parseInt(time.split(':')[0], 10));
      appointmentDate.setMinutes(parseInt(time.split(':')[1], 10));

      const appointment: Appointment = {
        id: this.data.appointment ? this.data.appointment.id : undefined,
        title,
        date: appointmentDate,
        duration,
        description
      };
      this.dialogRef.close({action: 'save', appointment});
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onDelete() {
    if (this.data.appointment) {
      this.dialogRef.close({action: 'delete', appointment: this.data.appointment});
    }
  }


  private formatTime(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }
}
