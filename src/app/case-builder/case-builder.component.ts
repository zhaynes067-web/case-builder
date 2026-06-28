import { Component, EventEmitter, Output, Input, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { QuillModule } from 'ngx-quill';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Case } from './types';
import { ImageSelectorComponent } from '../image-selector/image-selector.component';

@Component({
  selector: 'app-case-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    QuillModule,
    FormsModule,
    ImageSelectorComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    MatGridListModule,
    MatTooltipModule,
    DragDropModule,
    UpperCasePipe
  ],
  templateUrl: './case-builder.component.html',
  styleUrl: './case-builder.component.css'
})
export class CaseBuilderComponent implements OnDestroy {

  @Input() case: Case = {
    contents: [],
    color: "#000000"
  };

  @Input() date: string = "";

  @Input() labels = {
    addBlocks: "Add Blocks",
    reset: "Reset",
    resetTooltip: "Reset all blocks",
    dragPrompt: "Drag & drop blocks here or click to insert",
    insertHere: "Insert here",
    addTextTooltip: "Add Text",
    addImageTooltip: "Add Image",
    addVideoTooltip: "Add Video",
    addYoutubeTooltip: "Add YouTube Video",
    addLinkTooltip: "Add Button Link",
    videoUrlLabel: "Video URL (.mp4, etc.)",
    youtubeUrlLabel: "YouTube URL",
    youtubeHint: "Paste a YouTube link or video ID",
    linkLabelLabel: "Button Label",
    linkLabelPlaceholder: "Click here",
    linkUrlLabel: "Button Destination URL",
    linkUrlPlaceholder: "https://example.com",
    imagePreviewAlt: "Image Preview",
    noImage: "No image selected",
    videoNotSupported: "Your browser does not support video playback.",
    noVideo: "No video selected",
    noYouTube: "No YouTube URL configured",
    noLink: "No link configured",
    moveUp: "Move Up",
    moveDown: "Move Down",
    deleteBlockTooltip: "Delete Block",
    loadingEditor: "Loading rich text editor...",
    editorPlaceholder: "Type your content here..."
  };

  @Output() caseChange = new EventEmitter<Case>();

