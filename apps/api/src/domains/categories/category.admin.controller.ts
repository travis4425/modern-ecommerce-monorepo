import type { Request, Response } from 'express';
import { sendNoContent, sendSuccess } from '../../common/http/api-response';
import * as service from './category.admin.service';
import type { CreateCategoryInput } from './category.admin.service';

export async function list(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.listForAdmin());
}

export async function create(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.createCategory(req.body as CreateCategoryInput), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  sendSuccess(res, await service.updateCategory(id, req.body as Partial<CreateCategoryInput>));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.deleteCategory(id);
  sendNoContent(res);
}
