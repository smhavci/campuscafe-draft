import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cafe } from '../../core/services/cafe.service';

@Component({
    selector: 'app-cafe-card',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './cafe-card.html',
    styleUrl: './cafe-card.css'
})
export class CafeCard {
    @Input({ required: true }) cafe!: Cafe;
}
