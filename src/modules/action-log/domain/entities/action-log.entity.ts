export interface ActionLogProps {
  id: number;
  userId: string | null;
  route: string;
  previousRoute: string | null;
  params: Record<string, unknown> | null;
  platform: string | null;
  osVersion: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export class ActionLog {
  readonly id: number;
  readonly userId: string | null;
  readonly route: string;
  readonly previousRoute: string | null;
  readonly params: Record<string, unknown> | null;
  readonly platform: string | null;
  readonly osVersion: string | null;
  readonly occurredAt: Date;
  readonly createdAt: Date;

  constructor(props: ActionLogProps) {
    Object.assign(this, props);
  }
}
