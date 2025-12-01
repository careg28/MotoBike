import { CommonModule } from '@angular/common';
import { Component, HostListener, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { SUPPORTED_LANGS, DEFAULT_LANG, isLang, LangCode } from '../../../i18n/i18n.config';

@Component({
  selector: 'app-header',
  imports: [RouterModule,TranslateModule,CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  
menuOpen = false;
  toggleMenu() { this.menuOpen = !this.menuOpen; }
  closeMenu() { this.menuOpen = false; }

     constructor(private t: TranslateService) {
    // estado inicial desde localStorage (sin tocar APIs deprecadas)
    const saved = localStorage.getItem('lang');
    this.active.set(isLang(saved) ? (saved as LangCode) : DEFAULT_LANG);
    // sync por evento
    this.sub = this.t.onLangChange.subscribe(ev => {
      if (isLang(ev.lang)) this.active.set(ev.lang);
    });
  }

  private sub?: Subscription;
  openLang = false;
  active = signal<LangCode>(DEFAULT_LANG);

  langs: Array<{ code: LangCode; name: string; flagSrc: string }> = [
  { code: 'es', name: 'Español', flagSrc: '/flags/es.svg' },
  { code: 'en', name: 'English', flagSrc: '/flags/gb.svg' },
  { code: 'de', name: 'Deutsch', flagSrc: '/flags/de.svg' }
];

  get current() { return this.langs.find(l => l.code === this.active()) ?? this.langs[0]; }

  toggleLang() { this.openLang = !this.openLang; }
  closeLang()  { this.openLang = false; }
  setLang(code: LangCode) {
    this.t.use(code);                 
    localStorage.setItem('lang', code);
    document.documentElement.lang = code;
    this.closeLang();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.lang')) this.closeLang();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}