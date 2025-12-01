import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule,TranslateModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class Contact {
  form;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required],
    });
  }

  submitForm() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
