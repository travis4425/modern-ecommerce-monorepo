import type { Request, Response } from 'express';
import { sendNoContent, sendSuccess } from '../../common/http/api-response';
import * as service from './product.admin.service';
import type { CreateProductInput } from './product.admin.service';

export async function create(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.createProduct(req.body as CreateProductInput), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  sendSuccess(res, await service.updateProduct(id, req.body as Partial<CreateProductInput>));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.deleteProduct(id);
  sendNoContent(res);
}
