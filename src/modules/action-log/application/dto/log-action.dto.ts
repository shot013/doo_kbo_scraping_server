export class LogActionDto {
  userId?: string;
  route?: string;
  previousRoute?: string;
  params?: Record<string, unknown>;
  platform?: string;
  osVersion?: string;
  occurredAt?: string;
}

export class LogActionsRequestDto {
  logs?: LogActionDto[];
}
