import { Component, input, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-padelcraft-logo",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      src="assets/favicon.svg"
      alt="Padeleria"
      class="logo"
      [style.width.px]="size()"
      [style.height.px]="size()"
    />
  `,
  styles: `
    .logo {
      display: block;
      object-fit: contain;
    }
  `,
})
export class PadelCraftLogoComponent {
  readonly size = input<number>(44);
}
