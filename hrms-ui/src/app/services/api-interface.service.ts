import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { SpinnerService } from './spinner.service';
import { environment } from '../../environment/environment';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  code?: string;
  errors?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private spinnerService: SpinnerService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('authToken');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
    return headers;
  }

  async get<T>(url: string, params?: any, spinner: boolean = true): Promise<T> {
    if (spinner) this.spinnerService.show();

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<T>>(environment.apiUrl + url, {
          headers: this.getHeaders(),
          params: params,
        })
      );

      // Check if response indicates success
      if (!response.success) {
        throw new Error(response.message || 'Request failed');
      }

      // Return data, throw error if null when not expected
      if (response.data === null) {
        throw new Error('No data returned from server');
      }

      return response.data;
    } catch (error) {
      throw error;
    } finally {
      if (spinner) this.spinnerService.hide();
    }
  }

  async post<T>(url: string, data: any, spinner: boolean = true): Promise<T> {
    if (spinner) this.spinnerService.show();

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<T>>(environment.apiUrl + url, data, {
          headers: this.getHeaders(),
        })
      );

      // Check if response indicates success
      if (!response.success) {
        throw new Error(response.message || 'Request failed');
      }

      // Return data, throw error if null when not expected
      if (response.data === null) {
        throw new Error('No data returned from server');
      }

      return response.data;
    } catch (error) {
      throw error;
    } finally {
      if (spinner) this.spinnerService.hide();
    }
  }

  async put<T>(url: string, data: any, spinner: boolean = true): Promise<T> {
    if (spinner) this.spinnerService.show();

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<T>>(environment.apiUrl + url, data, {
          headers: this.getHeaders(),
        })
      );

      // Check if response indicates success
      if (!response.success) {
        throw new Error(response.message || 'Request failed');
      }

      // Return data, throw error if null when not expected
      if (response.data === null) {
        throw new Error('No data returned from server');
      }

      return response.data;
    } catch (error) {
      throw error;
    } finally {
      if (spinner) this.spinnerService.hide();
    }
  }

  async patch<T>(url: string, data: any, spinner: boolean = true): Promise<T> {
    if (spinner) this.spinnerService.show();

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<T>>(environment.apiUrl + url, data, {
          headers: this.getHeaders(),
        })
      );

      // Check if response indicates success
      if (!response.success) {
        throw new Error(response.message || 'Request failed');
      }

      // Return data, throw error if null when not expected
      if (response.data === null) {
        throw new Error('No data returned from server');
      }

      return response.data;
    } catch (error) {
      throw error;
    } finally {
      if (spinner) this.spinnerService.hide();
    }
  }

  async delete<T>(url: string, spinner: boolean = true): Promise<T | null> {
    if (spinner) this.spinnerService.show();

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<T>>(environment.apiUrl + url, {
          headers: this.getHeaders(),
        })
      );
      return response.data || null;
    } catch (error) {
      throw error;
    } finally {
      if (spinner) this.spinnerService.hide();
    }
  }

  async downloadPayslip(payrollId: number): Promise<void> {
    try {
      const blob: any = await firstValueFrom(
        this.http.get(
          `${environment.apiUrl}/api/payroll/download/${payrollId}`,
          {
            headers: this.getHeaders(),
            responseType: 'blob', // <-- important
            observe: 'response', // optional if you want headers
          }
        )
      );

      // Optional: get filename from headers
      let filename = `payslip-${payrollId}.pdf`;
      const contentDisposition = blob.headers?.get('Content-Disposition');
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Trigger download
      const url = window.URL.createObjectURL(blob?.body);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    }
  }
}
