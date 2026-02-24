export class License {
  CompanyId = 0;
  Software = '';
  ShortCode = '';
  NumLicenses = 0;
  Demo = 0;
  ExpirationDate: Date = new Date();

  static fromApi(data: unknown): License {
    const source = (data ?? {}) as Partial<License>;
    const license = new License();
    license.CompanyId = Number(source.CompanyId ?? 0);
    license.Software = String(source.Software ?? '');
    license.ShortCode = String(source.ShortCode ?? '');
    license.NumLicenses = Number(source.NumLicenses ?? 0);
    license.Demo = Number(source.Demo ?? 0);
    license.ExpirationDate = source.ExpirationDate ? new Date(source.ExpirationDate as unknown as string) : new Date();
    return license;
  }

  static fromApiList(data: unknown): License[] {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(item => License.fromApi(item));
  }
}
