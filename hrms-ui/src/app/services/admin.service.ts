import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment';

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount?: number;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

export interface GroupedPermissions {
  [resource: string]: Permission[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/api/roles`;
  private permUrl = `${environment.apiUrl}/api/permissions`;

  constructor(private http: HttpClient) {}

  // Roles
  getRoles(): Observable<Role[]> {
    return this.http
      .get<any>(this.apiUrl)
      .pipe(map((response) => response.data || response));
  }

  getRoleById(id: string): Observable<Role> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data || response));
  }

  createRole(role: {
    name: string;
    description?: string;
    permissionIds: string[];
  }): Observable<Role> {
    return this.http
      .post<any>(this.apiUrl, role)
      .pipe(map((response) => response.data || response));
  }

  updateRole(
    id: string,
    role: { name: string; description?: string; permissionIds: string[] }
  ): Observable<Role> {
    return this.http
      .put<any>(`${this.apiUrl}/${id}`, role)
      .pipe(map((response) => response.data || response));
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Permissions
  getPermissions(): Observable<{
    permissions: Permission[];
    groupedPermissions: GroupedPermissions;
  }> {
    return this.http
      .get<any>(this.permUrl)
      .pipe(map((response) => response.data || response));
  }

  // User Management
  getUsers(): Observable<any[]> {
    return this.http
      .get<any>(`${environment.apiUrl}/api/users`)
      .pipe(map((response) => response.data || response));
  }

  updateUserRole(userId: string, roleId: string): Observable<any> {
    return this.http
      .put<any>(`${environment.apiUrl}/api/users/${userId}`, {
        roleId,
      })
      .pipe(map((response) => response.data || response));
  }

  // Department Management
  getDepartments(params?: any): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/api/departments`, { params })
      .pipe(map((response) => response.data || response));
  }

  createDepartment(department: {
    name: string;
    description?: string;
  }): Observable<any> {
    return this.http
      .post<any>(`${environment.apiUrl}/api/departments`, department)
      .pipe(map((response) => response.data || response));
  }

  updateDepartment(
    id: string,
    department: { name: string; description?: string }
  ): Observable<any> {
    return this.http
      .put<any>(`${environment.apiUrl}/api/departments/${id}`, department)
      .pipe(map((response) => response.data || response));
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/api/departments/${id}`
    );
  }

  // Designation Management
  getDesignations(params?: any): Observable<any> {
    return this.http
      .get<any>(`${environment.apiUrl}/api/designations`, { params })
      .pipe(map((response) => response.data || response));
  }

  createDesignation(designation: {
    name: string;
    classification?: string;
    description?: string;
  }): Observable<any> {
    return this.http
      .post<any>(`${environment.apiUrl}/api/designations`, designation)
      .pipe(map((response) => response.data || response));
  }

  updateDesignation(
    id: string,
    designation: { name: string; classification?: string; description?: string }
  ): Observable<any> {
    return this.http
      .put<any>(`${environment.apiUrl}/api/designations/${id}`, designation)
      .pipe(map((response) => response.data || response));
  }

  deleteDesignation(id: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/api/designations/${id}`
    );
  }
}