  editorHtml = "";

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'header': [1, 2, 3, false] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  };

  currentEditor: string = "text";
  selectedCaseIndex: number | null = null;
  videoUrl: string = '';
  youtubeUrl: string = '';
  linkLabel: string = '';
  linkUrl: string = '';

  private pendingSave = false;
  private saveSubject = new Subject<void>();
  private saveSubscription!: Subscription;
  private sanitizedCache = new Map<string, SafeHtml>();

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    this.saveSubscription = this.saveSubject.pipe(
      debounceTime(1000)
    ).subscribe(() => {
      if (this.pendingSave) {
        this.pendingSave = false;
        this.saveCase();
      }
    });
  }

  ngOnDestroy() {
    if (this.pendingSave) {
      this.saveCase();
    }
    if (this.saveSubscription) {
      this.saveSubscription.unsubscribe();
    }
  }

  saveCaseDebounced() {
    this.pendingSave = true;
    this.saveSubject.next();
  }

  loadCase(caseData: Case, dateTitle?: string) {
    this.sanitizedCache.clear();
    this.case = caseData || { contents: [], color: "#000000" };
    this.date = dateTitle || "";
    this.selectedCaseIndex = null;

    if (this.case.contents && this.case.contents.length > 0) {
      this.selectedCaseIndex = 0;
      const first = this.case.contents[0];
      if (first.type === 'text') {
        this.currentEditor = 'text';
        this.editorHtml = first.content;
      } else if (first.type === 'image') {
        this.currentEditor = 'image';
      } else if (first.type === 'video') {
        this.currentEditor = 'video';
        this.videoUrl = first.content;
      } else if (first.type === 'youtube') {
        this.currentEditor = 'youtube';
        this.youtubeUrl = first.content;
      } else if (first.type === 'link') {
        this.currentEditor = 'link';
        const parts = (first.content || '').split('|');
        this.linkLabel = parts[0] || 'Visiter';
        this.linkUrl = parts[1] || '';
      }
    }
    this.cdr.detectChanges();
  }

  clickResetIcon() {
    this.sanitizedCache.clear();
    this.currentEditor = "text";
    this.case = {
      contents: [],
      color: "#000000"
    };
    this.case.contents.push({ type: "text", content: "Type your text here ...." });
    this.selectedCaseIndex = this.case.contents.length - 1;
    this.editorHtml = this.case.contents[this.selectedCaseIndex].content;
    this.saveCase();
  }

  clickDeleteIcon(indexToDelete?: number) {
    const index = indexToDelete ?? this.selectedCaseIndex;
    if (index != null && this.case.contents) {
      this.case.contents.splice(index, 1);
      if (this.selectedCaseIndex === index) {
        this.selectedCaseIndex = null;
      }
      this.saveCase();
    }
  }

  saveCase() {
    this.pendingSave = false;
    this.caseChange.emit(this.case);
  }

  onChangeVideoUrl(event: Event): void {
    const target = event.target as HTMLInputElement;
    const url = target.value.trim();
    if (this.selectedCaseIndex !== null && this.case.contents[this.selectedCaseIndex].type === 'video') {
      this.case.contents[this.selectedCaseIndex].content = url;
      this.videoUrl = url;
      this.saveCase();
    }
  }

  onChangeYoutubeUrl(event: Event): void {
    const target = event.target as HTMLInputElement;
    const url = target.value.trim();
    if (this.selectedCaseIndex !== null && this.case.contents[this.selectedCaseIndex].type === 'youtube') {
      const videoId = this.extractYoutubeVideoId(url);
      const finalUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      this.case.contents[this.selectedCaseIndex].content = finalUrl;
      this.youtubeUrl = finalUrl;
      target.value = finalUrl;
      this.saveCase();
    }
  }

  onChangeLinkLabel(event: Event): void {
    const target = event.target as HTMLInputElement;
    const label = target.value;
    if (this.selectedCaseIndex !== null && this.case.contents[this.selectedCaseIndex].type === 'link') {
      this.linkLabel = label;
      this.case.contents[this.selectedCaseIndex].content = `${this.linkLabel}|${this.linkUrl}`;
      this.saveCase();
    }
  }

  onChangeLinkUrl(event: Event): void {
    const target = event.target as HTMLInputElement;
    const url = target.value.trim();
    if (this.selectedCaseIndex !== null && this.case.contents[this.selectedCaseIndex].type === 'link') {
      this.linkUrl = url;
      this.case.contents[this.selectedCaseIndex].content = `${this.linkLabel}|${this.linkUrl}`;
      this.saveCase();
    }
  }

  getLinkLabel(content: string): string {
    if (!content) return 'Visiter';
    return content.split('|')[0] || 'Visiter';
  }

  getLinkUrl(content: string): string {
    if (!content) return '';
    return content.split('|')[1] || '';
  }

  onEditorContentChange(newHtml: string | null) {
    if (
      this.selectedCaseIndex !== null &&
      this.case.contents &&
      this.case.contents[this.selectedCaseIndex] &&
      this.case.contents[this.selectedCaseIndex].type === 'text'
    ) {
      if (typeof newHtml === "string") {
        this.case.contents[this.selectedCaseIndex].content = newHtml;
      }
      this.cdr.detectChanges();
      this.saveCaseDebounced();
    }
  }

  onImageSelected(imageUrl: string): void {
    if (this.selectedCaseIndex !== null && this.case.contents[this.selectedCaseIndex].type === 'image') {
      this.case.contents[this.selectedCaseIndex].content = imageUrl;
      this.saveCase();
    }
  }

  selectCase(index: number) {
    if (!this.case.contents) return;
    this.selectedCaseIndex = index;
    const selectedContent = this.case.contents[index];
    if (selectedContent.type === 'text') {
      this.currentEditor = 'text';
      this.editorHtml = selectedContent.content;
    } else if (selectedContent.type === 'image') {
      this.currentEditor = 'image';
    } else if (selectedContent.type === 'video') {
      this.currentEditor = 'video';
      this.videoUrl = selectedContent.content;
    } else if (selectedContent.type === 'youtube') {
      this.currentEditor = 'youtube';
      this.youtubeUrl = selectedContent.content;
    } else if (selectedContent.type === 'link') {
      this.currentEditor = 'link';
      const parts = (selectedContent.content || '').split('|');
      this.linkLabel = parts[0] || 'Visiter';
      this.linkUrl = parts[1] || '';
    }
  }

  getSanitizedContent(content: string): SafeHtml {
    if (!content) {
      return '';
    }
    let sanitized = this.sanitizedCache.get(content);
    if (!sanitized) {
      sanitized = this.sanitizer.bypassSecurityTrustHtml(content);
      this.sanitizedCache.set(content, sanitized);
    }
    return sanitized;
  }

  getSafeYoutubeUrl(url: string): SafeResourceUrl | null {
    if (!url) {
      return null;
    }
    const videoId = this.extractYoutubeVideoId(url);
    if (!videoId) {
      return null;
    }
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  private extractYoutubeVideoId(url: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed.length === 11) {
      return trimmed;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  addBlock(type: string, index?: number): void {
    if (!this.case.contents) {
      this.case.contents = [];
    }

    let newItem: { type: any; content: string; };

    switch (type) {
      case 'text':
        newItem = { type: "text", content: "Type your text here ...." };
        break;
      case 'image':
        newItem = { type: "image", content: "/pics/present.jpeg" };
        break;
      case 'video':
        newItem = { type: "video", content: "https://www.pexels.com/fr-fr/download/video/35872527/" };
        break;
      case 'youtube':
        newItem = { type: "youtube", content: "https://www.youtube.com/embed/2OEL4P1Rz04" };
        break;
      case 'link':
        newItem = { type: "link", content: "Visiter|https://example.com" };
        break;
      default:
        return;
    }

    if (index !== undefined && index >= 0) {
      this.case.contents.splice(index, 0, newItem);
      this.selectCase(index);
    } else {
      this.case.contents.push(newItem);
      this.selectCase(this.case.contents.length - 1);
    }
    this.saveCase();
  }

  moveBlock(index: number, direction: 'up' | 'down'): void {
    if (!this.case.contents) return;
    if (direction === 'up' && index > 0) {
      moveItemInArray(this.case.contents, index, index - 1);
      this.selectedCaseIndex = index - 1;
      this.saveCase();
    } else if (direction === 'down' && index < this.case.contents.length - 1) {
      moveItemInArray(this.case.contents, index, index + 1);
      this.selectedCaseIndex = index + 1;
      this.saveCase();
    }
  }

  onBlockDropped(event: CdkDragDrop<any[]>) {
    if (!this.case.contents) return;
    if (event.previousContainer === event.container) {
      moveItemInArray(this.case.contents, event.previousIndex, event.currentIndex);
      if (this.selectedCaseIndex === event.previousIndex) {
        this.selectedCaseIndex = event.currentIndex;
      } else if (
        this.selectedCaseIndex !== null &&
        event.previousIndex < this.selectedCaseIndex &&
        event.currentIndex >= this.selectedCaseIndex
      ) {
        this.selectedCaseIndex--;
      } else if (
        this.selectedCaseIndex !== null &&
        event.previousIndex > this.selectedCaseIndex &&
        event.currentIndex <= this.selectedCaseIndex
      ) {
        this.selectedCaseIndex++;
      }
      this.saveCase();
    } else {
      const itemType = event.item.data;
      this.addBlock(itemType, event.currentIndex);
    }
  }
}
