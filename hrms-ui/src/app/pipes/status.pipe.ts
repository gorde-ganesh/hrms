// src/app/pipes/capitalize.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { getSeverityClasses } from '../utils/table.utils';

@Pipe({
  name: 'status',
  standalone: true,
})
export class StatusPipe implements PipeTransform {
  transform(
    value: string
  ):
    | 'success'
    | 'secondary'
    | 'info'
    | 'warn'
    | 'danger'
    | 'contrast'
    | null
    | undefined {
    return getSeverityClasses(value);
  }
}
