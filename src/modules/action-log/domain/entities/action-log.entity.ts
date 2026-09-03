export interface ActionLogProps {
  id: number;
  userId: string;
  route: string;
  previousRoute: string | null;
  params: Record<string, unknown> | null;
  platform: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export class ActionLog {
  readonly id: number;
  readonly userId: string;
  readonly route: string;
  readonly previousRoute: string | null;
  readonly params: Record<string, unknown> | null;
  readonly platform: string | null;
  readonly occurredAt: Date;
  readonly createdAt: Date;

  constructor(props: ActionLogProps) {
    Object.assign(this, props);
  }
}
