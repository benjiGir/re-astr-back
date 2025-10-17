import { PartialType } from '@nestjs/swagger'
import { CreateTestFileDto } from './create-test-file.dto'

export class UpdateTestFileDto extends PartialType(CreateTestFileDto) {}
