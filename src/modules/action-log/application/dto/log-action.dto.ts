export class LogActionDto {
  userId?: string;
  route?: string;
  previousRoute?: string;
  params?: Record<string, unknown>;
  platform?: string;
  occurredAt?: string;
}
