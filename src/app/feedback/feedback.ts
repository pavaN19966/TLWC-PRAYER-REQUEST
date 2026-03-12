import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerModule],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class FeedbackComponent implements OnInit {

  submitted = signal(false);
  isSubmitting = false;
  submitError = '';
  logoSrc = 'assets/TLWC.jpg?v=2';

  apiUrl = 'https://script.google.com/macros/s/AKfycby3cSmc5sAqyAs7dNVtjab8M1RJ9WwaEeZbfpcGKl7k6fOBqvdIINbvU1C1GHYWtnls/exec';

  private readonly fb = inject(FormBuilder);

  constructor(private http: HttpClient) {}

  prayerForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],

    dob: [''],
    dobYear: ['', [Validators.pattern(/^\d{4}$/)]],
    anniversary: [''],   // 🔥 Changed to match HTML
    anniversaryYear: ['', [Validators.pattern(/^\d{4}$/)]],
    place: [''],
    churchGroup: [false],
    youthGroup: [false],
    girlsGroup: [false],

    prayerRequest: [''],
    feedback: ['']
  });
  
 allowNumbersOnly(event: any) {
  event.target.value = event.target.value.replace(/[^0-9]/g, '');
}

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.endsWith('/TLWC.jpg')) {
      img.src = 'TLWC.jpg';
    }
  }

  ngOnInit(): void {}

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
      place: formValue.place,
      prayerRequest: formValue.prayerRequest,
    });

    this.http.post(this.apiUrl, payload, {
      responseType: 'text'
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
          place: '',
          prayerRequest: ''
        });
      },
      error: (err) => {

        // Apps Script may still execute even if CORS blocks response
        if (err?.status === 0) {
          this.submitted.set(true);
          this.prayerForm.reset({
            name: '',
            phone: '',
            place: '',
            prayerRequest: ''
          });
          return;
        }

        this.submitError = 'Something went wrong. Please try again.';
      },
    });
  }
}
