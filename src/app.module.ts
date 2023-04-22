import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ArchivesController } from './archives/archives.controller';
import { ArchivesService } from './archives/archives.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MongooseModule.forRoot('mongodb://localhost:27017/re-astr'),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, ArchivesController],
  providers: [AppService, ArchivesService],
})
export class AppModule {}
