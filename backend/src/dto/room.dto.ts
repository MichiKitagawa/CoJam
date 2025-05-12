import { IsString, IsBoolean, IsNumber, IsOptional, IsDateString, Min, Max, IsEnum } from 'class-validator';

export class CreateRoomDto {
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

export enum RoomStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetRoomsQueryDto {
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

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

export class JoinRoomDto {
  @IsString()
  roomId: string = '';

  @IsString()
  @IsOptional()
  joinToken?: string = '';

  @IsString()
  @IsEnum(['viewer', 'performer'])
  role: 'viewer' | 'performer' = 'viewer';
} 