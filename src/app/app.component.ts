import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SnipService, SnipLink } from './snip.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private snip = inject(SnipService);

  inputUrl = signal('');
  shortLink = signal<SnipLink | null>(null);
  error = signal('');
  links = signal<SnipLink[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadLinks();
  }

  loadLinks() {
    this.snip.list().subscribe({
      next: (data) => this.links.set(data),
      error: () => {}
    });
  }

  submit() {
    const url = this.inputUrl().trim();
    if (!url.match(/^https?:\/\/.+/)) {
      this.error.set('URL must start with http:// or https://');
      return;
    }
    this.error.set('');
    this.shortLink.set(null);
    this.loading.set(true);
    this.snip.shorten(url).subscribe({
      next: (link) => {
        this.shortLink.set(link);
        this.inputUrl.set('');
        this.loading.set(false);
        this.loadLinks();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Request failed');
        this.loading.set(false);
      }
    });
  }
}
