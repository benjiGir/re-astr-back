import { AuthModule } from '@/auth/auth.module'
import { DatabaseModule } from '@database/database.module'
import { PROJECTS_REPOSITORY } from '@modules/projects/interfaces/projects-repository.interface'
import { ProjectsController } from '@modules/projects/projects.controller'
import { ProjectsDrizzleRepository } from '@modules/projects/repositories/projects-drizzle.repository'
import { ProjectsService } from '@modules/projects/services/projects.service'
import { Module } from '@nestjs/common'

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    {
      provide: PROJECTS_REPOSITORY,
      useClass: ProjectsDrizzleRepository,
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}