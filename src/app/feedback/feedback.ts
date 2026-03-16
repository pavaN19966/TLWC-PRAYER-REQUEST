import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class FeedbackComponent implements OnInit {
  readonly showMemberDates = input(false);

  submitted = signal(false);
  isSubmitting = false;
  submitError = '';
  logoSrc = 'assets/TLWC.jpg?v=2';

  apiUrl =
    'https://script.google.com/macros/s/AKfycbyjeQ-wnSPIarZl6N7MOTl4P5Kvp4vBODIngqHfIpQ1jhVMJfw57kAm-2KvaYRfLYKF/exec';

  private readonly fb = inject(FormBuilder);

  constructor(private http: HttpClient) {}

  prayerForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s.'-]+$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    dob: [null as Date | null],
    anniversary: [null as Date | null],
    place: [''],
    churchGroup: [false],
    youthGroup: [false],
    girlsGroup: [false],
    prayerRequest: [''],
    feedback: [''],
  });

  allowNumbersOnly(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (target) {
      target.value = target.value.replace(/[^0-9]/g, '');
    }
  }

  allowLettersOnly(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (target) {
      const cleanedValue = target.value.replace(/[^A-Za-z\s.'-]/g, '');
      target.value = cleanedValue;
      this.prayerForm.controls.name.setValue(cleanedValue, { emitEvent: false });
    }
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.endsWith('/TLWC.jpg')) {
      img.src = 'TLWC.jpg';
    }
  }

  ngOnInit(): void {}

  get successIconClass(): string {
    return this.showMemberDates() ? 'pi pi-check-circle' : 'pi pi-check';
  }

  private formatDate(value: string | Date | null): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
  }

  submit(): void {
    if (this.prayerForm.invalid) {
      this.prayerForm.markAllAsTouched();
      return;
    }

    this.submitError = '';
    this.isSubmitting = true;

    const formValue = this.prayerForm.getRawValue();

    const payload = JSON.stringify({
      name: formValue.name,
      mobile: formValue.phone,
      dob: this.formatDate(formValue.dob),
      anniversary: this.formatDate(formValue.anniversary),
      place: formValue.place,
      prayerRequest: formValue.prayerRequest,
    });

    this.http
      .post(this.apiUrl, payload, {
        responseType: 'text',
      })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.submitted.set(true);
          this.prayerForm.reset({
            name: '',
            phone: '',
            dob: null,
            anniversary: null,
            place: '',
            churchGroup: false,
            youthGroup: false,
            girlsGroup: false,
            prayerRequest: '',
            feedback: '',
          });
        },
        error: (err) => {
          // Apps Script may still execute even if CORS blocks response
          if (err?.status === 0) {
            this.submitted.set(true);
            this.prayerForm.reset({
              name: '',
              phone: '',
              dob: null,
              anniversary: null,
              place: '',
              churchGroup: false,
              youthGroup: false,
              girlsGroup: false,
              prayerRequest: '',
              feedback: '',
            });
            return;
          }

          this.submitError = 'Something went wrong. Please try again.';
        },
      });
  }
}
