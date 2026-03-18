import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  NativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

const FEEDBACK_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

class FeedbackDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        return null;
      }

      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmedValue);

      if (!match) {
        return new Date(Number.NaN);
      }

      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const year = Number(match[3]);
      const parsedDate = new Date(year, month, day);

      return parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month &&
        parsedDate.getDate() === day
        ? parsedDate
        : new Date(Number.NaN);
    }

    return value instanceof Date ? value : super.parse(value);
  }

  override format(date: Date): string {
    if (!this.isValid(date)) {
      return '';
    }

    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');

    return `${day}/${month}/${date.getFullYear()}`;
  }
}

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
  providers: [
    { provide: DateAdapter, useClass: FeedbackDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: FEEDBACK_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class FeedbackComponent implements OnInit {
  readonly showMemberDates = input(false);
  readonly dateFieldEditing = {
    dob: false,
    anniversary: false,
  };

  submitted = signal(false);
  isSubmitting = false;
  submitError = '';
  logoSrc = 'assets/TLWC.jpg?v=2';

  apiUrl ='https://script.google.com/macros/s/AKfycbwJ0IDYnMh1mnDNimA118Zb5cdrZzuYBauIZ7PJLOt_BSh-rkyYHGVWuZaCiAC-Fk6q/exec';

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  constructor(private http: HttpClient) {}

  prayerForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s.'-]+$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    dob: ['', [this.dateInputValidator()]],
    anniversary: ['', [this.dateInputValidator()]],
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

  handleDateInput(controlName: 'dob' | 'anniversary', event: Event): void {
    const target = event.target as HTMLInputElement | null;

    if (!target) {
      return;
    }

    const inputEvent = event as InputEvent;
    const rawValue = target.value;
    const caretPosition = target.selectionStart ?? rawValue.length;
    const isDeleting =
      inputEvent.inputType === 'deleteContentBackward' ||
      inputEvent.inputType === 'deleteContentForward';
    const formatted = this.formatDateWhileTyping(rawValue, caretPosition, isDeleting);

    target.value = formatted;
    this.prayerForm.controls[controlName].setValue(formatted, { emitEvent: false });
    this.prayerForm.controls[controlName].updateValueAndValidity({ emitEvent: false });
  }

  onDateFocus(controlName: 'dob' | 'anniversary'): void {
    this.dateFieldEditing[controlName] = true;
  }

  normalizeDateInput(controlName: 'dob' | 'anniversary'): void {
    this.dateFieldEditing[controlName] = false;

    const control = this.prayerForm.controls[controlName];
    const value = control.value;

    if (!value || typeof value !== 'string') {
      return;
    }

    const normalizedValue = this.normalizeDateString(value);

    if (normalizedValue !== value) {
      control.setValue(normalizedValue, { emitEvent: false });
    }

    control.markAsTouched();
    control.updateValueAndValidity({ emitEvent: false });
  }

  onDateSelected(controlName: 'dob' | 'anniversary', value: Date | null): void {
    const formatted = value ? this.formatDisplayDate(value) : '';
    this.prayerForm.controls[controlName].setValue(formatted);
    this.prayerForm.controls[controlName].markAsTouched();
    this.prayerForm.controls[controlName].updateValueAndValidity();
  }

  get successIconClass(): string {
    return this.showMemberDates() ? 'pi pi-check-circle' : 'pi pi-check';
  }

  getDateDisplayValue(controlName: 'dob' | 'anniversary'): string {
    const value = this.prayerForm.controls[controlName].value;
    return typeof value === 'string' ? value : '';
  }

  hasDateError(controlName: 'dob' | 'anniversary'): boolean {
    const control = this.prayerForm.controls[controlName];

    if (!control.errors) {
      return false;
    }

    if (this.dateFieldEditing[controlName] && control.errors['incompleteDate']) {
      return false;
    }

    return control.touched || control.dirty;
  }

  getDateErrorMessage(controlName: 'dob' | 'anniversary'): string {
    const errors = this.prayerForm.controls[controlName].errors;

    if (!errors) {
      return '';
    }

    if (errors['invalidDay']) {
      return 'Date must be between 01 and 31';
    }

    if (errors['invalidMonth']) {
      return 'Month must be between 01 and 12';
    }

    if (errors['incompleteDate']) {
      return 'Complete the date in DD/MM/YYYY format';
    }

    if (errors['invalidDate'] || errors['matDatepickerParse']) {
      return 'Enter a valid date in DD/MM/YYYY format';
    }

    return 'Enter a valid date in DD/MM/YYYY format';
  }

  handleSuccessAction(): void {
    if (this.showMemberDates()) {
      this.resetFormState();
      this.submitted.set(false);
      return;
    }

    void this.router.navigate(['/member-details']);
  }

  private formatDate(value: string | Date | null): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : this.parseDisplayDate(value);

    if (!date || Number.isNaN(date.getTime())) {
      return '';
    }

    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
  }

  private formatDisplayDate(date: Date): string {
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');

    return `${day}/${month}/${date.getFullYear()}`;
  }

  private dateInputValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? { invalidDate: true } : null;
      }

      const rawValue = String(value).trim();

      if (!rawValue) {
        return null;
      }

      const parts = rawValue.split('/');
      const [dayPart = '', monthPart = '', yearPart = ''] = parts;

      if (dayPart.length === 2 && Number(dayPart) > 31) {
        return { invalidDay: true };
      }

      if (monthPart.length === 2 && Number(monthPart) > 12) {
        return { invalidMonth: true };
      }

      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(rawValue)) {
        return { incompleteDate: true };
      }

      return this.parseDisplayDate(rawValue) ? null : { invalidDate: true };
    };
  }

  private normalizeDateString(value: string): string {
    const parts = value.split('/').slice(0, 3);
    const [day = '', month = '', year = ''] = parts;

    if (!month && !year) {
      return day;
    }

    if (month && !year) {
      return `${day}/${month}`;
    }

    if (!month || !year) {
      return `${day}${month ? `/${month}` : ''}`;
    }

    const normalizedDay = day.padStart(2, '0').slice(-2);
    const normalizedMonth = month.padStart(2, '0').slice(-2);

    return `${normalizedDay}/${normalizedMonth}/${year.slice(0, 4)}`;
  }

  private formatDateWhileTyping(
    rawValue: string,
    caretPosition: number,
    isDeleting: boolean
  ): string {
    const sanitizedValue = rawValue.replace(/[^\d/]/g, '');

    if (!sanitizedValue.includes('/')) {
      return this.formatSequentialDigits(sanitizedValue, !isDeleting);
    }

    const rawParts = sanitizedValue.split('/').slice(0, 3);
    const [day = '', month = '', year = ''] = rawParts;
    const normalizedDay = day.replace(/\D/g, '').slice(0, 2);
    const normalizedMonth = month.replace(/\D/g, '').slice(0, 2);
    const normalizedYear = year.replace(/\D/g, '').slice(0, 4);
    const endsWithSlash = sanitizedValue.endsWith('/');
    const slashCount = (sanitizedValue.match(/\//g) || []).length;
    let formatted = normalizedDay;

    if (!normalizedMonth && !normalizedYear) {
      if (!isDeleting && slashCount > 0) {
        return `${normalizedDay}/`;
      }

      return slashCount > 1 ? normalizedDay : sanitizedValue;
    }

    formatted += `/${normalizedMonth}`;

    if (normalizedYear || (normalizedMonth && slashCount > 1)) {
      formatted += `/${normalizedYear}`;
    }

    const isTypingAtEnd = caretPosition === sanitizedValue.length;
    const monthComplete =
      rawParts.length === 2 &&
      normalizedDay.length === 2 &&
      normalizedMonth.length === 2 &&
      !normalizedYear;

    if (!isDeleting && isTypingAtEnd && monthComplete && !formatted.endsWith('/')) {
      formatted += '/';
    }

    return this.trimEmptyDateSections(formatted);
  }

  private formatSequentialDigits(value: string, appendSlash: boolean): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 2) {
      return appendSlash && digits.length === 2 ? `${digits}/` : digits;
    }

    if (digits.length <= 4) {
      const formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      return appendSlash && digits.length === 4 ? `${formatted}/` : formatted;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  private trimEmptyDateSections(value: string): string {
    let trimmedValue = value;

    while (trimmedValue.endsWith('//')) {
      trimmedValue = trimmedValue.slice(0, -1);
    }

    return trimmedValue;
  }

  private parseDisplayDate(value: string): Date | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

    if (!match) {
      return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const parsedDate = new Date(year, month, day);

    return parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month &&
      parsedDate.getDate() === day
      ? parsedDate
      : null;
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
          this.resetFormState();
        },
        error: (err) => {
          // Apps Script may still execute even if CORS blocks response
          if (err?.status === 0) {
            this.submitted.set(true);
            this.resetFormState();
            return;
          }

          this.submitError = 'Something went wrong. Please try again.';
        },
      });
  }

  private resetFormState(): void {
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
    this.submitError = '';
    this.dateFieldEditing.dob = false;
    this.dateFieldEditing.anniversary = false;
    this.prayerForm.markAsPristine();
    this.prayerForm.markAsUntouched();
  }
}
