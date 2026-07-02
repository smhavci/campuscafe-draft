import { Component, OnInit, AfterViewInit, signal, OnDestroy } from '@angular/core';
import { CafeService, Cafe } from '../../core/services/cafe.service';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

declare let L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './map.html',
  styleUrl: './map.css'
})
export class MapPage implements OnInit, AfterViewInit, OnDestroy {
  cafes = signal<Cafe[]>([]);
  map: any;
  userLocationMarker: any;

  constructor(private cafeService: CafeService) {}

  ngOnInit(): void {
    this.cafeService.getCafes().subscribe(cafes => {
      this.cafes.set(cafes);
      if (this.map) {
        this.addMarkers();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    // Akdeniz Üniversitesi Kampüsü merkezli (yaklaşık)
    this.map = L.map('map').setView([36.897, 30.638], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      className: 'map-tiles'
    }).addTo(this.map);

    this.addMarkers();
    this.getUserLocation();
  }

  private addMarkers(): void {
    if (!this.map || this.cafes().length === 0) return;

    this.cafes().forEach(cafe => {
      if (cafe.latitude && cafe.longitude) {
        const marker = L.marker([cafe.latitude, cafe.longitude])
          .addTo(this.map)
          .bindPopup(`
            <div class="map-popup">
              <img src="${cafe.image}" style="width:100%; border-radius:8px; margin-bottom:8px;">
              <h3 style="margin:0 0 4px; font-size:1rem;">${cafe.name}</h3>
              <p style="margin:0 0 8px; font-size:0.8rem; color:rgba(255,255,255,0.6);">${cafe.location}</p>
              <a href="/cafe/${cafe.slug}" style="
                display:block; 
                background:#c8a97e; 
                color:#000; 
                text-align:center; 
                padding:6px; 
                border-radius:6px; 
                text-decoration:none; 
                font-weight:700;
                font-size:0.85rem;
              ">Menüyü Gör</a>
            </div>
          `);
      }
    });
  }

  private getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
          }

          const userIcon = L.divIcon({
            className: 'user-location-icon',
            html: '<div class="user-dot"></div>',
            iconSize: [20, 20]
          });

          this.userLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
          this.userLocationMarker.bindPopup('Siz buradasınız').openPopup();
        },
        (error) => {
          console.error('Konum alınamadı:', error);
        }
      );
    }
  }

  centerOnCafe(cafe: Cafe): void {
    if (cafe.latitude && cafe.longitude) {
      this.map.setView([cafe.latitude, cafe.longitude], 18, { animate: true });
    }
  }
}
