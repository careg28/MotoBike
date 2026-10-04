import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../enviroments/enviroment';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {

  form;
  sending = false;
  success = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private translate: TranslateService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required],
    });
  }

  submitForm() {

    if (!this.form.valid || this.sending) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending = true;
    this.error = null;
    this.success = false;

    this.http.post(`${environment.apiUrl}/contact`, this.form.value)
      .subscribe({
        next: () => {

          this.success = true;
          this.sending = false;

          this.form.reset();

        },
        error: () => {

          this.error = this.translate.instant('contact.form.error');
          this.sending = false;

        }
      });
  }
}