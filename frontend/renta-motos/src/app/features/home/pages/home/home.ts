import { Component } from '@angular/core';
import { Benefits } from "../../../../shared/components/benefits/benefits";
import { ModelsFeatured } from "../../components/models-featured/models-featured";
import { HowItWorks } from "../../components/how-it-works/how-it-works";
import { WideCta } from "../../components/wide-cta/wide-cta";
import { Contact } from "../../components/contact/contact";

@Component({
  selector: 'app-home',
  imports: [Benefits, ModelsFeatured, HowItWorks, WideCta, Contact],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {

}
