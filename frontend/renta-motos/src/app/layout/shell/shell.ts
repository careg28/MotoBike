import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../shared/components/header/header';
import { HeroHeader } from "../../shared/components/hero-header/hero-header";
import { Footer } from "../../features/home/components/footer/footer";



@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, HeroHeader, Footer],
  templateUrl: './shell.html',
  styleUrl: './shell.scss'
})
export class Shell {

}
