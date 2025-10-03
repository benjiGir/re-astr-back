import {Injectable} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class DatabaseConfigService {
  constructor(private readonly configService: ConfigService) {}

  get url(): string {
    return <string>this.configService.get('database.url');
  }

  get host(): string {
    return <string>this.configService.get('database.host');
  }

  get port(): number {
    return <number>this.configService.get('database.port');
  }

  get user(): string {
    return <string>this.configService.get('database.user');
  }

  get password(): string {
    return <string>this.configService.get('database.password');
  }

  get name(): string {
    return <string>this.configService.get('database.name');
  }

  get ssl(): boolean {
    return <boolean>this.configService.get('database.ssl');
  }
}