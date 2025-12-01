import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { ModeloApi, Modelo } from '../../core/modelo-api';
import { MediaApi, MediaItem } from '../../core/media-api';

type Categoria = 'scooter'|'125cc'|'250cc'|'moto';

@Component({
  selector: 'app-modelos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './modelos-form.html',
  styleUrls: ['./modelos-form.scss'],
})
export class ModelosForm {
  private fb = inject(FormBuilder);
  private api = inject(ModeloApi);
  private mediaApi = inject(MediaApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = signal(false);
  error  = signal<string | null>(null);

  // modo edición
  editing = signal(false);
  modeloId  = signal<number | null>(null);

  categorias = ['scooter', '125cc', '250cc', 'moto'] as const;
  private KNOWN_SPECS = ['motor','consumo','velocidad','deposito','asiento','baul','frenos','peso'];

  form = this.fb.group({
    slug:        ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/^[a-z0-9-]+$/)]],
    marca:       ['', [Validators.required]],
    nombre:      ['', [Validators.required]],
    categoria:   ['125cc' as Categoria, [Validators.required]],
    precio_base: [null as number | null, [Validators.required, Validators.min(0)]],
    deposito_sugerido: [null as number | null, [Validators.min(0)]],
    descripcion: [''],

    imagenes:    this.fb.array<string>([] as any),

    // specs conocidos
    specs: this.fb.group({
      motor: [''], consumo: [''], velocidad: [''], deposito: [''],
      asiento: [''], baul: [''], frenos: [''], peso: [''],
    }),
    // specs extra (pares clave/valor)
    specsExtra: this.fb.array<{key:string; value:string}>([] as any),

