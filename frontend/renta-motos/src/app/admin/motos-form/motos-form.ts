import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { MotoApi, CreateMotoPayload } from '../../core/moto-api';
import { MediaApi, MediaItem } from '../../core/media-api';
import { ModeloApi, Modelo } from '../../core/modelo-api';

type Estado = 'disponible'|'reservada'|'mantenimiento'|'retirada';
type Categoria = 'scooter'|'125cc'|'250cc'|'moto';

@Component({
  selector: 'app-motos-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './motos-form.html',
  styleUrls: ['./motos-form.scss'],
})
export class MotosForm {
  private fb = inject(FormBuilder);
  private api = inject(MotoApi);
  private mediaApi = inject(MediaApi);
  private modeloApi = inject(ModeloApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = signal(false);
  error  = signal<string | null>(null);

  // modo edición
  editing = signal(false);
  motoId  = signal<number | null>(null);

  // modelos
  modelos         = signal<Modelo[]>([]);
  modelosLoading  = signal(false);

  categorias = ['scooter', '125cc', '250cc', 'moto'] as const;
  estados    = ['disponible','reservada','mantenimiento','retirada'] as const;
  private KNOWN_SPECS = ['motor','consumo','velocidad','deposito','asiento','baul','frenos','peso'];

  form = this.fb.group({
    // NUEVO: relación con plantilla de modelo
    modelo_id:   [null as number | null],

    slug:        ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/^[a-z0-9-]+$/)]],
    marca:       ['', [Validators.required]],
    modelo:      ['', [Validators.required]],
    anio:        [2024 as number | null],
    matricula:   ['', [Validators.required, Validators.pattern(/^[0-9]{4}[- ]?[A-Z]{3}$/)]],
    vin:         [''],
    color:       [''],
    categoria:   ['125cc' as Categoria, [Validators.required]],
    estado:      ['disponible' as Estado, [Validators.required]],
    precio_dia:  [null as number | null, [Validators.required, Validators.min(0)]],
    deposito:    [150 as number | null, [Validators.required, Validators.min(0)]],
    kilometraje: [0 as number | null, [Validators.min(0)]],
    ubicacion:   ['Valencia'],
    imagenes:    this.fb.array<string>([] as any),

    tag:         [''],
    // specs conocidos
    specs: this.fb.group({
      motor: [''], consumo: [''], velocidad: [''], deposito: [''],
      asiento: [''], baul: [''], frenos: [''], peso: [''],
    }),
    // specs extra (pares clave/valor)
    specsExtra: this.fb.array<{key:string; value:string}>([] as any),

