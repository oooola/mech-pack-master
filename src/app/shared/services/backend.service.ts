import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginMasterParams } from '@shared/models/login-master-params';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BackendService {
  constructor(private http: HttpClient) {}

  //private baseUrl = 'https://vpsapi.mechapp.se:8081';
  private baseUrl = 'http://localhost:5286';
  

  public masterLogin(username: string, password: string): Promise<any> {
    const url = this.baseUrl + '/Public/LoginMaster/';

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const lp = new LoginMasterParams();
    lp.password = password;
    lp.userName = username;

    return this.http.post<any>(url, lp, { headers }).toPromise();
  }

  public masterLogin2(username: string, password: string): Promise<any> {
    const url = this.baseUrl + '/Public/LoginMaster/';

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const lp = new LoginMasterParams();
    lp.password = password;
    lp.userName = username;

    return firstValueFrom(this.http.post<any>(url, lp, { headers }));
  }

  public getStatUserTime(jwt: string): Promise<any> {
    const url = this.baseUrl + '/Master/GetStatsUserTime/';
    const token = jwt?.trim();
    if (!token) {
      return Promise.reject(new Error('JWT saknas för getStatUserTime'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    });

    // Endpointen kräver auth-header; skicka tom body och headers i options.
    return firstValueFrom(this.http.post<any>(url, {}, { headers }));
  }



}
