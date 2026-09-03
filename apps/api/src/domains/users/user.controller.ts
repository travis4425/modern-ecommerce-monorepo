import type { Request, Response } from 'express';
import { sendPaginated } from '../../common/http/api-response';
import { listUsers } from './user.service';
import type { ListUsersQuery } from './user.types';

export async function list(req: Request, res: Response): Promise<void> {
  const { items, meta } = await listUsers(req.query as unknown as ListUsersQuery);
  sendPaginated(res, items, meta);
}