    badges:      [''],
    notas:       [''],
  });

  // Galería
  mediaList     = signal<MediaItem[]>([]);
  mediaLoading  = signal(false);
  mediaSearch   = signal('');
  mediaPage     = signal(1);
  mediaLastPage = signal(1);

  constructor() {
    // arranque
    this.ensureAtLeastOneImageField();
    this.ensureAtLeastOneSpecExtraRow();
    this.loadMedia(1);
    this.loadModelos();
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
    const modelo = (this.form.controls.modelo.value || '').toString();
    const base = `${marca} ${modelo}`.trim();
    const slug = base.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this.form.controls.slug.setValue(slug);
  }

  onMatriculaInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const up = (el.value || '').toUpperCase();
    if (up !== el.value) el.value = up;
    this.form.controls.matricula.setValue(up, { emitEvent: false });
  }

  // ---------- modelos ----------
  loadModelos() {
    this.modelosLoading.set(true);
    this.modeloApi.list().subscribe({
      next: (arr) => { this.modelos.set(arr); this.modelosLoading.set(false); },
      error: () => { this.modelos.set([]); this.modelosLoading.set(false); }
    });
  }

  onModeloChange(idStr: string) {
    const id = Number(idStr || 0) || null;
    this.form.controls['modelo_id'].setValue(id);
    if (!id) return;
    const mod = this.modelos().find(m => m.id === id);
    if (!mod) return;

    // Rellenar defaults si están vacíos (no pisar lo que el usuario ya escribió)
    const f = this.form.controls;
    if (!f.marca.value)       f.marca.setValue(mod.marca);
    if (!f.modelo.value)      f.modelo.setValue(mod.nombre);
    if (!f.categoria.value)   f.categoria.setValue(mod.categoria);
    if (!f.precio_dia.value)  f.precio_dia.setValue(mod.precio_base);
    if (!f.deposito.value && mod.deposito_sugerido != null) f.deposito.setValue(mod.deposito_sugerido);

    // imágenes (si no hay ya)
    if (this.imagenesFA.length === 1 && !this.imagenesFA.at(0).value && (mod.imagenes?.length)) {
      this.clearFormArray(this.imagenesFA);
      mod.imagenes!.forEach(u => this.imagenesFA.push(this.fb.control(u)));
      this.ensureAtLeastOneImageField();
    }

    // specs fijas (si están vacías)
    const known = this.KNOWN_SPECS;
    const curSpecs = (this.form.controls.specs.getRawValue() ?? {}) as Record<string,string>;
    const hasAny = Object.values(curSpecs).some(v => (v ?? '').toString().trim() !== '');
    if (!hasAny && mod.specs) {
      known.forEach(k => {
        const v = (mod.specs as any)[k];
        if (v) (this.form.controls.specs.get(k) as any)?.setValue(v);
      });
    }

    // badges (si vacío)
    const b = (this.form.controls.badges.value || '').toString().trim();
    if (!b && mod.badges?.length) this.form.controls.badges.setValue(mod.badges.join(', '));
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
      next: (moto) => {
        this.motoId.set(moto.id);

        // campos básicos
        this.form.patchValue({
          modelo_id: (moto as any).modelo_id ?? null,
          slug: moto.slug,
          marca: moto.marca,
          modelo: moto.modelo,
          anio: moto.anio ?? null,
          matricula: (moto.matricula ?? '').toUpperCase(),
          vin: moto.vin ?? '',
          color: moto.color ?? '',
          categoria: (moto.categoria as Categoria) ?? '125cc',
          estado: (moto.estado as Estado) ?? 'disponible',
          precio_dia: Number(moto.precio_dia),
          deposito: moto.deposito != null ? Number(moto.deposito) : 150,
          kilometraje: moto.kilometraje ?? 0,
          ubicacion: moto.ubicacion ?? 'Valencia',
          tag: moto.tag ?? '',
          badges: (moto.badges ?? []).join(', '),
          notas: moto.notas ?? '',
        });

        // imágenes
        this.clearFormArray(this.imagenesFA);
        (moto.imagenes ?? []).forEach(u => this.imagenesFA.push(this.fb.control(u)));
        this.ensureAtLeastOneImageField();

        // specs: separar conocidas y extras
        const specs = moto.specs || {};
        // conocidas
        const specsGroup = this.form.controls.specs;
        (this.KNOWN_SPECS as string[]).forEach(k => {
          const v = (specs as any)[k];
          (specsGroup.get(k) as any)?.setValue(v ?? '');
        });
        // extras
        const extraEntries = Object.entries(specs).filter(([k]) => !this.KNOWN_SPECS.includes(k));
        this.clearFormArray(this.specsExtraFA);
        extraEntries.forEach(([key, value]) => {
          this.specsExtraFA.push(this.fb.group({ key: [key], value: [String(value ?? '')] }));
        });
        this.ensureAtLeastOneSpecExtraRow();
      },
      error: () => this.error.set('No se pudo cargar la moto para edición.')
    });
  }

  private clearFormArray(fa: FormArray) {
    while (fa.length) fa.removeAt(0);
  }

  // ---------- submit ----------
  private buildPayload(): CreateMotoPayload {
    const raw = this.form.getRawValue();

    // specs combinadas = conocidas + extra (solo pares válidos)
    const fixedSpecs = raw.specs || {};
    const extraPairs = (raw.specsExtra as unknown as Array<{key:string; value:string}>) || [];
    const extrasObj = Object.fromEntries(
      extraPairs
        .map(p => [String(p.key || '').trim(), String(p.value || '').trim()] as [string,string])
        .filter(([k,v]) => k.length > 0 && v.length > 0)
    );
    const specsMerged = { ...fixedSpecs, ...extrasObj };

    const payload: CreateMotoPayload = {
      // relación
      ...(raw.modelo_id ? { modelo_id: Number(raw.modelo_id) } : {}),

      // obligatorios
      slug:       raw.slug!,
      categoria:  raw.categoria as Categoria,
      precio_dia: Number(raw.precio_dia),
      matricula:  (raw.matricula || '').toString().trim().toUpperCase(),

      // si NO usas modelo_id, enviamos marca/modelo (el backend tiene required_without)
      ...(raw.modelo_id ? {} : { marca: raw.marca!, modelo: raw.modelo! }),

      // opcionales
      estado:      (raw.estado ?? 'disponible') as Estado,
      anio:        raw.anio ? Number(raw.anio) : null,
      vin:         raw.vin ? String(raw.vin).trim().toUpperCase() : null,
      color:       raw.color || null,
      deposito:    Number(raw.deposito),
      kilometraje: raw.kilometraje != null ? Number(raw.kilometraje) : 0,
      ubicacion:   raw.ubicacion || null,
      imagenes:    (raw.imagenes as unknown as string[]).map(s => s.trim()).filter(Boolean),
      tag:         raw.tag || null,
      specs:       Object.fromEntries(Object.entries(specsMerged).filter(([_,v]) => String(v ?? '').trim() !== '')),
      badges:      (raw.badges || '').split(',').map(s => s.trim()).filter(Boolean),
      notas:       raw.notas || null,
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

    if (this.editing() && this.motoId()) {
      // UPDATE
      this.api.update(this.motoId()!, payload).subscribe({
        next: () => { this.saving.set(false); this.router.navigateByUrl('/admin/motos'); },
        error: (err) => this.handleError(err)
      });
    } else {
      // CREATE
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
      this.error.set(err?.error?.message || 'No se pudo guardar la moto.');
    }
    this.saving.set(false);
  }
}