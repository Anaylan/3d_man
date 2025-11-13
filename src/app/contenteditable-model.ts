import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[contenteditableModel]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContenteditableDirective),
      multi: true,
    },
  ],
})
export class ContenteditableDirective {
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLElement>) {}

  writeValue(value: string): void {
    this.el.nativeElement.innerText = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.contentEditable = isDisabled ? 'false' : 'true';
  }

  @HostListener('input')
  onInput(): void {
    this.onChange(this.el.nativeElement.innerText);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }
}