    badges:      [''], // separado por comas
  });

  // Galería
  mediaList     = signal<MediaItem[]>([]);
  mediaLoading  = signal(false);
  mediaSearch   = signal('');
  mediaPage     = signal(1);
  mediaLastPage = signal(1);

  constructor() {
    this.ensureAtLeastOneImageField();
    this.ensureAtLeastOneSpecExtraRow();
    this.loadMedia(1);
    this.initFromRoute();
  }

  // ---------- helpers form ----------
  get imagenesFA(): FormArray { return this.form.get('imagenes') as FormArray; }
  get specsExtraFA(): FormArray { return this.form.get('specsExtra') as FormArray; }

  private ensureAtLeastOneImageField() {
    if (this.imagenesFA.length === 0) this.imagenesFA.push(this.fb.control(''));
  }
  private ensureAtLeastOneSpecExtraRow() {
    if (this.specsExtraFA.length === 0) this.addSpecExtra();
  }
  addImg()             { this.imagenesFA.push(this.fb.control('')); }
  removeImg(i: number) { this.imagenesFA.removeAt(i); this.ensureAtLeastOneImageField(); }

  addSpecExtra() {
    this.specsExtraFA.push(this.fb.group({ key: [''], value: [''] }));
  }
  removeSpecExtra(i: number) {
    this.specsExtraFA.removeAt(i);
    this.ensureAtLeastOneSpecExtraRow();
  }

  autoSlug() {
    const marca  = (this.form.controls.marca.value || '').toString();
    const nombre = (this.form.controls.nombre.value || '').toString();
    const base = `${marca} ${nombre}`.trim();
    const slug = base.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this.form.controls.slug.setValue(slug);
  }

  // ---------- media ----------
  loadMedia(page = 1) {
    this.mediaLoading.set(true);
    this.mediaApi.list(this.mediaSearch(), page).subscribe({
      next: (res) => {
        this.mediaList.set(res.data);
        this.mediaPage.set(res.current_page);
        this.mediaLastPage.set(res.last_page);
        this.mediaLoading.set(false);
      },
      error: () => this.mediaLoading.set(false)
    });
  }
  onMediaSearchInput(ev: Event) {
    const val = (ev.target as HTMLInputElement).value.trim();
    this.mediaSearch.set(val);
    this.loadMedia(1);
  }
  onUploadFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    this.saving.set(true);
    this.mediaApi.upload(files).subscribe({
      next: (items) => {
        items.forEach(i => this.imagenesFA.push(this.fb.control(i.url)));
        this.loadMedia(1);
        this.saving.set(false);
        input.value = '';
      },
      error: () => {
        this.error.set('No se pudieron subir las imágenes.');
        this.saving.set(false);
      }
    });
  }
  onPickFromGallery(item: MediaItem) {
    const urls = (this.imagenesFA.value as string[]).filter(Boolean);
    if (!urls.includes(item.url)) this.imagenesFA.push(this.fb.control(item.url));
  }

  // ---------- init (editar/crear) ----------
  private initFromRoute() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;

    this.editing.set(true);
    this.api.get(slug).subscribe({
      next: (modelo) => {
        this.modeloId.set(modelo.id);

        this.form.patchValue({
          slug: modelo.slug,
          marca: modelo.marca,
          nombre: modelo.nombre,
          categoria: modelo.categoria as Categoria,
          precio_base: Number(modelo.precio_base),
          deposito_sugerido: modelo.deposito_sugerido != null ? Number(modelo.deposito_sugerido) : null,
          descripcion: modelo.descripcion ?? '',
          badges: (modelo.badges ?? []).join(', '),
        });

        // imágenes
        this.clearFormArray(this.imagenesFA);
        (modelo.imagenes ?? []).forEach(u => this.imagenesFA.push(this.fb.control(u)));
        this.ensureAtLeastOneImageField();

        // specs: conocidas + extras
        const specs = modelo.specs || {};
        const specsGroup = this.form.controls.specs;
        (this.KNOWN_SPECS as string[]).forEach(k => {
          const v = (specs as any)[k];
          (specsGroup.get(k) as any)?.setValue(v ?? '');
        });

        const extraEntries = Object.entries(specs).filter(([k]) => !this.KNOWN_SPECS.includes(k));
        this.clearFormArray(this.specsExtraFA);
        extraEntries.forEach(([key, value]) => {
          this.specsExtraFA.push(this.fb.group({ key: [key], value: [String(value ?? '')] }));
        });
        this.ensureAtLeastOneSpecExtraRow();
      },
      error: () => this.error.set('No se pudo cargar el modelo para edición.')
    });
  }

  private clearFormArray(fa: FormArray) {
    while (fa.length) fa.removeAt(0);
  }

  // ---------- submit ----------
  private buildPayload(): Partial<Modelo> {
    const raw = this.form.getRawValue();

    const fixedSpecs = raw.specs || {};
    const extraPairs = (raw.specsExtra as unknown as Array<{key:string; value:string}>) || [];
    const extrasObj = Object.fromEntries(
      extraPairs
        .map(p => [String(p.key || '').trim(), String(p.value || '').trim()] as [string,string])
        .filter(([k,v]) => k.length > 0 && v.length > 0)
    );
    const specsMerged = Object.fromEntries(
      Object.entries({ ...fixedSpecs, ...extrasObj })
        .filter(([_, v]) => String(v ?? '').trim() !== '')
    );

    const payload: Partial<Modelo> = {
      slug:         raw.slug!,
      marca:        raw.marca!,
      nombre:       raw.nombre!,
      categoria:    raw.categoria as Categoria,
      precio_base:  Number(raw.precio_base),
      deposito_sugerido: raw.deposito_sugerido != null ? Number(raw.deposito_sugerido) : null,
      descripcion:  raw.descripcion || null,
      imagenes:     (raw.imagenes as unknown as string[]).map(s => s.trim()).filter(Boolean),
      specs:        specsMerged,
      badges:       (raw.badges || '').split(',').map(s => s.trim()).filter(Boolean),
    };

    return payload;
  }

  submit() {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos obligatorios.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const payload = this.buildPayload();

    if (this.editing() && this.modeloId()) {
      this.api.update(this.modeloId()!, payload).subscribe({
        next: () => { this.saving.set(false); this.router.navigateByUrl('/admin/motos'); },
        error: (err) => this.handleError(err)
      });
    } else {
      this.api.create(payload).subscribe({
        next: () => { this.saving.set(false); this.router.navigateByUrl('/admin/motos'); },
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleError(err: any) {
    if (err?.status === 422 && err?.error?.errors) {
      const first = (Object.values(err.error.errors)[0] as string[])[0];
      this.error.set(first || 'Datos inválidos.');
    } else if (err?.status === 401) {
      this.error.set('No autorizado. Inicia sesión de nuevo.');
    } else {
      this.error.set(err?.error?.message || 'No se pudo guardar el modelo.');
    }
    this.saving.set(false);
  }
}
