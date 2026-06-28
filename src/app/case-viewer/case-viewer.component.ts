import { Component, Inject, Optional, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Case } from '../case-builder/types';

@Component({
  selector: 'app-case-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './case-viewer.component.html',
  styleUrl: './case-viewer.component.css'
})
export class CaseViewerComponent {

  @Input() case: Case = { contents: [] };
  @Input() theme: string = 'default';
  @Input() assetUrlPrefix: string = '';
  
  @Input() labels = {
    close: "Close",
    noImage: "No image selected",
    videoNotSupported: "Your browser does not support video playback.",
    noVideo: "No video selected",
    noYouTube: "No YouTube URL configured",
    noLink: "No link configured",
    visit: "Visit"
  };

  @Output() closeEvent = new EventEmitter<void>();

  constructor(
    private sanitizer: DomSanitizer,
    @Optional() public dialogRef: MatDialogRef<CaseViewerComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: {
      myCase: Case;
      theme?: string;
      assetUrlPrefix?: string;
      labels?: any;
    }
  ) {
    if (this.data) {
      if (this.data.myCase) this.case = this.data.myCase;
      if (this.data.theme) this.theme = this.data.theme;
      if (this.data.assetUrlPrefix) this.assetUrlPrefix = this.data.assetUrlPrefix;
      if (this.data.labels) this.labels = { ...this.labels, ...this.data.labels };
    }
  }

  getSanitizedContent(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  getSafeYoutubeUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;
    const videoId = this.extractYoutubeVideoId(url);
    if (!videoId) return null;
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  private extractYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed.length === 11) return trimmed;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  getAbsoluteUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) {
      return url;
    }
    const prefix = this.assetUrlPrefix || '';
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const cleanPrefix = prefix.endsWith('/') ? prefix.substring(0, prefix.length - 1) : prefix;
    return cleanPrefix ? `${cleanPrefix}/${cleanUrl}` : cleanUrl;
  }

  getLinkLabel(content: string): string {
    if (!content) return this.labels.visit;
    return content.split('|')[0] || this.labels.visit;
  }

  getLinkUrl(content: string): string {
    if (!content) return '';
    return content.split('|')[1] || '';
  }

  close(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.closeEvent.emit();
    }
  }
}
