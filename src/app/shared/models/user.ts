export class User {
  id = 0;
  CompanyId = 0;
  GroupId = 0;
  Username = '';
  Name = '';
  Password = '';
  Params = '';

  static fromApi(data: unknown): User {
    const source = (data ?? {}) as Partial<User>;
    const user = new User();
    user.id = Number(source.id ?? 0);
    user.CompanyId = Number(source.CompanyId ?? 0);
    user.GroupId = Number(source.GroupId ?? 0);
    user.Username = String(source.Username ?? '');
    user.Name = String(source.Name ?? '');
    user.Password = String(source.Password ?? '');
    user.Params = String(source.Params ?? '');
    return user;
  }

  static fromApiList(data: unknown): User[] {
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(item => User.fromApi(item));
  }
}
