import { User } from './user';

export class Group {
  id = 0;
  CompanyId = 0;
  Name = '';
  Users: User[] = [];
  appFilter = '';

  static fromApi(data: unknown): Group {
    const source = (data ?? {}) as Partial<Group>;
    const group = new Group();
    group.id = Number(source.id ?? 0);
    group.CompanyId = Number(source.CompanyId ?? 0);
    group.Name = String(source.Name ?? '');
    group.Users = User.fromApiList(source.Users);
    group.appFilter = String(source.appFilter ?? '');
    return group;
  }

  static fromApiList(data: unknown): Group[] {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(item => Group.fromApi(item));
  }
}
