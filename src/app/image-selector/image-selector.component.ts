import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    FormsModule
  ],
  templateUrl: './image-selector.component.html',
  styleUrl: './image-selector.component.css'
})
export class ImageSelectorComponent implements OnChanges {

  imageUrl: any;
  urlBox: string = '/pics/present.jpeg';
  
  @Input() displayPicture: boolean = true;
  @Input() initialImageUrl: string = '/pics/present.jpeg';
  @Output() imageSelected = new EventEmitter<string>();

  @Input() labels = {
    loadPicture: "Load a picture",
    enterUrl: "Enter a URL",
    imagePreviewAlt: "Image Preview",
    uploadTab: "Upload File",
    urlTab: "Image URL",
    dropPrompt: "Drag & drop image here or click to browse",
    dropActive: "Drop the image now!",
    clearImage: "Clear",
    resetDefault: "Reset",
    urlHint: "Enter a valid image URL (PNG, JPG, ...)"
  };

  activeTab: 'file' | 'url' = 'file';
  isDragOver: boolean = false;

  constructor() {}

  setImageUrl(url: string): void {
    this.imageUrl = url;
    this.urlBox = url;
    this.detectTab(url);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('initialImageUrl' in changes) {
      const normalized = this.normalizeImageUrl(this.initialImageUrl);
      this.setImageUrl(normalized);
    }
  }

  detectTab(url: string): void {
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http') || cleanUrl.startsWith('/pics/themes') || cleanUrl.startsWith('/pics/christmas') || cleanUrl.startsWith('pics/')) {
      this.activeTab = 'url';
    } else {
      this.activeTab = 'file';
    }
  }

  selectTab(tab: 'file' | 'url'): void {
    this.activeTab = tab;
  }

  resetToDefault(): void {
    const def = '/pics/present.jpeg';
    this.imageUrl = def;
    this.urlBox = def;
    this.imageSelected.emit(def);
  }

  onChange(event: any) {
    const file: File = event.target.files[0];
    this.handleFile(file);
  }

  private handleFile(file: File): void {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imageUrl = reader.result as string;
        this.imageSelected.emit(this.imageUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type.match('image.*')) {
        this.handleFile(file);
      }
    }
  }

  onChangeImageUrl(urlValue: string): void {
    const url = this.normalizeImageUrl(urlValue);
    this.imageUrl = url;
    this.imageSelected.emit(this.imageUrl);
  }

  private normalizeImageUrl(urlValue: string | null | undefined): string {
    const url = (urlValue || '').trim();
    if (!url) {
      return '/pics/present.jpeg';
    }
    if (url.startsWith('www.')) {
      return `https://${url}`;
    }
    if (url.startsWith('pics/')) {
      return `/${url}`;
    }
    return url;
  }
}
