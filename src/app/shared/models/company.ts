import { Group } from './group';
import { License } from './license';

export class Company {
  Id = 0;
  Name = '';
  Password = '';
  Kundnr = '';
  Masterblock = false;
  classes: Group[] = [];
  licenses: License[] = [];

  static fromApi(data: unknown): Company {
    const source = (data ?? {}) as Partial<Company>;
    const company = new Company();
    company.Id = Number(source.Id ?? 0);
    company.Name = String(source.Name ?? '');
    company.Password = String(source.Password ?? '');
    company.Kundnr = String(source.Kundnr ?? '');
    company.Masterblock = Boolean(source.Masterblock);
    company.classes = Group.fromApiList(source.classes);
    company.licenses = License.fromApiList(source.licenses);
    return company;
  }
}
