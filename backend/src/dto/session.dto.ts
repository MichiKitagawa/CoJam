import { IsString, IsBoolean, IsNumber, IsOptional, IsDateString, Min, Max, IsEnum } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  title: string = '';

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPaid: boolean = false;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(10)
  maxParticipants: number = 4;

  @IsBoolean()
  @IsOptional()
  isArchiveEnabled: boolean = true;

  @IsDateString()
  @IsOptional()
  scheduledStartAt?: string;
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  READY = 'ready',
  LIVE = 'live',
  ENDED = 'ended',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetSessionsQueryDto {
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  hostUserId?: string = '';

  @IsOptional()
  @IsString()
  search?: string = '';

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsString()
  sortBy?: string = 'scheduledStartAt';

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}

export class JoinSessionDto {
  @IsString()
  sessionId: string = '';

  @IsString()
  @IsOptional()
  joinToken?: string = '';

  @IsString()
  @IsEnum(['viewer', 'performer'])
  role: 'viewer' | 'performer' = 'viewer';
} 